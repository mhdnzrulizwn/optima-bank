
/**
 * Optima Chatbot Integration - Fixed Version
 * Properly integrates with existing app.js Supabase setup
 */

class OptimaChatbotIntegration {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 10;
    }

    async init() {
        console.log('Initializing Optima Chatbot Integration...');

        // Wait for the global db instance to be available
        await this.waitForSupabaseInstance();

        if (this.db) {
            await this.setupAuthentication();
            this.setupChatbotHandlers();
            console.log('Optima Chatbot Integration ready');
            this.isInitialized = true;
        } else {
            console.error('Failed to initialize chatbot - Supabase not available');
        }
    }

    async waitForSupabaseInstance() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                // Check for global db instance from app.js
                if (typeof db !== 'undefined' && db !== null) {
                    console.log('Using existing Supabase instance');
                    this.db = db;
                    resolve(true);
                } else if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log(`Waiting for Supabase instance... (attempt ${this.retryCount})`);
                    setTimeout(checkSupabase, 500);
                } else {
                    console.error('Supabase instance not found after maximum retries');
                    resolve(false);
                }
            };
            checkSupabase();
        });
    }

    async setupAuthentication() {
        try {
            // Check if currentUser is already available from app.js
            if (typeof currentUser !== 'undefined' && currentUser !== null) {
                this.currentUser = currentUser;
                console.log('Using existing user session');
                return;
            }

            // Try to get session from Supabase
            const { data } = await this.db.auth.getSession();
            if (data.session) {
                this.currentUser = data.session.user;
                console.log('User authenticated:', this.currentUser.email);
            } else {
                console.log('No active user session');
            }
        } catch (error) {
            console.log('Authentication setup info:', error.message);
            // Don't throw error - chatbot should work without authentication
        }
    }

    async getUserProfile() {
        if (!this.currentUser || !this.db) {
            return null;
        }

        try {
            const { data: profile } = await this.db
                .from("profiles")
                .select("full_name, points")
                .eq("id", this.currentUser.id)
                .single();

            return profile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    async getVouchers() {
        if (!this.db) return [];

        try {
            const { data: vouchers } = await this.db
                .from("vouchers")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: false })
                .limit(5);

            return vouchers || [];
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            return [];
        }
    }

    setupChatbotHandlers() {
        // Wait for chatbot to be available
        const setupHandlers = () => {
            if (typeof window.optimaChatbot !== 'undefined') {
                this.registerChatbotHandlers();
            } else {
                setTimeout(setupHandlers, 100);
            }
        };
        setupHandlers();
    }

    registerChatbotHandlers() {
        const chatbot = window.optimaChatbot;

        // Override the default response handler
        chatbot.handleUserMessage = async (message) => {
            const response = await this.generateResponse(message);
            chatbot.addMessage(response, 'bot');
        };

        console.log('Chatbot handlers registered');
    }

    async generateResponse(message) {
        const lowerMessage = message.toLowerCase();

        // Account-related queries
        if (lowerMessage.includes('points') || lowerMessage.includes('balance')) {
            return await this.handlePointsQuery();
        }

        if (lowerMessage.includes('tier') || lowerMessage.includes('status')) {
            return await this.handleTierQuery();
        }

        // Voucher-related queries
        if (lowerMessage.includes('voucher') || lowerMessage.includes('reward')) {
            return await this.handleVoucherQuery();
        }

        if (lowerMessage.includes('redeem')) {
            return await this.handleRedemptionQuery();
        }

        // Login/technical issues
        if (lowerMessage.includes('login') || lowerMessage.includes('sign in') || 
            lowerMessage.includes('password') || lowerMessage.includes('account')) {
            return this.handleLoginIssues();
        }

        // App issues
        if (lowerMessage.includes('error') || lowerMessage.includes('problem') || 
            lowerMessage.includes('bug') || lowerMessage.includes('not working')) {
            return this.handleTechnicalIssues();
        }

        // Greetings
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
            lowerMessage.includes('help')) {
            return this.handleGreeting();
        }

        // Default response
        return this.handleGeneralQuery();
    }

    async handlePointsQuery() {
        const profile = await this.getUserProfile();

        if (profile) {
            const points = profile.points || 0;
            return `You currently have **${points.toLocaleString()} points** in your Optima Bank loyalty account. 🪙\n\nYou can use these points to redeem vouchers and exclusive rewards!`;
        } else if (!this.currentUser) {
            return `To check your points balance, please **sign in** to your Optima Bank account first. 🔐\n\nOnce signed in, I can show you your current points and available rewards!`;
        } else {
            return `I'm having trouble accessing your account information right now. Please try refreshing the page or contact our support team. 🔄`;
        }
    }

    async handleTierQuery() {
        const profile = await this.getUserProfile();

        if (profile) {
            const points = profile.points || 0;
            let tier, nextTier, pointsNeeded;

            if (points <= 500) {
                tier = 'Bronze';
                nextTier = 'Silver';
                pointsNeeded = 501 - points;
            } else if (points <= 2000) {
                tier = 'Silver';
                nextTier = 'Gold';
                pointsNeeded = 2001 - points;
            } else if (points <= 5000) {
                tier = 'Gold';
                nextTier = 'Platinum';
                pointsNeeded = 5001 - points;
            } else if (points <= 10000) {
                tier = 'Platinum';
                nextTier = 'Diamond';
                pointsNeeded = 10001 - points;
            } else {
                tier = 'Diamond';
                nextTier = null;
                pointsNeeded = 0;
            }

            let response = `You are currently a **${tier} Member** with ${points.toLocaleString()} points! 👑`;

            if (nextTier) {
                response += `\n\nTo reach **${nextTier}** tier, you need **${pointsNeeded.toLocaleString()} more points**.`;
            } else {
                response += `\n\n🎉 **Congratulations!** You've reached the highest tier level!`;
            }

            return response;
        } else if (!this.currentUser) {
            return `Please **sign in** to view your tier status and membership benefits. 🔐`;
        } else {
            return `I'm unable to access your tier information at the moment. Please try again later. 🔄`;
        }
    }

    async handleVoucherQuery() {
        const vouchers = await this.getVouchers();

        if (vouchers.length > 0) {
            let response = `Here are some of our **latest vouchers** available for redemption: 🎁\n\n`;

            vouchers.slice(0, 3).forEach((voucher, index) => {
                response += `**${index + 1}. ${voucher.title}**\n`;
                response += `   ${voucher.description}\n`;
                response += `   💰 ${voucher.points_required} points\n\n`;
            });

            response += `Visit the **Vouchers page** to see all available rewards and redeem them!`;
            return response;
        } else {
            return `I don't have access to current voucher information right now. Please visit the **Vouchers page** to see all available rewards! 🎁`;
        }
    }

    async handleRedemptionQuery() {
        return `**How to redeem vouchers:** 🎯\n\n` +
               `1. 🛍️ Browse available vouchers on the **Vouchers page**\n` +
               `2. 🔍 Check that you have enough points for the voucher\n` +
               `3. 🎁 Click **"Redeem Now"** or add to cart\n` +
               `4. ✅ Confirm your redemption\n` +
               `5. 📧 You'll receive your voucher code via email\n\n` +
               `Need help with a specific redemption? Let me know which voucher you're interested in!`;
    }

    handleLoginIssues() {
        return `**Having trouble signing in?** Here are some quick fixes: 🔧\n\n` +
               `**✅ Try these steps:**\n` +
               `• Check your email and password spelling\n` +
               `• Clear your browser cache and cookies\n` +
               `• Try refreshing the page\n` +
               `• Make sure your internet connection is stable\n\n` +
               `**🔒 Forgot your password?**\n` +
               `Use the "Forgot Password" link on the sign-in page\n\n` +
               `**📧 Account issues?**\n` +
               `Contact our support team at support@optimabank.com`;
    }

    handleTechnicalIssues() {
        return `**Experiencing technical issues?** I'm here to help! 🛠️\n\n` +
               `**🔄 Quick fixes:**\n` +
               `• Refresh the page (Ctrl+F5 or Cmd+Shift+R)\n` +
               `• Clear browser cache and cookies\n` +
               `• Try using a different browser\n` +
               `• Check your internet connection\n\n` +
               `**📱 Mobile issues?**\n` +
               `• Update your browser to the latest version\n` +
               `• Try closing and reopening the browser\n\n` +
               `**💬 Still having problems?**\n` +
               `Please contact our technical support team and describe the specific issue you're experiencing.`;
    }

    handleGreeting() {
        const userName = this.currentUser ? 'there' : 'there';
        return `Hello ${userName}! 👋 Welcome to Optima Bank Support!\n\n` +
               `I'm here to help you with:\n` +
               `🪙 **Points & Account Balance**\n` +
               `🎁 **Voucher Information & Redemption**\n` +
               `👑 **Tier Status & Benefits**\n` +
               `🔧 **Technical Support**\n` +
               `📱 **App Usage Help**\n\n` +
               `What can I help you with today?`;
    }

    handleGeneralQuery() {
        return `I'd be happy to help you! 😊\n\n` +
               `**I can assist you with:**\n` +
               `🪙 Checking your points balance\n` +
               `👑 Your tier status and benefits\n` +
               `🎁 Available vouchers and rewards\n` +
               `🔄 How to redeem vouchers\n` +
               `🔧 Technical support and troubleshooting\n` +
               `📱 General app usage questions\n\n` +
               `**💬 You can ask me things like:**\n` +
               `• "What's my points balance?"\n` +
               `• "How do I redeem a voucher?"\n` +
               `• "What tier am I?"\n` +
               `• "I'm having login problems"\n\n` +
               `What would you like to know?`;
    }
}

// Initialize the integration
const optimaChatbotIntegration = new OptimaChatbotIntegration();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => optimaChatbotIntegration.init(), 1000);
    });
} else {
    setTimeout(() => optimaChatbotIntegration.init(), 1000);
}

// Make it globally accessible
window.optimaChatbotIntegration = optimaChatbotIntegration;

console.log('Optima Chatbot Integration (Fixed) loaded');
