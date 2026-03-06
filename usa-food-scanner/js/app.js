// USA Food Scanner – Main Application Logic

// Global variables
let currentUser = null;
let siteConfig = null;
let toastTimeout = null;
let scanHistory = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 USA Food Scanner initializing...');
    
    // Load site config
    await loadSiteConfig();
    
    // Load header and footer
    await loadHeader();
    await loadFooter();
    
    // Check authentication
    await checkAuth();
    
    // Load page-specific content
    await loadPageContent();
    
    // Initialize service worker for PWA
    registerServiceWorker();
    
    // Check for announcements
    await loadAnnouncements();
    
    // Check for notification permission
    checkNotificationPermission();
    
    // Load shopping list from localStorage
    loadShoppingListFromStorage();
    
    // Initialize dark mode
    initDarkMode();
    
    console.log('✅ USA Food Scanner ready!');
});

// Load site config from API
async function loadSiteConfig() {
    try {
        siteConfig = await api.getConfig();
        document.title = siteConfig.site_config?.site_title || 'USA Food Scanner';
        
        // Set theme color
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor && siteConfig.site_config?.theme_color) {
            themeColor.content = siteConfig.site_config.theme_color;
        }
    } catch (error) {
        console.error('Failed to load site config:', error);
        showToast('⚠️ Unable to load site configuration');
    }
}

// Load header with navigation
async function loadHeader() {
    const header = document.getElementById('header');
    const mobileNav = document.getElementById('mobile-nav');
    const userMenu = document.getElementById('user-menu');
    
    if (!header) return;
    
    // Get navigation from config
    const navItems = siteConfig?.navigation_menu || [];
    const mainNav = navItems.filter(item => item.parent_id === '0')
                           .sort((a, b) => a.order - b.order);
    
    // Desktop navigation
    const desktopNav = document.getElementById('desktop-nav');
    if (desktopNav) {
        desktopNav.innerHTML = mainNav.map(item => 
            `<a href="${item.url}">${item.name}</a>`
        ).join('');
    }
    
    // Mobile navigation
    if (mobileNav) {
        mobileNav.innerHTML = mainNav.map(item => 
            `<a href="${item.url}">${item.name}</a>
             ${navItems.filter(child => child.parent_id === item.id)
               .map(child => `<a href="${child.url}" class="child-link">- ${child.name}</a>`)
               .join('')}`
        ).join('');
    }
    
    // User menu
    updateUserMenu();
    
    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && mobileNav.classList.contains('active')) {
                mobileNav.classList.remove('active');
                menuBtn.classList.remove('active');
            }
        });
    }
}

// Update user menu based on login status
function updateUserMenu() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;
    
    if (currentUser) {
        userMenu.innerHTML = `
            <div class="user-dropdown">
                <span class="user-name">${currentUser.name || 'User'}</span>
                <div class="dropdown-content">
                    <a href="/dashboard">Dashboard</a>
                    <a href="/profile">Profile</a>
                    <a href="/settings">Settings</a>
                    <a href="#" onclick="logout()">Logout</a>
                </div>
            </div>
        `;
    } else {
        userMenu.innerHTML = `
            <a href="/login" class="btn-secondary btn-small">Login</a>
        `;
    }
}

