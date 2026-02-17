// Memory Mode (Memory Grid Game)
const MemoryMode = {
    cards: [],
    memoryCards: [],
    flippedCards: [],
    matchedPairs: 0,
    moves: 0,
    session: null,
    canFlip: true,

    async init(deckId) {
        this.cards = await SRSSystem.getCardsForReview(deckId);
        
        if (this.cards.length < 3) {
            alert('Se necesitan al menos 3 cartas para el modo Memoria');
            return false;
        }

        // Limit to 8 cards (16 memory cards total) for better UX
        this.cards = this.cards.slice(0, 8);
        this.createMemoryCards();
        this.session = new StudySession(deckId, 'memory');
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.canFlip = true;
        
        return true;
    },

    createMemoryCards() {
        this.memoryCards = [];
        
        // Create pairs: one card with title, one with definition
        this.cards.forEach((card, index) => {
            this.memoryCards.push({
                id: index,
                content: card.title,
                type: 'title',
                matched: false
            });
            this.memoryCards.push({
                id: index,
                content: card.description,
                type: 'definition',
                matched: false
            });
        });

        // Shuffle the memory cards
        this.memoryCards = this.shuffleArray(this.memoryCards);
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
        document.getElementById('study-progress').textContent = `Pares: ${this.matchedPairs} / ${this.cards.length}`;

        container.innerHTML = `
            <div class="memory-container">
                <div class="memory-stats">
                    <div>Movimientos: ${this.moves}</div>
                    <div>Pares encontrados: ${this.matchedPairs} / ${this.cards.length}</div>
                </div>
                <div class="memory-grid">
                    ${this.memoryCards.map((card, index) => `
                        <div class="memory-card ${card.matched ? 'matched' : ''}" 
                             data-index="${index}"
                             data-id="${card.id}">
                            ${card.content}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    attachEventListeners() {
        const memoryCards = document.querySelectorAll('.memory-card');
        memoryCards.forEach(card => {
            card.addEventListener('click', (e) => this.handleCardClick(e));
        });
    },

    handleCardClick(event) {
        if (!this.canFlip) return;

        const card = event.target;
        const index = parseInt(card.dataset.index);

        // Don't flip if already flipped or matched
        if (card.classList.contains('flipped') || 
            card.classList.contains('matched') ||
            this.flippedCards.includes(index)) {
            return;
        }

        // Flip the card
        card.classList.add('flipped');
        this.flippedCards.push(index);

        // Check if two cards are flipped
        if (this.flippedCards.length === 2) {
            this.canFlip = false;
            this.moves++;
            this.checkMatch();
        }
    },

    checkMatch() {
        const [index1, index2] = this.flippedCards;
        const card1 = this.memoryCards[index1];
        const card2 = this.memoryCards[index2];

        const card1El = document.querySelector(`.memory-card[data-index="${index1}"]`);
        const card2El = document.querySelector(`.memory-card[data-index="${index2}"]`);

        setTimeout(() => {
            // Check if cards have the same ID (they're a pair)
            if (card1.id === card2.id) {
                // Match found
                card1.matched = true;
                card2.matched = true;
                card1El.classList.add('matched');
                card2El.classList.add('matched');
                card1El.classList.remove('flipped');
                card2El.classList.remove('flipped');
                
                this.matchedPairs++;
                this.session.recordAnswer(true);

                // Check if game is complete
                if (this.matchedPairs === this.cards.length) {
                    setTimeout(() => this.complete(), 500);
                }
            } else {
                // No match, flip back
                card1El.classList.remove('flipped');
                card2El.classList.remove('flipped');
                this.session.recordAnswer(false);
            }

            this.flippedCards = [];
            this.canFlip = true;

            // Update stats
            this.updateStats();
        }, 1000);
    },

    updateStats() {
        const statsEl = document.querySelector('.memory-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div>Movimientos: ${this.moves}</div>
                <div>Pares encontrados: ${this.matchedPairs} / ${this.cards.length}</div>
            `;
        }
        document.getElementById('study-progress').textContent = `Pares: ${this.matchedPairs} / ${this.cards.length}`;
    },

    complete() {
        this.session.complete();
        const container = document.getElementById('study-content');
        const accuracy = this.session.getAccuracy();
        
        let emoji = '🎉';
        let message = '¡Excelente memoria!';
        
        if (accuracy < 50) {
            emoji = '🧠';
            message = 'Sigue entrenando tu memoria';
        } else if (accuracy < 70) {
            emoji = '👍';
            message = '¡Buen trabajo!';
        }

        container.innerHTML = `
            <div class="memory-complete">
                <h3>${emoji} ${message}</h3>
                <div class="stat-card" style="max-width: 300px; margin: 2rem auto;">
                    <div class="stat-value">${accuracy}%</div>
                    <div class="stat-label">Eficiencia</div>
                </div>
                <p>Movimientos totales: ${this.moves}</p>
                <p>Movimientos óptimos: ${this.cards.length}</p>
                <p>Duración: ${this.session.getDuration()} segundos</p>
                <button class="btn btn-primary" id="btn-restart">Reintentar</button>
                <button class="btn btn-secondary" id="btn-finish">Finalizar</button>
            </div>
        `;

        document.getElementById('btn-restart').addEventListener('click', async () => {
            await this.init(this.session.deckId);
            this.render();
        });

        document.getElementById('btn-finish').addEventListener('click', () => {
            UI.showView('deck-detail');
        });
    }
};
