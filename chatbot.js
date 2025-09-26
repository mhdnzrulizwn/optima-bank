/**
 * Optima Bank Loyalty Chatbot
 * Core functionality for AI-powered customer support
 * Features: Conversation management, AI responses, Supabase integration
 */

class OptimaChatbot {
    constructor(options = {}) {
        this.options = {
            container: 'chatContainer',
            button: 'chatButton',
            debug: false,
            supabaseUrl: '',
            supabaseAnonKey: '',
            maxMessages: 100,
            typingDelay: 1000,
            ...options
        };

        // Core elements
        this.container = document.getElementById(this.options.container);
        this.button = document.getElementById(this.options.button);
        this.messagesArea = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.quickActions = document.getElementById('quickActions');

        // State management
        this.isOpen = false;
        this.isTyping = false;
        this.conversationHistory = [];
        this.userId = this.getUserId();
        this.sessionId = this.generateSessionId();

        // Initialize
        this.init();
        this.log('Optima Chatbot initialized');
    }

    init() {
        this.setupEventListeners();
        this.setupQuickActions();
        this.loadConversationHistory();
        this.showWelcomeMessage();
    }

    setupEventListeners() {
        // Chat button toggle
        this.button?.addEventListener('click', () => this.toggleChat());

        // Control buttons
        document.getElementById('closeBtn')?.addEventListener('click', () => this.closeChat());
        document.getElementById('minimizeBtn')?.addEventListener('click', () => this.minimizeChat());

        // Message input
        this.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput?.addEventListener('input', () => this.updateCharacterCount());

        // Send button
        this.sendBtn?.addEventListener('click', () => this.sendMessage());

        // Attachment menu
        document.getElementById('attachmentBtn')?.addEventListener('click', () => this.toggleAttachmentMenu());

        // Footer links
        document.querySelectorAll('.footer-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFooterAction(link.dataset.action);
            });
        });

        // Close attachment menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.attachment-btn') && !e.target.closest('.attachment-menu')) {
                this.hideAttachmentMenu();
            }
        });
    }

    setupQuickActions() {
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleQuickAction(btn.dataset.action);
                this.hideQuickActions();
            });
        });
    }

    // ==========================================================================
    // Chat Window Management
    // ==========================================================================

    toggleChat() {
        this.isOpen ? this.closeChat() : this.openChat();
    }

    openChat() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.container.classList.add('show');
            this.button?.classList.add('active');
            this.isOpen = true;
            this.scrollToBottom();
            this.focusInput();
            this.hideNotificationBadge();
        }
    }

    closeChat() {
        if (this.container) {
            this.container.classList.add('hide');
            setTimeout(() => {
                this.container.style.display = 'none';
                this.container.classList.remove('show', 'hide');
                this.button?.classList.remove('active');
                this.isOpen = false;
            }, 300);
        }
    }

    minimizeChat() {
        if (this.container) {
            this.container.classList.toggle('minimized');
        }
    }

    // ==========================================================================
    // Message Management
    // ==========================================================================

    async sendMessage() {
        const message = this.messageInput?.value.trim();
        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.updateCharacterCount();
        this.scrollToBottom();

        // Show typing indicator
        this.showTyping();

        try {
            // Get AI response
            const response = await this.getAIResponse(message);

            // Hide typing indicator and show response
            this.hideTyping();
            this.addMessage(response.message, 'bot', response.type, response.actions);

            // Handle special response types
            if (response.showQuickActions) {
                this.showQuickActions();
            }

        } catch (error) {
            this.hideTyping();
            this.addMessage('I apologize, but I\'m experiencing technical difficulties. Please try again in a moment or contact our support team for immediate assistance.', 'bot', 'error');
            this.log('Error getting AI response:', error);
        }

        this.scrollToBottom();
    }

    addMessage(content, sender = 'bot', type = 'normal', actions = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message new`;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble ${type}">
                    <p>${this.formatMessage(content)}</p>
                    ${actions.length > 0 ? this.generateActionButtons(actions) : ''}
                </div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;

        this.messagesArea?.appendChild(messageDiv);

        // Store in conversation history
        this.conversationHistory.push({
            id: Date.now(),
            sender,
            content,
            type,
            timestamp: new Date().toISOString(),
            actions
        });

        // Limit conversation history
        if (this.conversationHistory.length > this.options.maxMessages) {
            this.conversationHistory = this.conversationHistory.slice(-this.options.maxMessages);
        }

        // Save to localStorage
        this.saveConversationHistory();

        // Remove animation class after animation completes
        setTimeout(() => messageDiv.classList.remove('new'), 300);
    }

    formatMessage(message) {
        // Convert markdown-like formatting
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    }

    generateActionButtons(actions) {
        if (!actions.length) return '';

        const buttonsHtml = actions.map(action => `
            <button class="message-action-btn" data-action="${action.id}">
                ${action.label}
            </button>
        `).join('');

        return `<div class="message-actions">${buttonsHtml}</div>`;
    }

    // ==========================================================================
    // AI Response System
    // ==========================================================================

    async getAIResponse(userMessage) {
        // Simulate AI thinking time
        await this.delay(this.options.typingDelay);

        const message = userMessage.toLowerCase();
        const context = this.getConversationContext();

        // Intent detection and response generation
        if (this.matchesIntent(message, ['points', 'balance', 'loyalty points'])) {
            return await this.handlePointsInquiry(context);
        }

        if (this.matchesIntent(message, ['voucher', 'redeem', 'reward', 'discount'])) {
            return await this.handleVoucherInquiry(message, context);
        }

        if (this.matchesIntent(message, ['tier', 'status', 'level', 'membership'])) {
            return await this.handleTierInquiry(context);
        }

        if (this.matchesIntent(message, ['support', 'help', 'problem', 'issue', 'login', 'app'])) {
            return await this.handleTechnicalSupport(message, context);
        }

        if (this.matchesIntent(message, ['hello', 'hi', 'hey', 'good morning', 'good afternoon'])) {
            return this.getGreetingResponse(context);
        }

        if (this.matchesIntent(message, ['thank', 'thanks', 'bye', 'goodbye'])) {
            return this.getClosingResponse();
        }

        // General inquiry
        return this.getGeneralResponse(message, context);
    }

    matchesIntent(message, keywords) {
        return keywords.some(keyword => message.includes(keyword));
    }

    async handlePointsInquiry(context) {
        // Simulate fetching user data
        const pointsData = await this.fetchUserPoints();

        return {
            message: `You currently have **${pointsData.points}** loyalty points! ${pointsData.message}`,
            type: 'info',
            actions: [
                { id: 'view-history', label: 'View Points History' },
                { id: 'earn-more', label: 'How to Earn More' }
            ]
        };
    }

    async handleVoucherInquiry(message, context) {
        if (message.includes('redeem')) {
            return {
                message: 'I can help you redeem your vouchers! Please select from your available vouchers or browse our rewards catalog.',
                type: 'success',
                actions: [
                    { id: 'my-vouchers', label: 'My Vouchers' },
                    { id: 'browse-rewards', label: 'Browse Rewards' }
                ]
            };
        }

        return {
            message: 'Here are your available vouchers and rewards options. You can redeem points for exciting offers!',
            type: 'normal',
            actions: [
                { id: 'available-vouchers', label: 'Available Vouchers' },
                { id: 'redeem-points', label: 'Redeem Points' }
            ]
        };
    }

    async handleTierInquiry(context) {
        const tierData = await this.fetchUserTier();

        return {
            message: `You're currently a **${tierData.tier}** member! ${tierData.benefits}`,
            type: 'info',
            actions: [
                { id: 'tier-benefits', label: 'View Benefits' },
                { id: 'next-tier', label: 'How to Upgrade' }
            ]
        };
    }

    async handleTechnicalSupport(message, context) {
        if (message.includes('login') || message.includes('password')) {
            return {
                message: 'I can help with login issues. Try these common solutions first, or I can connect you with our technical support team.',
                type: 'normal',
                actions: [
                    { id: 'reset-password', label: 'Reset Password' },
                    { id: 'login-help', label: 'Login Help' },
                    { id: 'contact-support', label: 'Contact Support' }
                ]
            };
        }

        return {
            message: 'I\'m here to help with any technical issues. What specific problem are you experiencing?',
            type: 'normal',
            actions: [
                { id: 'app-issues', label: 'App Problems' },
                { id: 'website-issues', label: 'Website Issues' },
                { id: 'human-support', label: 'Talk to Agent' }
            ]
        };
    }

    getGreetingResponse(context) {
        const greetings = [
            'Hello! Welcome to Optima Bank. How can I assist you with your loyalty account today?',
            'Hi there! I\'m here to help with your Optima Bank loyalty program. What would you like to know?',
            'Good to see you! How can I help you make the most of your Optima Bank rewards today?'
        ];

        return {
            message: greetings[Math.floor(Math.random() * greetings.length)],
            type: 'normal',
            showQuickActions: true
        };
    }

    getClosingResponse() {
        return {
            message: 'Thank you for using Optima Bank! If you need any further assistance, I\'m always here to help. Have a great day! 😊',
            type: 'success'
        };
    }

    getGeneralResponse(message, context) {
        return {
            message: 'I\'m here to help with your Optima Bank loyalty program. I can assist with points balance, voucher redemption, tier status, and technical support. What would you like to know?',
            type: 'normal',
            showQuickActions: true
        };
    }

    // ==========================================================================
    // Quick Actions Handler
    // ==========================================================================

    async handleQuickAction(action) {
        this.log('Quick action:', action);

        switch (action) {
            case 'check-points':
                this.addMessage('Check my points balance', 'user');
                setTimeout(() => {
                    this.showTyping();
                    this.getAIResponse('check points').then(response => {
                        this.hideTyping();
                        this.addMessage(response.message, 'bot', response.type, response.actions);
                        this.scrollToBottom();
                    });
                }, 500);
                break;

            case 'vouchers':
                this.addMessage('Show me available vouchers', 'user');
                setTimeout(() => {
                    this.showTyping();
                    this.getAIResponse('vouchers').then(response => {
                        this.hideTyping();
                        this.addMessage(response.message, 'bot', response.type, response.actions);
                        this.scrollToBottom();
                    });
                }, 500);
                break;

            case 'tier-status':
                this.addMessage('What\'s my tier status?', 'user');
                setTimeout(() => {
                    this.showTyping();
                    this.getAIResponse('tier status').then(response => {
                        this.hideTyping();
                        this.addMessage(response.message, 'bot', response.type, response.actions);
                        this.scrollToBottom();
                    });
                }, 500);
                break;

            case 'support':
                this.addMessage('I need technical support', 'user');
                setTimeout(() => {
                    this.showTyping();
                    this.getAIResponse('support').then(response => {
                        this.hideTyping();
                        this.addMessage(response.message, 'bot', response.type, response.actions);
                        this.scrollToBottom();
                    });
                }, 500);
                break;
        }
    }

    // ==========================================================================
    // Data Fetching (Mock Implementation)
    // ==========================================================================

    async fetchUserPoints() {
        // Mock user points data - replace with actual API call
        await this.delay(800);
        return {
            points: Math.floor(Math.random() * 5000) + 1000,
            message: 'You\'re doing great! Keep earning points with every transaction.',
            lastEarned: new Date().toDateString()
        };
    }

    async fetchUserTier() {
        // Mock tier data - replace with actual API call
        await this.delay(800);
        const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
        const currentTier = tiers[Math.floor(Math.random() * tiers.length)];

        return {
            tier: currentTier,
            benefits: `Enjoy exclusive ${currentTier} member benefits including bonus points, priority support, and special offers.`
        };
    }

    // ==========================================================================
    // UI Helper Methods
    // ==========================================================================

    showTyping() {
        this.isTyping = true;
        this.typingIndicator?.style.setProperty('display', 'block');
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        this.typingIndicator?.style.setProperty('display', 'none');
    }

    showQuickActions() {
        this.quickActions?.style.setProperty('display', 'flex');
    }

    hideQuickActions() {
        this.quickActions?.style.setProperty('display', 'none');
    }

    toggleAttachmentMenu() {
        const menu = document.getElementById('attachmentMenu');
        if (menu) {
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
    }

    hideAttachmentMenu() {
        const menu = document.getElementById('attachmentMenu');
        if (menu) menu.style.display = 'none';
    }

    showNotificationBadge(count = 1) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = 'flex';
        }
    }

    hideNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) badge.style.display = 'none';
    }

    showNotificationToast(message) {
        const toast = document.getElementById('notificationToast');
        const messageSpan = toast?.querySelector('.toast-message');

        if (toast && messageSpan) {
            messageSpan.textContent = message;
            toast.style.display = 'block';

            setTimeout(() => {
                toast.style.display = 'none';
            }, 5000);
        }
    }

    updateCharacterCount() {
        const counter = document.getElementById('inputCounter');
        const input = this.messageInput;

        if (counter && input) {
            const count = input.value.length;
            const maxLength = input.getAttribute('maxlength') || 500;
            counter.textContent = `${count}/${maxLength}`;

            // Update send button state
            if (this.sendBtn) {
                this.sendBtn.disabled = count === 0 || this.isTyping;
            }
        }
    }

    scrollToBottom() {
        if (this.messagesArea) {
            setTimeout(() => {
                this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
            }, 100);
        }
    }

    focusInput() {
        if (this.messageInput) {
            setTimeout(() => this.messageInput.focus(), 300);
        }
    }

    // ==========================================================================
    // Footer Actions
    // ==========================================================================

    handleFooterAction(action) {
        switch (action) {
            case 'privacy':
                this.addMessage('Show me the privacy policy', 'user');
                this.addMessage('You can view our Privacy Policy at optima-bank.com/privacy. We take your data protection seriously and follow strict security protocols.', 'bot', 'info');
                break;

            case 'terms':
                this.addMessage('Show me the terms of service', 'user');
                this.addMessage('Our Terms of Service can be found at optima-bank.com/terms. These outline the conditions for using our loyalty program and services.', 'bot', 'info');
                break;

            case 'human-agent':
                this.addMessage('I need to talk to a human agent', 'user');
                this.addMessage('I\'ll connect you with one of our customer service representatives. Please hold on while I transfer you...', 'bot', 'info', [
                    { id: 'connect-agent', label: 'Connect Now' },
                    { id: 'schedule-callback', label: 'Schedule Callback' }
                ]);
                break;
        }
        this.scrollToBottom();
    }

    // ==========================================================================
    // Storage & Session Management
    // ==========================================================================

    getUserId() {
        let userId = localStorage.getItem('optima_chatbot_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('optima_chatbot_user_id', userId);
        }
        return userId;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getConversationContext() {
        return {
            userId: this.userId,
            sessionId: this.sessionId,
            messageCount: this.conversationHistory.length,
            lastMessages: this.conversationHistory.slice(-5)
        };
    }

    saveConversationHistory() {
        try {
            localStorage.setItem('optima_chatbot_history', JSON.stringify(this.conversationHistory));
        } catch (error) {
            this.log('Error saving conversation history:', error);
        }
    }

    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('optima_chatbot_history');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
                this.restoreMessages();
            }
        } catch (error) {
            this.log('Error loading conversation history:', error);
        }
    }

    restoreMessages() {
        if (this.conversationHistory.length > 0) {
            // Clear welcome message
            if (this.messagesArea) {
                this.messagesArea.innerHTML = '';
            }

            // Restore last few messages
            const recentMessages = this.conversationHistory.slice(-10);
            recentMessages.forEach(msg => {
                this.addMessageFromHistory(msg);
            });
        }
    }

    addMessageFromHistory(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}-message`;

        const time = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${message.sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble ${message.type || 'normal'}">
                    <p>${this.formatMessage(message.content)}</p>
                    ${message.actions ? this.generateActionButtons(message.actions) : ''}
                </div>
                <div class="message-time">${time}</div>
            </div>
        `;

        this.messagesArea?.appendChild(messageDiv);
    }

    showWelcomeMessage() {
        if (this.conversationHistory.length === 0) {
            // Only show welcome if no history exists
            setTimeout(() => {
                this.showQuickActions();
            }, 1000);
        }
    }

    clearConversationHistory() {
        this.conversationHistory = [];
        localStorage.removeItem('optima_chatbot_history');
        if (this.messagesArea) {
            this.messagesArea.innerHTML = '';
        }
        this.showWelcomeMessage();
    }

    // ==========================================================================
    // Utility Methods
    // ==========================================================================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(...args) {
        if (this.options.debug) {
            console.log('[Optima Chatbot]', ...args);
        }
    }

    // ==========================================================================
    // Public API Methods
    // ==========================================================================

    sendCustomMessage(message, sender = 'bot', type = 'normal') {
        this.addMessage(message, sender, type);
        this.scrollToBottom();
    }

    updateUserData(userData) {
        this.userData = { ...this.userData, ...userData };
        this.log('User data updated:', this.userData);
    }

    setTypingDelay(delay) {
        this.options.typingDelay = delay;
    }

    getConversationHistory() {
        return [...this.conversationHistory];
    }

    exportConversation() {
        const data = {
            userId: this.userId,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            messages: this.conversationHistory
        };

        return JSON.stringify(data, null, 2);
    }
}

// Global initialization and utilities
window.OptimaChatbot = OptimaChatbot;

// Auto-initialize if config is available
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.supabaseConfig !== 'undefined') {
        console.log('Optima Chatbot: Supabase config detected, initializing...');
    }
});