// Load footer
async function loadFooter() {
    const footer = document.getElementById('footer');
    if (!footer || !siteConfig) return;
    
    const sections = siteConfig.footer_sections || [];
    const links = siteConfig.footer_links || [];
    const social = siteConfig.social_media || [];
    
    footer.innerHTML = `
        <div class="footer-grid">
            ${sections.map(section => `
                <div class="footer-col">
                    <h4>${section.section_title}</h4>
                    <ul>
                        ${links.filter(l => l.section_id === section.section_id)
                              .map(link => `<li><a href="${link.url}">${link.link_name}</a></li>`)
                              .join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
        <div class="social-links">
            ${social.map(s => `
                <a href="${s.url}" target="_blank" rel="noopener">
                    <img src="${s.icon_url}" alt="${s.platform}" width="24" height="24">
                </a>
            `).join('')}
        </div>
        <div class="footer-bottom">
            <p>© ${new Date().getFullYear()} USA Food Scanner. All rights reserved.</p>
            <p>Based on FDA & USDA data</p>
        </div>
    `;
}

// Check authentication
async function checkAuth() {
    try {
        currentUser = await auth.getCurrentUser();
        if (currentUser) {
            document.body.classList.add('logged-in');
            updateUserMenu();
        }
    } catch (error) {
        console.log('Not logged in');
    }
}

// Load page-specific content based on URL
async function loadPageContent() {
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index.html') {
        await loadHomePage();
    } else if (path.startsWith('/product/')) {
        const barcode = path.split('/')[2];
        await loadProductPage(barcode);
    } else if (path.startsWith('/category/')) {
        const slug = path.split('/')[2];
        await loadCategoryPage(slug);
    } else if (path === '/search') {
        initSearch();
    } else if (path === '/premium') {
        await loadPremiumPage();
    } else if (path === '/dashboard') {
        await loadDashboard();
    } else if (path === '/login' || path === '/signup') {
        // Already on auth page
    }
}

// Load home page
async function loadHomePage() {
    // Load categories
    const categories = siteConfig?.categories?.filter(c => c.parent_id === '0') || [];
    const categoriesGrid = document.getElementById('categories-grid');
    
    if (categoriesGrid) {
        categoriesGrid.innerHTML = categories.slice(0, 6).map(cat => `
            <div class="category-card" onclick="window.location.href='/category/${cat.slug}'">
                <img src="${cat.image_url}" alt="${cat.name}" loading="lazy">
                <h3>${cat.name}</h3>
            </div>
        `).join('');
    }
    
    // Load trending products
    await loadTrendingProducts();
    
    // Load weekly challenge
    await loadWeeklyChallenge();
}

// Load trending products
async function loadTrendingProducts() {
    try {
        const products = await api.searchProducts('', { limit: 8 });
        const container = document.getElementById('trending-products');
        
        if (container) {
            container.innerHTML = products.map(product => createProductCard(product)).join('');
        }
    } catch (error) {
        console.error('Failed to load trending products:', error);
    }
}

// Create product card HTML
function createProductCard(product) {
    return `
        <div class="product-card" onclick="window.location.href='/product/${product.barcode}'">
            <div class="product-image">
                <img src="${product.image_url}" alt="${product.name}" loading="lazy">
                <span class="product-badge ${product.grade}">${product.grade}</span>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-brand">${product.brand}</p>
                <div class="product-meta">
                    <span class="product-score">
                        <span class="score-value">${product.health_score}</span>/100
                    </span>
                    <span class="product-link">View →</span>
                </div>
            </div>
        </div>
    `;
}

// Load weekly challenge
async function loadWeeklyChallenge() {
    try {
        const challenge = await api.getCurrentChallenge();
        const section = document.getElementById('challenge-section');
        const card = document.getElementById('challenge-card');
        
        if (challenge && section && card) {
            section.style.display = 'block';
            card.innerHTML = `
                <h3>${challenge.title}</h3>
                <p>${challenge.description}</p>
                <div class="challenge-progress">
                    <div class="challenge-progress-bar" style="width: ${challenge.progress}%"></div>
                </div>
                <p>${challenge.progress}% completed</p>
            `;
        }
    } catch (error) {
        console.error('Failed to load challenge:', error);
    }
}

// Load announcements
async function loadAnnouncements() {
    try {
        const announcements = siteConfig?.announcements || [];
        const banner = document.getElementById('announcement-banner');
        
        if (announcements.length > 0 && banner) {
            const active = announcements.find(a => a.enabled === 'true');
            if (active) {
                banner.style.display = 'block';
                banner.innerHTML = `
                    ${active.message}
                    ${active.link ? `<a href="${active.link}">${active.link_text}</a>` : ''}
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load announcements:', error);
    }
}

