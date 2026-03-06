// USA Food Scanner – Main Application Logic

// Global variables
let currentUser = null;
let siteConfig = null;
let currentRating = 0;

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
    
    // Initialize dark mode
    initDarkMode();
    
    // Check for notification permission
    checkNotificationPermission();
    
    console.log('✅ USA Food Scanner ready!');
});

// Load site config from API
async function loadSiteConfig() {
    try {
        siteConfig = await api.getConfig();
        if (siteConfig?.site_config?.site_title) {
            document.title = siteConfig.site_config.site_title;
        }
        
        // Set theme color
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor && siteConfig?.site_config?.theme_color) {
            themeColor.content = siteConfig.site_config.theme_color;
        }
    } catch (error) {
        console.error('Failed to load site config:', error);
    }
}

// Load header with navigation
async function loadHeader() {
    const header = document.getElementById('header');
    const mobileNav = document.getElementById('mobile-nav');
    const userMenu = document.getElementById('user-menu');
    const desktopNav = document.getElementById('desktop-nav');
    
    if (!header) return;
    
    // Get navigation from config
    const navItems = siteConfig?.navigation_menu || [];
    const mainNav = navItems.filter(item => item.parent_id === '0')
                           .sort((a, b) => a.order - b.order);
    
    // Desktop navigation
    if (desktopNav) {
        desktopNav.innerHTML = mainNav.map(item => 
            `<a href="${item.url}">${item.name}</a>`
        ).join('');
    }
    
    // Mobile navigation
    if (mobileNav) {
        mobileNav.innerHTML = mainNav.map(item => {
            const children = navItems.filter(child => child.parent_id === item.id)
                .map(child => `<a href="${child.url}" class="child-link">- ${child.name}</a>`)
                .join('');
            return `<a href="${item.url}">${item.name</a>${children}`;
        }).join('');
    }
    
    // User menu
    if (userMenu) {
        if (currentUser) {
            userMenu.innerHTML = `
                <div class="user-dropdown">
                    <span class="user-name">${currentUser.name || 'User'}</span>
                    <div class="dropdown-content">
                        <a href="/dashboard">Dashboard</a>
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
    
    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
        });
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
        </div>
    `;
}

// Check authentication
async function checkAuth() {
    try {
        currentUser = await auth.getCurrentUser();
        if (currentUser) {
            document.body.classList.add('logged-in');
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
        <div class="product-card">
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
                    <a href="/product/${product.barcode}" class="product-link">View →</a>
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
        await loadMicronutrients(product.barcode);
        
        // Load alternatives
        await loadAlternatives(product.barcode);
        
        // Load reviews
        await loadProductReviews(product.barcode);
        
        // Track scan
        api.trackScan(barcode);
    } catch (error) {
        console.error('Failed to load product:', error);
        window.location.href = '/404.html';
    }
}

// Load product details
async function loadProductDetails(product) {
    const header = document.getElementById('product-header');
    const ingredients = document.getElementById('ingredients-section');
    const premiumLock = document.getElementById('premium-lock');
    
    if (header) {
        const isPremium = currentUser?.subscription_status !== 'free';
        const scoreDeg = (product.health_score / 100) * 360;
        
        header.innerHTML = `
            <div class="product-image-large">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="product-info-large">
                <h1>${product.name}</h1>
                <p class="product-brand-large">by ${product.brand}</p>
                
                <div class="score-display">
                    <div class="score-circle-large" 
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
                
                <div class="product-actions">
                    ${isPremium && product.amazon_link ? `
                        <a href="${product.amazon_link}" class="btn-primary" target="_blank" rel="nofollow sponsored">
                            🛒 Amazon
                        </a>
                    ` : ''}
                    ${isPremium && product.walmart_link ? `
                        <a href="${product.walmart_link}" class="btn-primary" target="_blank" rel="nofollow sponsored">
                            🛒 Walmart
                        </a>
                    ` : ''}
                    <button class="btn-wishlist" onclick="toggleWishlist('${product.barcode}')">
                        ♥
                    </button>
                    <button class="btn-compare" onclick="addToCompare('${product.barcode}')">
                        ⇄ Compare
                    </button>
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
                ${ingredientsList.map(ing => {
                    let statusClass = '';
                    if (ing.is_healthy) statusClass = 'healthy';
                    else if (ing.is_harmful) statusClass = 'harmful';
                    else if (ing.is_warning) statusClass = 'warning';
                    
                    let badge = '';
                    if (ing.is_healthy) badge = '<span class="ingredient-badge healthy">Healthy</span>';
                    else if (ing.is_harmful) badge = '<span class="ingredient-badge harmful">Avoid</span>';
                    else if (ing.is_warning) badge = '<span class="ingredient-badge warning">Limit</span>';
                    
                    return `
                        <li class="ingredient-item ${statusClass}">
                            <span class="ingredient-icon">${ing.icon || '⚪'}</span>
                            <div class="ingredient-info">
                                <div class="ingredient-name">${ing.name}</div>
                                <div class="ingredient-desc">${ing.description || ''}</div>
                            </div>
                            ${badge}
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    }
    
    // Show premium lock for non-premium users
    if (premiumLock && currentUser?.subscription_status === 'free') {
        premiumLock.style.display = 'flex';
    }
}

// Load micronutrients
async function loadMicronutrients(barcode) {
    try {
        const nutrients = await api.getMicronutrients(barcode);
        
        // Vitamins
        const vitaminsGrid = document.getElementById('vitamins-grid');
        if (vitaminsGrid && nutrients.vitamins) {
            vitaminsGrid.innerHTML = Object.entries(nutrients.vitamins).map(([name, value]) => `
                <div class="nutrient-item">
                    <span class="nutrient-name">${name}</span>
                    <span class="nutrient-value">${value}</span>
                </div>
            `).join('');
        }
        
        // Minerals
        const mineralsGrid = document.getElementById('minerals-grid');
        if (mineralsGrid && nutrients.minerals) {
            mineralsGrid.innerHTML = Object.entries(nutrients.minerals).map(([name, value]) => `
                <div class="nutrient-item">
                    <span class="nutrient-name">${name}</span>
                    <span class="nutrient-value">${value}</span>
                </div>
            `).join('');
        }
        
        // Macros
        const macrosTable = document.getElementById('macros-table');
        if (macrosTable && nutrients.macros) {
            macrosTable.innerHTML = Object.entries(nutrients.macros).map(([name, value]) => `
                <div class="nutrition-row">
                    <span class="nutrition-label">${name}</span>
                    <span class="nutrition-value">${value}</span>
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
                    ${alternatives.map(alt => {
                        let scoreClass = 'medium';
                        if (alt.health_score >= 70) scoreClass = 'high';
                        else if (alt.health_score <= 39) scoreClass = 'low';
                        
                        return `
                            <div class="alternative-card" onclick="window.location.href='/product/${alt.barcode}'">
                                <div class="alternative-image">
                                    <img src="${alt.image_url}" alt="${alt.name}">
                                </div>
                                <div class="alternative-info">
                                    <div class="alternative-name">${alt.name}</div>
                                    <div class="alternative-brand">${alt.brand}</div>
                                    <span class="alternative-score ${scoreClass}">
                                        Score: ${alt.health_score}
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
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
        const container = document.getElementById('reviews-list');
        
        if (container) {
            if (reviews.length === 0) {
                container.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
            } else {
                container.innerHTML = reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="reviewer-name">${review.user_name}</span>
                            <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                        <p class="review-text">${review.comment}</p>
                        <div class="review-helpful">
                            <span>${review.helpful || 0} found this helpful</span>
                            <button class="btn-helpful" onclick="markHelpful('${review.id}')">👍 Helpful</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load reviews:', error);
    }
}

// Show tab
window.showTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
};

// Set rating
window.setRating = function(rating) {
    currentRating = rating;
    document.querySelectorAll('.rating-select .star').forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
};

// Submit review
window.submitReview = async function() {
    if (!currentUser) {
        alert('Please login to submit a review');
        window.location.href = '/login';
        return;
    }
    
    if (currentRating === 0) {
        alert('Please select a rating');
        return;
    }
    
    const comment = document.getElementById('review-text')?.value;
    if (!comment) {
        alert('Please write a review');
        return;
    }
    
    const barcode = window.location.pathname.split('/')[2];
    
    try {
        await api.submitReview(barcode, currentRating, comment);
        alert('Review submitted successfully!');
        location.reload();
    } catch (error) {
        alert('Failed to submit review. Please try again.');
    }
};

// Toggle wishlist
window.toggleWishlist = function(barcode) {
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const index = wishlist.indexOf(barcode);
    
    if (index === -1) {
        wishlist.push(barcode);
        alert('Added to wishlist');
    } else {
        wishlist.splice(index, 1);
        alert('Removed from wishlist');
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
};

// Add to compare
window.addToCompare = function(barcode) {
    let compare = JSON.parse(localStorage.getItem('compare') || '[]');
    
    if (compare.length >= 3) {
        alert('You can compare up to 3 products at a time');
        return;
    }
    
    if (!compare.includes(barcode)) {
        compare.push(barcode);
        alert('Added to comparison');
    } else {
        alert('Product already in comparison');
    }
    
    localStorage.setItem('compare', JSON.stringify(compare));
};

// Start scan
window.startScan = function() {
    if ('BarcodeDetector' in window) {
        // Use native barcode detector
        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']
        });
        
        // Request camera
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                // Video element would need to be created and shown
                // This is simplified; full implementation would need a video element
                alert('Camera access granted. Scanning...');
            })
            .catch(err => {
                console.error('Camera error:', err);
                alert('Camera access denied');
            });
    } else {
        // Fallback to search
        window.location.href = '/search';
    }
};

// Start AI scan
window.startAIScan = async function() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        // Create video element (would need to be added to DOM)
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });
        
        // Capture photo
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to blob
        const photoBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        
        // Send to API
        const formData = new FormData();
        formData.append('image', photoBlob);
        
        showToast('📸 Analyzing image...');
        
        const result = await api.scanImage(formData);
        
        if (result && result.product) {
            window.location.href = `/product/${result.product.barcode}`;
        } else {
            showToast('❌ Could not identify product. Try again.');
        }
        
    } catch (error) {
        console.error('AI scan error:', error);
        showToast('❌ Camera access denied or not available');
    }
};

