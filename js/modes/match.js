// Match Mode (Column Association)
const MatchMode = {
    cards: [],
    session: null,
    selectedLeft: null,
    selectedRight: null,
    matches: 0,
    attempts: 0,

    async init(deckId) {
        this.cards = await SRSSystem.getCardsForReview(deckId);
        
        if (this.cards.length < 3) {
            alert('Se necesitan al menos 3 cartas para el modo Match');
            return false;
        }

        // Limit to 8 cards for better UX
        this.cards = this.cards.slice(0, 8);
        this.session = new StudySession(deckId, 'match');
        this.selectedLeft = null;
        this.selectedRight = null;
        this.matches = 0;
        this.attempts = 0;
        
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
        document.getElementById('study-progress').textContent = `Coincidencias: ${this.matches} / ${this.cards.length}`;

        // Create left column (titles) and right column (definitions)
        const leftItems = this.cards.map((card, index) => ({
            id: index,
            content: card.title,
            matched: false
        }));

        const rightItems = this.shuffleArray(this.cards.map((card, index) => ({
            id: index,
            content: card.description,
            matched: false
        })));

        container.innerHTML = `
            <div class="match-container">
                <div class="match-columns">
                    <div class="match-column">
                        <h3>Términos</h3>
                        <div class="match-items" id="left-items">
                            ${leftItems.map(item => `
                                <div class="match-item" data-id="${item.id}" data-side="left">
                                    ${item.content}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="match-column">
                        <h3>Definiciones</h3>
                        <div class="match-items" id="right-items">
                            ${rightItems.map(item => `
                                <div class="match-item" data-id="${item.id}" data-side="right">
                                    ${item.content}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="match-score">
                    <p>Intentos: ${this.attempts}</p>
                    <p>Precisión: ${this.attempts > 0 ? Math.round((this.matches / this.attempts) * 100) : 100}%</p>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    attachEventListeners() {
        const items = document.querySelectorAll('.match-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => this.handleItemClick(e));
        });
    },

    handleItemClick(event) {
        const item = event.target;
        
        if (item.classList.contains('matched') || item.classList.contains('hidden')) {
            return;
        }

        const side = item.dataset.side;
        const id = parseInt(item.dataset.id);

        if (side === 'left') {
            // Deselect previous left selection
            if (this.selectedLeft !== null) {
                const prevSelected = document.querySelector(`.match-item[data-side="left"][data-id="${this.selectedLeft}"]`);
                if (prevSelected) prevSelected.classList.remove('selected');
            }

            this.selectedLeft = id;
            item.classList.add('selected');
        } else {
            // Deselect previous right selection
            if (this.selectedRight !== null) {
                const prevSelected = document.querySelector(`.match-item[data-side="right"][data-id="${this.selectedRight}"]`);
                if (prevSelected) prevSelected.classList.remove('selected');
            }

            this.selectedRight = id;
            item.classList.add('selected');
        }

        // Check if both items are selected
        if (this.selectedLeft !== null && this.selectedRight !== null) {
            this.checkMatch();
        }
    },

    checkMatch() {
        this.attempts++;
        const isMatch = this.selectedLeft === this.selectedRight;

        const leftItem = document.querySelector(`.match-item[data-side="left"][data-id="${this.selectedLeft}"]`);
        const rightItem = document.querySelector(`.match-item[data-side="right"][data-id="${this.selectedRight}"]`);

        if (isMatch) {
            // Correct match
            leftItem.classList.remove('selected');
            leftItem.classList.add('matched');
            rightItem.classList.remove('selected');
            rightItem.classList.add('matched');
            
            this.matches++;
            this.session.recordAnswer(true);

            setTimeout(() => {
                leftItem.classList.add('hidden');
                rightItem.classList.add('hidden');
                
                if (this.matches === this.cards.length) {
                    setTimeout(() => this.complete(), 500);
                }
            }, 500);
        } else {
            // Incorrect match
            leftItem.classList.add('error');
            rightItem.classList.add('error');
            this.session.recordAnswer(false);

            setTimeout(() => {
                leftItem.classList.remove('selected', 'error');
                rightItem.classList.remove('selected', 'error');
            }, 500);
        }

        this.selectedLeft = null;
        this.selectedRight = null;

        // Update score
        const scoreEl = document.querySelector('.match-score');
        if (scoreEl) {
            const accuracy = this.attempts > 0 ? Math.round((this.matches / this.attempts) * 100) : 100;
            scoreEl.innerHTML = `
                <p>Intentos: ${this.attempts}</p>
                <p>Precisión: ${accuracy}%</p>
            `;
        }

        // Update progress
        document.getElementById('study-progress').textContent = `Coincidencias: ${this.matches} / ${this.cards.length}`;
    },

    complete() {
        this.session.complete();
        const container = document.getElementById('study-content');
        const accuracy = this.session.getAccuracy();
        
        let emoji = '🎉';
        let message = '¡Perfecto!';
        
        if (accuracy < 70) {
            emoji = '📚';
            message = 'Sigue practicando';
        } else if (accuracy < 90) {
            emoji = '👍';
            message = '¡Buen trabajo!';
        }

        container.innerHTML = `
            <div class="memory-complete">
                <h3>${emoji} ${message}</h3>
                <div class="stat-card" style="max-width: 300px; margin: 2rem auto;">
                    <div class="stat-value">${accuracy}%</div>
                    <div class="stat-label">Precisión</div>
                </div>
                <p>Coincidencias encontradas: ${this.matches}</p>
                <p>Intentos totales: ${this.attempts}</p>
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
