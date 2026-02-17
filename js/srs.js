// Spaced Repetition System (SRS) - Leitner System Implementation
const SRSSystem = {
    enabled: false,

    async init() {
        this.enabled = await StorageService.getSetting('srsEnabled', false);
    },

    async toggle(enabled) {
        this.enabled = enabled;
        await StorageService.setSetting('srsEnabled', enabled);
    },

    isEnabled() {
        return this.enabled;
    },

    // Filter cards based on review schedule
    async getCardsForReview(deckId) {
        const allCards = await StorageService.getCardsByDeck(deckId);
        
        if (!this.enabled) {
            return allCards; // Return all cards if SRS is disabled
        }

        const now = new Date();
        
        // Return cards that are due for review or never reviewed
        return allCards.filter(card => {
            if (!card.lastReviewed) return true; // New cards
            if (!card.nextReview) return true; // Cards without schedule
            return new Date(card.nextReview) <= now; // Cards due for review
        });
    },

    // Get cards grouped by difficulty level
    async getCardsByLevel(deckId) {
        const cards = await StorageService.getCardsByDeck(deckId);
        
        return {
            new: cards.filter(card => card.srsLevel === 0),
            easy: cards.filter(card => card.srsLevel === 1),
            medium: cards.filter(card => card.srsLevel === 2),
            hard: cards.filter(card => card.srsLevel === 3)
        };
    },

    // Calculate next review interval based on difficulty
    calculateNextReview(currentLevel, difficulty) {
        const intervals = {
            easy: 7,    // 7 days
            medium: 3,  // 3 days
            hard: 1     // 1 day
        };

        const days = intervals[difficulty] || 1;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + days);
        
        return nextDate.toISOString();
    },

    // Get review statistics
    async getReviewStats(deckId) {
        const cards = await StorageService.getCardsByDeck(deckId);
        const now = new Date();
        
        const dueToday = cards.filter(card => {
            if (!card.nextReview) return true;
            return new Date(card.nextReview) <= now;
        }).length;

        const dueThisWeek = cards.filter(card => {
            if (!card.nextReview) return true;
            const nextReview = new Date(card.nextReview);
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return nextReview <= weekFromNow;
        }).length;

        return {
            total: cards.length,
            dueToday,
            dueThisWeek,
            mastered: cards.filter(c => c.srsLevel === 1).length,
            learning: cards.filter(c => c.srsLevel === 2).length,
            difficult: cards.filter(c => c.srsLevel === 3).length,
            new: cards.filter(c => c.srsLevel === 0).length
        };
    }
};
