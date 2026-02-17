// Data Models

class Deck {
    constructor(name, description = '') {
        this.name = name;
        this.description = description;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

class Card {
    constructor(deckId, title, description) {
        this.deckId = deckId;
        this.title = title;
        this.description = description;
        this.faces = []; // Additional faces beyond title and description
        this.examples = []; // Array of example strings
        this.imageUrl = ''; // URL or base64 image
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        
        // SRS (Spaced Repetition System) properties
        this.srsLevel = 0; // 0: New, 1: Easy, 2: Medium, 3: Hard
        this.lastReviewed = null;
        this.nextReview = null;
        this.reviewCount = 0;
    }

    addFace(content) {
        this.faces.push(content);
    }

    addExample(example) {
        this.examples.push(example);
    }

    setImage(url) {
        this.imageUrl = url;
    }

    toJSON() {
        return {
            id: this.id,
            deckId: this.deckId,
            title: this.title,
            description: this.description,
            faces: this.faces,
            examples: this.examples,
            imageUrl: this.imageUrl,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            srsLevel: this.srsLevel,
            lastReviewed: this.lastReviewed,
            nextReview: this.nextReview,
            reviewCount: this.reviewCount
        };
    }
}

class StudySession {
    constructor(deckId, mode) {
        this.deckId = deckId;
        this.mode = mode;
        this.startTime = new Date();
        this.endTime = null;
        this.cardsStudied = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
    }

    recordAnswer(correct) {
        if (correct) {
            this.correctAnswers++;
        } else {
            this.incorrectAnswers++;
        }
        this.cardsStudied++;
    }

    complete() {
        this.endTime = new Date();
    }

    getAccuracy() {
        if (this.cardsStudied === 0) return 0;
        return Math.round((this.correctAnswers / this.cardsStudied) * 100);
    }

    getDuration() {
        const end = this.endTime || new Date();
        return Math.round((end - this.startTime) / 1000); // seconds
    }
}