// Start voice search
window.startVoiceSearch = function() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        showToast('🎤 Listening... Speak now');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = transcript;
            performSearch();
        } else {
            window.location.href = `/search?q=${encodeURIComponent(transcript)}`;
        }
    };
    
    recognition.onerror = (event) => {
        showToast('❌ Voice recognition failed. Try again.');
    };
    
    recognition.start();
};

// Show toast message
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary);
        color: white;
        padding: 10px 20px;
        border-radius: var(--radius-full);
        z-index: 2000;
        animation: fadeInOut ${duration}ms ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Logout
window.logout = async function() {
    await auth.logout();
    window.location.reload();
};

// Register service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.error('❌ Service Worker registration failed:', err));
    }
}

// Initialize search page
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchForm = document.getElementById('search-form');
    
    if (searchInput) {
        // Get query from URL
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');
        if (query) {
            searchInput.value = query;
            performSearch();
        }
        
        // Add input event for live search
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (searchInput.value.length >= 2) {
                    performSearch();
                }
            }, 500);
        });
    }
    
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            performSearch();
        });
    }
}

// Perform search
async function performSearch() {
    const query = document.getElementById('search-input')?.value;
    const typeElement = document.querySelector('input[name="type"]:checked');
    const type = typeElement ? typeElement.value : 'all';
    
    if (!query || query.length < 2) return;
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.set('type', type);
    window.history.pushState({}, '', url);
    
    try {
        const results = await api.searchProducts(query, { type });
        const resultsGrid = document.getElementById('results-grid');
        const resultsHeader = document.getElementById('results-header');
        
        if (resultsHeader) {
            resultsHeader.innerHTML = `<h2>Found ${results.length} results for "${query}"</h2>`;
        }
        
        if (resultsGrid) {
            if (results.length === 0) {
                resultsGrid.innerHTML = '<p class="no-results">No products found. Try a different search.</p>';
            } else {
                resultsGrid.innerHTML = results.map(result => {
                    if (result.type === 'product') {
                        return createProductCard(result);
                    }
                    return '';
                }).join('');
            }
        }
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Load premium page
async function loadPremiumPage() {
    const plans = siteConfig?.premium_plans || [];
    const plansGrid = document.getElementById('plans-grid');
    
    if (plansGrid) {
        plansGrid.innerHTML = plans.filter(p => p.name !== 'Free').map((plan, index) => {
            const features = JSON.parse(plan.features_json || '[]');
            const isPopular = plan.popular === 'true';
            
            return `
                <div class="plan-card ${isPopular ? 'popular' : ''}">
                    ${isPopular ? '<div class="popular-badge">Most Popular</div>' : ''}
                    <div class="plan-name">${plan.name}</div>
                    <div class="plan-price">
                        $${plan.price_monthly}<span>/month</span>
                    </div>
                    ${plan.price_yearly ? `<div class="plan-price-yearly">or $${plan.price_yearly}/year</div>` : ''}
                    <ul class="plan-features">
                        ${features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                    <button class="btn-primary btn-block" onclick="subscribe('${plan.plan_id}')">
                        ${currentUser ? 'Subscribe Now' : 'Login to Subscribe'}
                    </button>
                </div>
            `;
        }).join('');
    }
    
    // Load FAQ
    const faqContainer = document.getElementById('premium-faq');
    if (faqContainer && siteConfig?.faq) {
        const faqs = siteConfig.faq.filter(f => f.category === 'pricing');
        faqContainer.innerHTML = faqs.map(faq => `
            <div class="faq-item">
                <h3>${faq.question}</h3>
                <p>${faq.answer}</p>
            </div>
        `).join('');
    }
}

// Subscribe to plan
window.subscribe = async function(planId) {
    if (!currentUser) {
        window.location.href = '/login?redirect=/premium';
        return;
    }
    
    try {
        const session = await api.createCheckoutSession(planId);
        const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
        console.error('Subscription error:', error);
        alert('Failed to start subscription. Please try again.');
    }
};

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
    
    // Load adaptive calories
    await loadAdaptiveCalories();
    
    // Load coaching message
    await loadCoachingMessage();
    
    // Load recent scans
    const scans = await api.getUserScans(currentUser.$id);
    const scansList = document.getElementById('recent-scans');
    
    if (scansList) {
        if (scans.length === 0) {
            scansList.innerHTML = '<p class="empty">No scans yet. Start scanning!</p>';
        } else {
            scansList.innerHTML = scans.map(scan => `
                <div class="scan-item" onclick="window.location.href='/product/${scan.barcode}'">
                    <span class="scan-date">${new Date(scan.scan_date).toLocaleDateString()}</span>
                    <span class="scan-name">${scan.product_name}</span>
                    <span class="scan-score">${scan.health_score}</span>
                </div>
            `).join('');
        }
    }
    
    // Load shopping list
    loadShoppingList();
    
    // Show API section for business users
    if (currentUser.subscription_status === 'business') {
        document.getElementById('api-section').style.display = 'block';
        document.getElementById('api-key-display').textContent = currentUser.api_key || 'Loading...';
    }
}

// Load adaptive calories
async function loadAdaptiveCalories() {
    try {
        const data = await api.getAdaptiveCalories(currentUser.$id);
        document.getElementById('rec-calories').textContent = data.calories;
        
        // Load weight chart
        const weights = await api.getWeightLogs(currentUser.$id);
        if (weights.length > 0) {
            const ctx = document.getElementById('weight-chart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: weights.map(w => new Date(w.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Weight (kg)',
                        data: weights.map(w => w.weight),
                        borderColor: 'var(--primary)',
                        tension: 0.4
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
        console.error('Failed to load adaptive calories:', error);
    }
}

// Load coaching message
async function loadCoachingMessage() {
    try {
        const day = await api.getCoachingDay(currentUser.$id);
        document.getElementById('coaching-day').textContent = `Day ${day.day} of 30`;
        document.getElementById('coaching-title').textContent = day.title;
        document.getElementById('coaching-content').textContent = day.content;
        document.getElementById('coaching-tip').textContent = `💡 Tip: ${day.tip}`;
        document.getElementById('coaching-progress').style.width = `${(day.day / 30) * 100}%`;
    } catch (error) {
        console.error('Failed to load coaching:', error);
    }
}

// Log weight
window.logWeight = async function() {
    const weight = document.getElementById('weight-input')?.value;
    if (!weight || weight <= 0) {
        alert('Please enter a valid weight');
        return;
    }
    
    try {
        await api.logWeight(currentUser.$id, parseFloat(weight));
        alert('Weight logged successfully!');
        location.reload();
    } catch (error) {
        alert('Failed to log weight. Please try again.');
    }
};

// Mark coaching complete
window.markCoachingComplete = async function() {
    try {
        await api.markCoachingComplete(currentUser.$id);
        loadCoachingMessage();
    } catch (error) {
        console.error('Failed to mark coaching complete:', error);
    }
};

// Load shopping list
function loadShoppingList() {
    const list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    const container = document.getElementById('shopping-list');
    
    if (container) {
        if (list.length === 0) {
            container.innerHTML = '<p class="empty">Your shopping list is empty</p>';
        } else {
            container.innerHTML = list.map(item => `
                <div class="shopping-item">
                    <span class="shopping-name">${item.name}</span>
                    <span class="shopping-score">Score: ${item.health_score}</span>
                    <button class="shopping-remove" onclick="removeFromShoppingList('${item.barcode}')">✕</button>
                </div>
            `).join('');
        }
    }
}

// Add to shopping list
window.addToShoppingList = function(product) {
    let list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    
    // Check if already exists
    if (list.some(item => item.barcode === product.barcode)) {
        alert('Product already in shopping list');
        return;
    }
    
    list.push({
        barcode: product.barcode,
        name: product.name,
        health_score: product.health_score,
        added: Date.now()
    });
    
    localStorage.setItem('shoppingList', JSON.stringify(list));
    loadShoppingList();
    alert('Added to shopping list');
};

// Remove from shopping list
window.removeFromShoppingList = function(barcode) {
    let list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    list = list.filter(item => item.barcode !== barcode);
    localStorage.setItem('shoppingList', JSON.stringify(list));
    loadShoppingList();
};

// Clear shopping list
window.clearShoppingList = function() {
    if (confirm('Are you sure you want to clear your shopping list?')) {
        localStorage.removeItem('shoppingList');
        loadShoppingList();
    }
};

// Load more scans
window.loadMoreScans = async function() {
    // Implement pagination
};

// Copy API key
window.copyApiKey = function() {
    const apiKey = document.getElementById('api-key-display').textContent;
    navigator.clipboard.writeText(apiKey).then(() => {
        alert('API key copied to clipboard!');
    });
};

// Delete account
window.deleteAccount = function() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        // Implement account deletion
        alert('Account deletion requested. Please contact support.');
    }
};

// Enable notifications
window.enableNotifications = async function() {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        document.getElementById('notification-prompt').style.display = 'none';
        localStorage.setItem('notifications-enabled', 'true');
        showToast('✅ Notifications enabled!');
    }
};

// Close notification prompt
window.closePrompt = function() {
    document.getElementById('notification-prompt').style.display = 'none';
    localStorage.setItem('notifications-prompted', 'true');
};

// Check notification permission
function checkNotificationPermission() {
    if (!('Notification' in window)) return;
    
    const prompted = localStorage.getItem('notifications-prompted');
    const enabled = localStorage.getItem('notifications-enabled');
    
    if (!prompted && !enabled && Notification.permission === 'default') {
        setTimeout(() => {
            document.getElementById('notification-prompt').style.display = 'flex';
        }, 10000);
    }
}

// Initialize dark mode
function initDarkMode() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('dark-mode');
    
    if (savedMode === 'true' || (savedMode === null && prefersDark)) {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('dark-mode');
        if (toggle) toggle.checked = true;
    }
    
    // Listen for changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('dark-mode') === null) {
            if (e.matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    });
    
    // Add toggle listener
    const darkModeToggle = document.getElementById('dark-mode');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', e => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('dark-mode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('dark-mode', 'false');
            }
        });
    }
}
