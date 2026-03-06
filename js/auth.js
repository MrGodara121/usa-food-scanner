// USA Food Scanner – Authentication Client

const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = window.APPWRITE_PROJECT_ID || '';

// Initialize Appwrite
const client = new Appwrite.Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

export const auth = {
    // Get current user
    async getCurrentUser() {
        try {
            const user = await account.get();
            return user;
        } catch (error) {
            return null;
        }
    },
    
    // Login with email/password
    async login(email, password) {
        try {
            await account.createEmailSession(email, password);
            const user = await account.get();
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Login with Google
    async loginWithGoogle() {
        try {
            account.createOAuth2Session('google', 
                `${window.location.origin}/dashboard`,
                `${window.location.origin}/login`
            );
        } catch (error) {
            console.error('Google login failed:', error);
        }
    },
    
    // Register new user
    async register(email, password, name) {
        try {
            await account.create('unique()', email, password, name);
            await account.createEmailSession(email, password);
            
            // Create user profile in database
            const user = await account.get();
            await databases.createDocument(
                'usa_food_scanner_db',
                'users',
                'unique()',
                {
                    userId: user.$id,
                    email,
                    name,
                    subscription_status: 'free',
                    scan_count: 0,
                    created_at: new Date().toISOString()
                }
            );
            
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    async logout() {
        try {
            await account.deleteSession('current');
            return true;
        } catch (error) {
            console.error('Logout failed:', error);
            return false;
        }
    },
    
    // Update user profile
    async updateProfile(userId, data) {
        try {
            const result = await databases.updateDocument(
                'usa_food_scanner_db',
                'users',
                userId,
                data
            );
            return { success: true, user: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Update subscription status
    async updateSubscription(userId, status, stripeCustomerId) {
        try {
            const result = await databases.updateDocument(
                'usa_food_scanner_db',
                'users',
                userId,
                {
                    subscription_status: status,
                    stripe_customer_id: stripeCustomerId,
                    updated_at: new Date().toISOString()
                }
            );
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Increment scan count
    async incrementScanCount(userId) {
        try {
            const user = await databases.getDocument(
                'usa_food_scanner_db',
                'users',
                userId
            );
            
            await databases.updateDocument(
                'usa_food_scanner_db',
                'users',
                userId,
                {
                    scan_count: (user.scan_count || 0) + 1,
                    last_scan: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('Failed to increment scan count:', error);
        }
    },
    
    // Get user profile
    async getUserProfile(userId) {
        try {
            const user = await databases.getDocument(
                'usa_food_scanner_db',
                'users',
                userId
            );
            return user;
        } catch (error) {
            return null;
        }
    },
    
    // Check if user is premium
    async isPremium(userId) {
        const user = await this.getUserProfile(userId);
        return user?.subscription_status !== 'free';
    },
    
    // Handle password reset
    async resetPassword(email) {
        try {
            await account.createRecovery(email, 
                `${window.location.origin}/reset-password`
            );
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Update password
    async updatePassword(userId, oldPassword, newPassword) {
        try {
            await account.updatePassword(newPassword, oldPassword);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Delete account
    async deleteAccount(userId) {
        try {
            // Delete user from database
            await databases.deleteDocument(
                'usa_food_scanner_db',
                'users',
                userId
            );
            
            // Delete from Appwrite auth
            await account.delete();
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
