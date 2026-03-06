// USA Food Scanner – API Client

const API_BASE = window.API_BASE || 'https://usa-food-scanner-api.workers.dev';

export const api = {
    // Get site configuration
    async getConfig() {
        try {
            const response = await fetch(`${API_BASE}/api/config`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Config API error:', error);
            return {
                site_config: { site_title: 'USA Food Scanner' },
                navigation_menu: [],
                footer_sections: [],
                footer_links: [],
                social_media: [],
                categories: [],
                premium_plans: [],
                faq: []
            };
        }
    },
    
    // Get product by barcode
    async getProduct(barcode) {
        try {
            const response = await fetch(`${API_BASE}/api/product?barcode=${encodeURIComponent(barcode)}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Product API error:', error);
            return null;
        }
    },
    
    // Search products
    async searchProducts(query, options = {}) {
        try {
            const { type = 'all', limit = 20 } = options;
            const response = await fetch(
                `${API_BASE}/api/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
            );
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Search API error:', error);
            return [];
        }
    },
    
    // Get healthier alternatives
    async getAlternatives(barcode) {
        try {
            const response = await fetch(`${API_BASE}/api/alternatives?barcode=${encodeURIComponent(barcode)}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Alternatives API error:', error);
            return [];
        }
    },
    
    // Get micronutrients
    async getMicronutrients(barcode) {
        try {
            const response = await fetch(`${API_BASE}/api/micronutrients?barcode=${encodeURIComponent(barcode)}`);
            if (!response.ok) return {};
            return await response.json();
        } catch (error) {
            console.error('Micronutrients API error:', error);
            return {};
        }
    },
    
    // Track scan
    async trackScan(barcode) {
        try {
            await fetch(`${API_BASE}/api/track-scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode })
            });
        } catch (error) {
            console.error('Track scan error:', error);
        }
    },
    
    // Get current challenge
    async getCurrentChallenge() {
        try {
            const response = await fetch(`${API_BASE}/api/challenges/current`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Challenge API error:', error);
            return null;
        }
    },
    
    // Get user scans
    async getUserScans(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/user/${userId}/scans`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('User scans API error:', error);
            return [];
        }
    },
    
    // Scan image with AI
    async scanImage(formData) {
        try {
            const response = await fetch(`${API_BASE}/api/image-scan`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('AI scan error:', error);
            return null;
        }
    },
    
    // Get adaptive calories
    async getAdaptiveCalories(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/adaptive-calories?user_id=${userId}`);
            if (!response.ok) return { calories: 2000 };
            return await response.json();
        } catch (error) {
            console.error('Adaptive API error:', error);
            return { calories: 2000 };
        }
    },
    
    // Log weight
    async logWeight(userId, weight) {
        try {
            await fetch(`${API_BASE}/api/log-weight`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, weight })
            });
        } catch (error) {
            console.error('Log weight error:', error);
        }
    },
    
    // Get coaching message
    async getCoachingMessage(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/coaching?user_id=${userId}`);
            if (!response.ok) {
                return {
                    title: 'Mindful Eating',
                    content: 'Learn to recognize true hunger vs emotional eating',
                    tip: 'Try eating without your phone today',
                    progress: 50
                };
            }
            return await response.json();
        } catch (error) {
            console.error('Coaching API error:', error);
            return {
                title: 'Mindful Eating',
                content: 'Learn to recognize true hunger vs emotional eating',
                tip: 'Try eating without your phone today',
                progress: 50
            };
        }
    },
    
    // Mark coaching complete
    async markCoachingComplete(userId) {
        try {
            await fetch(`${API_BASE}/api/coaching/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
        } catch (error) {
            console.error('Mark coaching error:', error);
        }
    },
    
    // Create checkout session
    async createCheckoutSession(planId) {
        try {
            const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });
            if (!response.ok) throw new Error('Checkout failed');
            return await response.json();
        } catch (error) {
            console.error('Checkout error:', error);
            throw error;
        }
    },
    
    // Save push subscription
    async savePushSubscription(subscription) {
        try {
            await fetch(`${API_BASE}/api/push-subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('Push subscription error:', error);
        }
    },
    
    // Get product reviews
    async getProductReviews(barcode) {
        try {
            const response = await fetch(`${API_BASE}/api/reviews?barcode=${encodeURIComponent(barcode)}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Reviews API error:', error);
            return [];
        }
    },
    
    // Submit review
    async submitReview(barcode, rating, comment) {
        try {
            const response = await fetch(`${API_BASE}/api/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode, rating, comment })
            });
            return response.ok;
        } catch (error) {
            console.error('Submit review error:', error);
            return false;
        }
    }
};
