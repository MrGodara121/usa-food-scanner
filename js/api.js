// USA Food Scanner – API Client

const API_BASE = window.API_BASE || 'https://usa-food-scanner-api.workers.dev';
const STRIPE_PUBLISHABLE_KEY = window.STRIPE_KEY || '';

export const api = {
    // Get site configuration
    async getConfig() {
        const response = await fetch(`${API_BASE}/api/config`);
        if (!response.ok) throw new Error('Failed to load config');
        return response.json();
    },
    
    // Get product by barcode
    async getProduct(barcode) {
        const response = await fetch(`${API_BASE}/api/product?barcode=${encodeURIComponent(barcode)}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to load product');
        }
        return response.json();
    },
    
    // Search products
    async searchProducts(query, options = {}) {
        const { type = 'all', limit = 20 } = options;
        const response = await fetch(
            `${API_BASE}/api/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
        );
        if (!response.ok) throw new Error('Search failed');
        return response.json();
    },
    
    // Get healthier alternatives
    async getAlternatives(barcode) {
        const response = await fetch(`${API_BASE}/api/alternatives?barcode=${encodeURIComponent(barcode)}`);
        if (!response.ok) return [];
        return response.json();
    },
    
    // Get micronutrients
    async getMicronutrients(barcode) {
        const response = await fetch(`${API_BASE}/api/micronutrients?barcode=${encodeURIComponent(barcode)}`);
        if (!response.ok) return {};
        return response.json();
    },
    
    // Track scan
    async trackScan(barcode) {
        try {
            await fetch(`${API_BASE}/api/track-scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode, timestamp: new Date().toISOString() })
            });
        } catch (error) {
            console.error('Failed to track scan:', error);
            // Store offline
            const scans = JSON.parse(localStorage.getItem('offlineScans') || '[]');
            scans.push({ barcode, timestamp: new Date().toISOString() });
            localStorage.setItem('offlineScans', JSON.stringify(scans));
        }
    },
    
    // Get current challenge
    async getCurrentChallenge() {
        try {
            const response = await fetch(`${API_BASE}/api/challenges/current`);
            if (!response.ok) return null;
            return response.json();
        } catch {
            return null;
        }
    },
    
    // Get user scans
    async getUserScans(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/user/${userId}/scans`);
            if (!response.ok) return [];
            return response.json();
        } catch {
            return [];
        }
    },
    
    // Submit review
    async submitReview(productBarcode, rating, comment) {
        const response = await fetch(`${API_BASE}/api/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                productBarcode, 
                rating, 
                comment,
                userId: currentUser?.$id,
                date: new Date().toISOString()
            })
        });
        if (!response.ok) throw new Error('Failed to submit review');
        return response.json();
    },
    
    // Get product reviews
    async getProductReviews(barcode) {
        try {
            const response = await fetch(`${API_BASE}/api/reviews?barcode=${encodeURIComponent(barcode)}`);
            if (!response.ok) return [];
            return response.json();
        } catch {
            return [];
        }
    },
    
    // Create checkout session
    async createCheckoutSession(planId) {
        const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, userId: currentUser?.$id })
        });
        if (!response.ok) throw new Error('Failed to create checkout session');
        return response.json();
    },
    
    // Scan image with AI
    async scanImage(formData) {
        const response = await fetch(`${API_BASE}/api/image-scan`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Image scan failed');
        return response.json();
    },
    
    // Get adaptive calories
    async getAdaptiveCalories(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/adaptive-calories?user_id=${userId}`);
            if (!response.ok) return { calories: 2000 };
            return response.json();
        } catch {
            return { calories: 2000 };
        }
    },
    
    // Log weight
    async logWeight(userId, weight) {
        const response = await fetch(`${API_BASE}/api/log-weight`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, weight, date: new Date().toISOString() })
        });
        if (!response.ok) throw new Error('Failed to log weight');
        return response.json();
    },
    
    // Get weight logs
    async getWeightLogs(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/weight-logs?user_id=${userId}`);
            if (!response.ok) return [];
            return response.json();
        } catch {
            return [];
        }
    },
    
    // Get coaching day
    async getCoachingDay(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/coaching-day?user_id=${userId}`);
            if (!response.ok) return { day: 1, title: 'Welcome!', content: '', tip: '' };
            return response.json();
        } catch {
            return { day: 1, title: 'Welcome!', content: '', tip: '' };
        }
    },
    
    // Mark coaching complete
    async markCoachingComplete(userId) {
        const response = await fetch(`${API_BASE}/api/coaching-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        if (!response.ok) throw new Error('Failed to mark coaching complete');
        return response.json();
    },
    
    // Generate API key
    async generateApiKey(userId, plan) {
        const response = await fetch(`${API_BASE}/api/generate-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, plan })
        });
        if (!response.ok) throw new Error('Failed to generate API key');
        return response.json();
    }
};
