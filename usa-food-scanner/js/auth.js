// USA Food Scanner – Authentication Client

// Initialize Appwrite
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = window.APPWRITE_PROJECT_ID || '';

const { Client, Account } = window.Appwrite;

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);

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
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Login with Google
    loginWithGoogle() {
        account.createOAuth2Session(
            'google',
            `${window.location.origin}/dashboard`,
            `${window.location.origin}/login`
        );
    },
    
    // Register new user
    async register(email, password, name) {
        try {
            await account.create('unique()', email, password, name);
            await account.createEmailSession(email, password);
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    async logout() {
        try {
            await account.deleteSession('current');
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    },
    
    // Delete account
    async deleteAccount() {
        try {
            await account.delete();
            return true;
        } catch (error) {
            console.error('Delete account error:', error);
            return false;
        }
    },
    
    // Update password
    async updatePassword(oldPassword, newPassword) {
        try {
            await account.updatePassword(newPassword, oldPassword);
            return { success: true };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Request password reset
    async requestPasswordReset(email) {
        try {
            await account.createRecovery(
                email,
                `${window.location.origin}/reset-password`
            );
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Complete password reset
    async completePasswordReset(userId, secret, newPassword) {
        try {
            await account.updateRecovery(userId, secret, newPassword);
            return { success: true };
        } catch (error) {
            console.error('Complete password reset error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update user preferences
    async updatePreferences(preferences) {
        try {
            const user = await account.get();
            const updated = await account.updatePrefs({
                ...user.prefs,
                ...preferences
            });
            return { success: true, prefs: updated };
        } catch (error) {
            console.error('Update preferences error:', error);
            return { success: false, error: error.message };
        }
    }
};
