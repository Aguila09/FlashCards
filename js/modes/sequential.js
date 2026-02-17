// Sequential Review Mode (Classic Flashcard)
const SequentialMode = {
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    session: null,

    async init(deckId) {
        this.cards = await SRSSystem.getCardsForReview(deckId);
        
        if (this.cards.length === 0) {
            return false;
        }

        // Shuffle cards
        this.cards = this.shuffleArray([...this.cards]);
        this.currentIndex = 0;
        this.isFlipped = false;
        this.session = new StudySession(deckId, 'sequential');
        
        return true;
    },

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    render() {
        const container = document.getElementById('study-content');
        const card = this.cards[this.currentIndex];
        const progress = `${this.currentIndex + 1} / ${this.cards.length}`;
        
        document.getElementById('study-progress').textContent = progress;

        let examplesHTML = '';
        if (card.examples && card.examples.length > 0) {
            examplesHTML = `
                <div class="flashcard-examples">
                    <h4>Ejemplos:</h4>
                    ${card.examples.map(ex => `<div class="flashcard-example">${ex}</div>`).join('')}
                </div>
            `;
        }

        let imageHTML = '';
        if (card.imageUrl) {
            imageHTML = `<img src="${card.imageUrl}" alt="${card.title}" class="flashcard-image">`;
        }

        let additionalFacesHTML = '';
        if (card.faces && card.faces.length > 0) {
            additionalFacesHTML = card.faces.map((face, i) => `
                <div class="flashcard-content">
                    <strong>Cara ${i + 3}:</strong> ${face}
                </div>
            `).join('');
        }

        container.innerHTML = `
            <div class="flashcard-container">
                <div class="flashcard" id="flashcard">
                    <div class="flashcard-face flashcard-front">
                        <div class="flashcard-title">${card.title}</div>
                        <div style="color: var(--text-secondary); margin-top: 2rem;">
                            👆 Click para ver la definición
                        </div>
                    </div>
                    <div class="flashcard-face flashcard-back">
                        ${imageHTML}
                        <div class="flashcard-title">${card.title}</div>
                        <div class="flashcard-content">${card.description}</div>
                        ${additionalFacesHTML}
                        ${examplesHTML}
                    </div>
                </div>
            </div>
            <div class="flashcard-controls">
                <button class="btn btn-secondary" id="btn-prev" ${this.currentIndex === 0 ? 'disabled' : ''}>
                    ← Anterior
                </button>
                <button class="btn btn-secondary" id="btn-flip">
                    🔄 Voltear
                </button>
                <button class="btn btn-secondary" id="btn-next" ${this.currentIndex === this.cards.length - 1 ? 'disabled' : ''}>
                    Siguiente →
                </button>
            </div>
            ${SRSSystem.isEnabled() ? this.renderSRSButtons() : ''}
        `;

        this.attachEventListeners();
    },

    renderSRSButtons() {
        return `
            <div class="srs-buttons" id="srs-buttons" style="display: none;">
                <p style="text-align: center; width: 100%; margin-bottom: 1rem; color: var(--text-secondary);">
                    ¿Qué tan fácil fue recordar esta carta?
                </p>
                <button class="srs-btn hard" data-difficulty="hard">😰 Difícil</button>
                <button class="srs-btn medium" data-difficulty="medium">🤔 Medio</button>
                <button class="srs-btn easy" data-difficulty="easy">😊 Fácil</button>
            </div>
        `;
    },

    attachEventListeners() {
        const flashcard = document.getElementById('flashcard');
        const btnFlip = document.getElementById('btn-flip');
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');

        flashcard.addEventListener('click', () => this.flip());
        btnFlip.addEventListener('click', () => this.flip());
        btnPrev.addEventListener('click', () => this.prev());
        btnNext.addEventListener('click', () => this.next());

        if (SRSSystem.isEnabled()) {
            const srsButtons = document.querySelectorAll('.srs-btn');
            srsButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const difficulty = e.target.dataset.difficulty;
                    this.recordSRS(difficulty);
                });
            });
        }
    },

    flip() {
        const flashcard = document.getElementById('flashcard');
        this.isFlipped = !this.isFlipped;
        flashcard.classList.toggle('flipped');

        if (this.isFlipped && SRSSystem.isEnabled()) {
            const srsButtons = document.getElementById('srs-buttons');
            if (srsButtons) {
                srsButtons.style.display = 'flex';
            }
        }
    },

    async recordSRS(difficulty) {
        const card = this.cards[this.currentIndex];
        await StorageService.updateCardSRS(card.id, difficulty);
        
        const srsButtons = document.getElementById('srs-buttons');
        if (srsButtons) {
            srsButtons.style.display = 'none';
        }

        // Auto-advance to next card
        if (this.currentIndex < this.cards.length - 1) {
            setTimeout(() => this.next(), 500);
        }
    },

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.isFlipped = false;
            this.render();
        }
    },

    next() {
        if (this.currentIndex < this.cards.length - 1) {
            this.currentIndex++;
            this.isFlipped = false;
            this.render();
        } else {
            this.complete();
        }
    },

    complete() {
        this.session.complete();
        const container = document.getElementById('study-content');
        container.innerHTML = `
            <div class="memory-complete">
                <h3>¡Sesión Completada!</h3>
                <p>Has revisado ${this.cards.length} cartas</p>
                <p>Duración: ${this.session.getDuration()} segundos</p>
                <button class="btn btn-primary" id="btn-restart">Reiniciar</button>
                <button class="btn btn-secondary" id="btn-finish">Finalizar</button>
            </div>
        `;

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.currentIndex = 0;
            this.isFlipped = false;
            this.render();
        });

        document.getElementById('btn-finish').addEventListener('click', () => {
            UI.showView('deck-detail');
        });
    }
};
