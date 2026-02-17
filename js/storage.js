// Storage Service - Business Logic Layer
const StorageService = {
    // Deck Operations
    async createDeck(name, description) {
        const deck = new Deck(name, description);
        const id = await db.add('decks', deck);
        deck.id = id;
        return deck;
    },

    async getDeck(id) {
        return await db.get('decks', id);
    },

    async getAllDecks() {
        const decks = await db.getAll('decks');
        return decks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    async updateDeck(id, updates) {
        const deck = await db.get('decks', id);
        if (!deck) throw new Error('Deck not found');
        
        Object.assign(deck, updates);
        deck.updatedAt = new Date().toISOString();
        await db.update('decks', deck);
        return deck;
    },

    async deleteDeck(id) {
        // Delete all cards in the deck
        const cards = await this.getCardsByDeck(id);
        for (const card of cards) {
            await this.deleteCard(card.id);
        }
        // Delete the deck
        await db.delete('decks', id);
    },

    async getDeckStats(deckId) {
        const cards = await this.getCardsByDeck(deckId);
        const totalCards = cards.length;
        
        if (totalCards === 0) {
            return {
                totalCards: 0,
                masteredCards: 0,
                masteryPercentage: 0,
                averageReviews: 0
            };
        }

        const masteredCards = cards.filter(card => card.srsLevel === 1).length;
        const totalReviews = cards.reduce((sum, card) => sum + card.reviewCount, 0);
        
        return {
            totalCards,
            masteredCards,
            masteryPercentage: Math.round((masteredCards / totalCards) * 100),
            averageReviews: Math.round(totalReviews / totalCards)
        };
    },

    // Card Operations
    async createCard(deckId, cardData) {
        const card = new Card(deckId, cardData.title, cardData.description);
        
        if (cardData.faces) card.faces = cardData.faces;
        if (cardData.examples) card.examples = cardData.examples;
        if (cardData.imageUrl) card.imageUrl = cardData.imageUrl;
        
        const id = await db.add('cards', card);
        card.id = id;
        
        // Update deck's updatedAt
        await this.updateDeck(deckId, {});
        
        return card;
    },

    async getCard(id) {
        return await db.get('cards', id);
    },

    async getCardsByDeck(deckId) {
        return await db.getByIndex('cards', 'deckId', deckId);
    },

    async updateCard(id, updates) {
        const card = await db.get('cards', id);
        if (!card) throw new Error('Card not found');
        
        Object.assign(card, updates);
        card.updatedAt = new Date().toISOString();
        await db.update('cards', card);
        
        // Update deck's updatedAt
        await this.updateDeck(card.deckId, {});
        
        return card;
    },

    async deleteCard(id) {
        const card = await db.get('cards', id);
        if (card) {
            await db.delete('cards', id);
            // Update deck's updatedAt
            await this.updateDeck(card.deckId, {});
        }
    },

    async updateCardSRS(cardId, difficulty) {
        const card = await this.getCard(cardId);
        if (!card) return;

        card.lastReviewed = new Date().toISOString();
        card.reviewCount++;

        // Simple Leitner system implementation
        switch (difficulty) {
            case 'easy':
                card.srsLevel = 1; // Mastered
                card.nextReview = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
                break;
            case 'medium':
                card.srsLevel = 2;
                card.nextReview = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days
                break;
            case 'hard':
                card.srsLevel = 3;
                card.nextReview = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day
                break;
        }

        await db.update('cards', card);
    },

    // Settings Operations
    async getSetting(key, defaultValue = null) {
        const setting = await db.get('settings', key);
        return setting ? setting.value : defaultValue;
    },

    async setSetting(key, value) {
        await db.update('settings', { key, value });
    },

    // Export/Import Operations
    async exportData() {
        const decks = await this.getAllDecks();
        const allCards = await db.getAll('cards');
        
        const exportData = {
            version: 1,
            exportDate: new Date().toISOString(),
            decks: decks,
            cards: allCards
        };
        
        return JSON.stringify(exportData, null, 2);
    },

    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.version || !data.decks || !data.cards) {
                throw new Error('Invalid import format');
            }

            // Import decks
            const deckIdMap = new Map(); // Map old IDs to new IDs
            for (const deck of data.decks) {
                const oldId = deck.id;
                delete deck.id; // Let DB assign new ID
                const newId = await db.add('decks', deck);
                deckIdMap.set(oldId, newId);
            }

            // Import cards with updated deck IDs
            for (const card of data.cards) {
                const oldDeckId = card.deckId;
                delete card.id; // Let DB assign new ID
                card.deckId = deckIdMap.get(oldDeckId);
                if (card.deckId) { // Only import if deck exists
                    await db.add('cards', card);
                }
            }

            return true;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    },

    // Statistics Operations
    async getGlobalStats() {
        const decks = await this.getAllDecks();
        const allCards = await db.getAll('cards');
        
        const totalCards = allCards.length;
        const masteredCards = allCards.filter(card => card.srsLevel === 1).length;
        const totalReviews = allCards.reduce((sum, card) => sum + card.reviewCount, 0);
        
        return {
            totalDecks: decks.length,
            totalCards,
            masteredCards,
            totalReviews,
            averageMastery: totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0
        };
    }
};