// Load product page
async function loadProductPage(barcode) {
    try {
        const product = await api.getProduct(barcode);
        if (!product) {
            window.location.href = '/404.html';
            return;
        }
        
        // Update meta tags
        document.title = `${product.name} - Health Score ${product.health_score} | USA Food Scanner`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = `Check ${product.name} health score, ingredients, and nutrition facts. Grade ${product.grade} based on FDA & USDA data.`;
        }
        
        // Load product details
        await loadProductDetails(product);
        
        // Load micronutrients
        await loadMicronutrients(barcode);
        
        // Load alternatives
        await loadAlternatives(product.barcode);
        
        // Load reviews
        await loadProductReviews(product.barcode);
        
        // Track scan
        api.trackScan(barcode);
        
        // Save to history
        saveScanToHistory(product);
    } catch (error) {
        console.error('Failed to load product:', error);
        window.location.href = '/404.html';
    }
}

// Load product details
async function loadProductDetails(product) {
    const header = document.getElementById('product-header');
    const ingredients = document.getElementById('ingredients-section');
    const macros = document.getElementById('macros-section');
    const premiumLock = document.getElementById('premium-lock');
    const breadcrumbs = document.getElementById('breadcrumbs');
    
    if (breadcrumbs) {
        breadcrumbs.innerHTML = `
            <ol>
                <li><a href="/">Home</a></li>
                <li><a href="/category/${product.category_slug}">${product.category_name}</a></li>
                <li>${product.name}</li>
            </ol>
        `;
    }
    
    if (header) {
        const isPremium = currentUser?.subscription_status !== 'free';
        const scoreDeg = (product.health_score / 100) * 360;
        
        header.innerHTML = `
            <div class="product-image-large">
                <img src="${product.image_url}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-info-large">
                <h1>${product.name}</h1>
                <p class="product-brand-large">by ${product.brand}</p>
                
                <div class="score-display">
                    <div class="score-circle-large score-circle" 
                         style="background: conic-gradient(var(--primary) 0deg ${scoreDeg}deg, #eee ${scoreDeg}deg 360deg)"
                         data-score="${product.health_score}">
                    </div>
                    <div class="score-details">
                        <div class="score-grade">Grade ${product.grade}</div>
                        <div class="score-label">Health Score</div>
                        <div class="score-bar">
                            <div class="score-bar-fill" style="width: ${product.health_score}%"></div>
                        </div>
                        <div class="score-text">${product.health_score} out of 100</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Load ingredients (always visible)
    if (ingredients) {
        const ingredientsList = product.ingredients || [];
        ingredients.innerHTML = `
            <h2>Ingredients</h2>
            <ul class="ingredients-list">
                ${ingredientsList.map(ing => `
                    <li class="ingredient-item ${ing.is_healthy ? 'healthy' : ing.is_harmful ? 'harmful' : ''}">
                        <span class="ingredient-icon">${ing.is_healthy ? '✅' : ing.is_harmful ? '⚠️' : '⚪'}</span>
                        <div class="ingredient-info">
                            <div class="ingredient-name">${ing.name}</div>
                            <div class="ingredient-desc">${ing.description || ''}</div>
                        </div>
                        ${ing.is_healthy ? '<span class="ingredient-badge healthy">Healthy</span>' : ''}
                        ${ing.is_harmful ? '<span class="ingredient-badge harmful">Avoid</span>' : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    // Load macros
    if (macros && product.macros) {
        macros.innerHTML = `
            <h2>Macronutrients</h2>
            <div class="macros-grid">
                <div class="macro-item">
                    <span class="macro-label">Calories</span>
                    <span class="macro-value">${product.macros.calories}</span>
                </div>
                <div class="macro-item">
                    <span class="macro-label">Protein</span>
                    <span class="macro-value">${product.macros.protein}g</span>
                </div>
                <div class="macro-item">
                    <span class="macro-label">Carbs</span>
                    <span class="macro-value">${product.macros.carbs}g</span>
                </div>
                <div class="macro-item">
                    <span class="macro-label">Fat</span>
                    <span class="macro-value">${product.macros.fat}g</span>
                </div>
            </div>
        `;
    }
    
    // Show premium lock for non-premium users
    if (premiumLock && currentUser?.subscription_status === 'free') {
        premiumLock.style.display = 'flex';
    }
}

// Load micronutrients
async function loadMicronutrients(barcode) {
    if (currentUser?.subscription_status === 'free') return;
    
    try {
        const nutrients = await api.getMicronutrients(barcode);
        const vitaminsGrid = document.getElementById('vitamins-grid');
        const mineralsGrid = document.getElementById('minerals-grid');
        
        if (vitaminsGrid && nutrients.vitamins) {
            vitaminsGrid.innerHTML = Object.entries(nutrients.vitamins).map(([key, value]) => `
                <div class="nutrient-item">
                    <span class="nutrient-name">${key.replace(/_/g, ' ')}</span>
                    <span class="nutrient-value">${value}</span>
                </div>
            `).join('');
        }
        
        if (mineralsGrid && nutrients.minerals) {
            mineralsGrid.innerHTML = Object.entries(nutrients.minerals).map(([key, value]) => `
                <div class="nutrient-item">
                    <span class="nutrient-name">${key.replace(/_/g, ' ')}</span>
                    <span class="nutrient-value">${value}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load micronutrients:', error);
    }
}

// Load alternatives
async function loadAlternatives(barcode) {
    try {
        const alternatives = await api.getAlternatives(barcode);
        const container = document.getElementById('alternatives-section');
        
        if (container && alternatives.length > 0) {
            container.innerHTML = `
                <h2>✨ Healthier Alternatives</h2>
                <div class="alternatives-grid">
                    ${alternatives.map(alt => `
                        <div class="alternative-card" onclick="window.location.href='/product/${alt.barcode}'">
                            <div class="alternative-image">
                                <img src="${alt.image_url}" alt="${alt.name}" loading="lazy">
                            </div>
                            <div class="alternative-info">
                                <div class="alternative-name">${alt.name}</div>
                                <div class="alternative-brand">${alt.brand}</div>
                                <span class="alternative-score ${alt.health_score >= 70 ? 'high' : alt.health_score >= 40 ? 'medium' : 'low'}">
                                    Score: ${alt.health_score}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load alternatives:', error);
    }
}

// Load product reviews
async function loadProductReviews(barcode) {
    try {
        const reviews = await api.getProductReviews(barcode);
        const container = document.getElementById('reviews-section');
        
        if (container && reviews.length > 0) {
            container.innerHTML = `
                <h2>Customer Reviews</h2>
                ${reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="reviewer-name">${review.user_name}</span>
                            <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                        <p class="review-text">${review.comment}</p>
                        <div class="review-helpful">
                            <button class="btn-helpful" onclick="markHelpful('${review.id}')">
                                👍 Helpful (${review.helpful})
                            </button>
                        </div>
                    </div>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Failed to load reviews:', error);
    }
}

// Start barcode scan
function startScan() {
    if ('BarcodeDetector' in window) {
        // Use native barcode detector
        const barcodeDetector = new BarcodeDetector();
        // Simplified for demo – in production you'd need proper camera handling
        showToast('📸 Please point your camera at a barcode');
    } else {
        // Fallback to search
        window.location.href = '/search';
    }
}

// Start AI photo scan
async function startAIScan() {
    try {
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        // Show camera preview (simplified – in production you'd need a proper camera UI)
        showToast('📸 Taking photo...');
        
        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        
        // Wait a moment for camera to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        
        // Create form data
        const formData = new FormData();
        formData.append('image', blob, 'scan.jpg');
        
        showToast('🤖 AI analyzing image...');
        
        // Send to API
        const result = await api.scanImage(formData);
        
        if (result.product && result.product.barcode) {
            window.location.href = `/product/${result.product.barcode}`;
        } else {
            showToast('❌ No product recognized. Try again.');
        }
    } catch (error) {
        console.error('AI scan failed:', error);
        showToast('❌ Camera access denied or failed');
    }
}

// Start voice search
function startVoiceSearch() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    const voiceStatus = document.getElementById('voice-status');
    if (voiceStatus) {
        voiceStatus.style.display = 'block';
    }
    
    recognition.onstart = () => {
        showToast('🎤 Listening... Speak now');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (voiceStatus) {
            voiceStatus.style.display = 'none';
        }
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = transcript;
            performSearch();
        } else {
            window.location.href = `/search?q=${encodeURIComponent(transcript)}`;
        }
    };
    
    recognition.onerror = (event) => {
        if (voiceStatus) {
            voiceStatus.style.display = 'none';
        }
        showToast('❌ Voice recognition failed. Try again.');
    };
    
    recognition.onend = () => {
        if (voiceStatus) {
            voiceStatus.style.display = 'none';
        }
    };
    
    recognition.start();
}

// Perform search
async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput?.value;
    const type = document.querySelector('input[name="type"]:checked')?.value || 'all';
    
    if (!query) return;
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.set('type', type);
    window.history.pushState({}, '', url);
    
    try {
        showToast('🔍 Searching...');
        const results = await api.searchProducts(query, { type });
        const resultsGrid = document.getElementById('results-grid');
        const resultsHeader = document.getElementById('results-header');
        
        if (resultsHeader) {
            resultsHeader.innerHTML = `<h2>Found ${results.length} results for "${query}"</h2>`;
        }
        
        if (resultsGrid) {
            if (results.length === 0) {
                resultsGrid.innerHTML = '<p class="empty">No results found</p>';
            } else {
                resultsGrid.innerHTML = results.map(result => {
                    if (result.type === 'product') {
                        return createProductCard(result);
                    }
                    return '';
                }).join('');
            }
        }
        
        showToast(`✅ Found ${results.length} results`);
    } catch (error) {
        console.error('Search failed:', error);
        showToast('❌ Search failed');
    }
}

// Load premium page
async function loadPremiumPage() {
    const plans = siteConfig?.premium_plans || [];
    const plansGrid = document.getElementById('plans-grid');
    const faqGrid = document.getElementById('premium-faq');
    const faq = siteConfig?.faq || [];
    
    if (plansGrid) {
        plansGrid.innerHTML = plans.filter(p => p.name !== 'Free').map((plan, index) => `
            <div class="plan-card ${index === 1 ? 'popular' : ''}">
                ${index === 1 ? '<div class="popular-badge">Most Popular</div>' : ''}
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">
                    $${plan.price_monthly}<span>/month</span>
                </div>
                <ul class="plan-features">
                    ${JSON.parse(plan.features_json || '[]').map(f => `<li>${f}</li>`).join('')}
                </ul>
                <button class="btn-primary btn-block" onclick="subscribe('${plan.plan_id}')">
                    ${currentUser ? 'Subscribe Now' : 'Login to Subscribe'}
                </button>
            </div>
        `).join('');
    }
    
    if (faqGrid) {
        faqGrid.innerHTML = faq.filter(f => f.category === 'pricing').map(item => `
            <div class="faq-item">
                <div class="faq-question">${item.question}</div>
                <div class="faq-answer">${item.answer}</div>
            </div>
        `).join('');
    }
}

// Load dashboard
async function loadDashboard() {
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }
    
    // Load user stats
    document.getElementById('total-scans').textContent = currentUser.scan_count || 0;
    document.getElementById('avg-score').textContent = currentUser.avg_score || '-';
    document.getElementById('member-since').textContent = new Date(currentUser.$createdAt).toLocaleDateString();
    document.getElementById('plan').textContent = currentUser.subscription_status || 'Free';
    
    // Show API section for business users
    if (currentUser.subscription_status === 'business') {
        document.getElementById('api-section').style.display = 'block';
        document.getElementById('api-key-display').textContent = currentUser.api_key || 'fsc_xxxxx';
        document.getElementById('api-calls-used').textContent = currentUser.api_calls_used || 0;
        document.getElementById('api-calls-limit').textContent = currentUser.api_calls_limit || 1000000;
    }
    
    // Load recent scans
    const scans = await api.getUserScans(currentUser.$id);
    const scansList = document.getElementById('recent-scans');
    
    if (scansList) {
        if (scans.length === 0) {
            scansList.innerHTML = '<p class="empty">No scans yet</p>';
        } else {
            scansList.innerHTML = scans.slice(0, 10).map(scan => `
                <div class="scan-item" onclick="window.location.href='/product/${scan.barcode}'">
                    <span class="scan-date">${new Date(scan.scan_date).toLocaleDateString()}</span>
                    <span class="scan-name">${scan.product_name}</span>
                    <span class="scan-score">${scan.health_score}</span>
                </div>
            `).join('');
        }
    }
    
    // Load adaptive algorithm data
    await loadAdaptiveData();
    
    // Load coaching data
    await loadCoachingData();
    
    // Load shopping list
    renderShoppingList();
}

// Load adaptive algorithm data
async function loadAdaptiveData() {
    try {
        const data = await api.getAdaptiveCalories(currentUser.$id);
        document.getElementById('rec-calories').textContent = data.calories;
        
        // Initialize weight chart if exists
        const ctx = document.getElementById('weight-chart')?.getContext('2d');
        if (ctx) {
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels || ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Weight (lbs)',
                        data: data.weights || [180, 178, 177, 175],
                        borderColor: '#4CAF50',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Failed to load adaptive data:', error);
    }
}

// Load coaching data
async function loadCoachingData() {
    try {
        const coaching = await api.getCoachingMessage(currentUser.$id);
        document.getElementById('coaching-title').textContent = coaching.title;
        document.getElementById('coaching-content').textContent = coaching.content;
        document.getElementById('coaching-tip').innerHTML = `💡 Tip: ${coaching.tip}`;
        document.getElementById('coaching-progress').style.width = `${coaching.progress}%`;
    } catch (error) {
        console.error('Failed to load coaching data:', error);
    }
}

// Log weight
async function logWeight() {
    const input = document.getElementById('weight-input');
    const weight = parseFloat(input.value);
    
    if (isNaN(weight) || weight <= 0) {
        showToast('❌ Please enter a valid weight');
        return;
    }
    
    try {
        await api.logWeight(currentUser.$id, weight);
        input.value = '';
        showToast('✅ Weight logged successfully');
        await loadAdaptiveData();
    } catch (error) {
        console.error('Failed to log weight:', error);
        showToast('❌ Failed to log weight');
    }
}

// Mark coaching as complete
async function markCoachingComplete() {
    try {
        await api.markCoachingComplete(currentUser.$id);
        showToast('✅ Great job! Day completed');
        await loadCoachingData();
    } catch (error) {
        console.error('Failed to mark coaching complete:', error);
    }
}

// Subscribe to plan
async function subscribe(planId) {
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const session = await api.createCheckoutSession(planId);
        const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY);
        await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
        console.error('Subscription failed:', error);
        showToast('❌ Subscription failed');
    }
}

// Logout
async function logout() {
    await auth.logout();
    currentUser = null;
    window.location.reload();
}

// Register service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.error('❌ Service Worker registration failed:', err));
    }
}

// Check notification permission
function checkNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        document.getElementById('notification-prompt').style.display = 'block';
    }
}

// Enable notifications
async function enableNotifications() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('✅ Notifications enabled');
            document.getElementById('notification-prompt').style.display = 'none';
            
            // Subscribe to push notifications
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY)
            });
            
            // Send subscription to server
            await api.savePushSubscription(subscription);
        }
    } catch (error) {
        console.error('Failed to enable notifications:', error);
    }
}

// Close notification prompt
function closeNotificationPrompt() {
    document.getElementById('notification-prompt').style.display = 'none';
}

// Show toast message
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Save scan to history
function saveScanToHistory(product) {
    const history = JSON.parse(localStorage.getItem('scanHistory') || '[]');
    history.unshift({
        barcode: product.barcode,
        name: product.name,
        health_score: product.health_score,
        timestamp: Date.now()
    });
    
    // Keep only last 100 scans
    if (history.length > 100) history.pop();
    
    localStorage.setItem('scanHistory', JSON.stringify(history));
}

// Load shopping list from localStorage
function loadShoppingListFromStorage() {
    const list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    scanHistory = list;
    renderShoppingList();
}

// Render shopping list
function renderShoppingList() {
    const container = document.getElementById('shopping-list');
    if (!container) return;
    
    if (scanHistory.length === 0) {
        container.innerHTML = '<p class="empty">Your shopping list is empty</p>';
    } else {
        container.innerHTML = scanHistory.map(item => `
            <div class="shopping-item">
                <span>${item.name}</span>
                <span class="shopping-score">Score: ${item.health_score}</span>
                <button onclick="removeFromShoppingList('${item.barcode}')">✕</button>
            </div>
        `).join('');
    }
}

// Add to shopping list
function addToShoppingList(product) {
    const list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    
    // Check if already exists
    if (!list.some(item => item.barcode === product.barcode)) {
        list.push({
            barcode: product.barcode,
            name: product.name,
            health_score: product.health_score
        });
        localStorage.setItem('shoppingList', JSON.stringify(list));
        renderShoppingList();
        showToast('✅ Added to shopping list');
    } else {
        showToast('ℹ️ Already in shopping list');
    }
}

// Remove from shopping list
function removeFromShoppingList(barcode) {
    let list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    list = list.filter(item => item.barcode !== barcode);
    localStorage.setItem('shoppingList', JSON.stringify(list));
    renderShoppingList();
    showToast('✅ Removed from shopping list');
}

// Clear shopping list
function clearShoppingList() {
    localStorage.removeItem('shoppingList');
    renderShoppingList();
    showToast('✅ Shopping list cleared');
}

// Toggle wishlist
function toggleWishlist() {
    const btn = document.querySelector('.btn-wishlist');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        btn.innerHTML = '♥ Added to Wishlist';
    } else {
        btn.innerHTML = '♥ Add to Wishlist';
    }
}

// Add to compare
function addToCompare() {
    showToast('✅ Added to compare (coming soon)');
}

// Share product
function shareProduct() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('✅ Link copied to clipboard');
    }
}

// Switch tabs on product page
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

// Switch auth tabs
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('signup-form').classList.add('active');
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const result = await auth.login(email, password);
    if (result.success) {
        window.location.href = '/dashboard';
    } else {
        showToast('❌ ' + (result.error || 'Login failed'));
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    
    if (password !== confirm) {
        showToast('❌ Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        showToast('❌ Password must be at least 8 characters');
        return;
    }
    
    const result = await auth.register(email, password, name);
    if (result.success) {
        window.location.href = '/dashboard';
    } else {
        showToast('❌ ' + (result.error || 'Registration failed'));
    }
}

// Login with Google
function loginWithGoogle() {
    auth.loginWithGoogle();
}

// Copy API key
function copyApiKey() {
    const key = document.getElementById('api-key-display').textContent;
    navigator.clipboard.writeText(key);
    showToast('✅ API key copied');
}

// Delete account
async function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
            await auth.deleteAccount();
            window.location.href = '/';
        } catch (error) {
            showToast('❌ Failed to delete account');
        }
    }
}

// Initialize dark mode
function initDarkMode() {
    const darkModeCheckbox = document.getElementById('dark-mode');
    if (!darkModeCheckbox) return;
    
    // Check local storage
    const isDark = localStorage.getItem('darkMode') === 'true';
    darkModeCheckbox.checked = isDark;
    if (isDark) {
        document.documentElement.classList.add('dark');
    }
    
    darkModeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    });
}

// Buy API plan
function buyPlan(plan) {
    if (plan === 'enterprise') {
        window.location.href = '/contact';
    } else {
        window.location.href = `/premium?plan=${plan}`;
    }
}

// Load more scans
async function loadMoreScans() {
    // Implement pagination if needed
    showToast('📱 Loading more...');
}

// Helper: URL base64 to Uint8Array (for VAPID)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Make functions available globally
window.startScan = startScan;
window.startAIScan = startAIScan;
window.startVoiceSearch = startVoiceSearch;
window.performSearch = performSearch;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.subscribe = subscribe;
window.toggleWishlist = toggleWishlist;
window.addToCompare = addToCompare;
window.shareProduct = shareProduct;
window.switchTab = switchTab;
window.enableNotifications = enableNotifications;
window.closeNotificationPrompt = closeNotificationPrompt;
window.logWeight = logWeight;
window.markCoachingComplete = markCoachingComplete;
window.copyApiKey = copyApiKey;
window.deleteAccount = deleteAccount;
window.clearShoppingList = clearShoppingList;
window.removeFromShoppingList = removeFromShoppingList;
window.addToShoppingList = addToShoppingList;
window.buyPlan = buyPlan;
window.loadMoreScans = loadMoreScans;
