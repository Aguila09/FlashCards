// Input Mode (Writing Practice)
const InputMode = {
    cards: [],
    currentIndex: 0,
    session: null,
    answered: false,

    async init(deckId) {
        this.cards = await SRSSystem.getCardsForReview(deckId);
        
        if (this.cards.length === 0) {
            alert('No hay cartas disponibles para practicar');
            return false;
        }

        // Shuffle cards
        this.cards = this.shuffleArray([...this.cards]);
        this.currentIndex = 0;
        this.session = new StudySession(deckId, 'input');
        this.answered = false;
        
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

        // Randomly decide what to ask for
        const questionType = Math.random() > 0.5 ? 'title' : 'definition';
        
        let prompt, hint, correctAnswer;
        if (questionType === 'title') {
            prompt = '¿Qué término corresponde a esta definición?';
            hint = card.description;
            correctAnswer = card.title;
        } else {
            prompt = '¿Cuál es la definición de este término?';
            hint = card.title;
            correctAnswer = card.description;
        }

        let imageHTML = '';
        if (card.imageUrl && questionType === 'title') {
            imageHTML = `<img src="${card.imageUrl}" alt="Pista visual">`;
        }

        container.innerHTML = `
            <div class="input-container">
                <h3 class="input-prompt">${prompt}</h3>
                <div class="input-hint">
                    ${hint}
                    ${imageHTML}
                </div>
                <div class="input-answer">
                    <input type="text" id="answer-input" placeholder="Escribe tu respuesta..." 
                           data-correct="${this.escapeHtml(correctAnswer)}"
                           autocomplete="off" ${this.answered ? 'disabled' : ''}>
                    <button class="btn btn-primary" id="btn-check" ${this.answered ? 'disabled' : ''}>
                        Verificar
                    </button>
                </div>
                <div id="input-feedback" class="input-feedback" style="display: none;"></div>
                <div class="input-next" id="input-next" style="display: none;">
                    <button class="btn btn-primary" id="btn-input-next">
                        ${this.currentIndex < this.cards.length - 1 ? 'Siguiente →' : 'Finalizar'}
                    </button>
                </div>
            </div>
        `;

        this.attachEventListeners();
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('answer-input').focus();
        }, 100);
    },

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    attachEventListeners() {
        const input = document.getElementById('answer-input');
        const btnCheck = document.getElementById('btn-check');

        btnCheck.addEventListener('click', () => this.checkAnswer());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.answered) {
                this.checkAnswer();
            }
        });
    },

    normalizeString(str) {
        return str
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^\w\s]/g, ''); // Remove punctuation
    },

    checkAnswer() {
        if (this.answered) return;
        this.answered = true;

        const input = document.getElementById('answer-input');
        const userAnswer = input.value.trim();
        const correctAnswer = input.dataset.correct;
        const feedback = document.getElementById('input-feedback');
        const nextSection = document.getElementById('input-next');

        // Normalize both answers for comparison
        const normalizedUser = this.normalizeString(userAnswer);
        const normalizedCorrect = this.normalizeString(correctAnswer);

        const isCorrect = normalizedUser === normalizedCorrect;

        input.disabled = true;
        document.getElementById('btn-check').disabled = true;

        if (isCorrect) {
            input.classList.add('correct');
            feedback.className = 'input-feedback correct';
            feedback.innerHTML = '✓ ¡Correcto!';
            this.session.recordAnswer(true);
        } else {
            input.classList.add('incorrect');
            feedback.className = 'input-feedback incorrect';
            feedback.innerHTML = `✗ Incorrecto<br><strong>Respuesta correcta:</strong> ${correctAnswer}`;
            this.session.recordAnswer(false);
        }

        feedback.style.display = 'block';
        nextSection.style.display = 'block';

        // Attach next button listener
        document.getElementById('btn-input-next').addEventListener('click', () => {
            if (this.currentIndex < this.cards.length - 1) {
                this.currentIndex++;
                this.answered = false;
                this.render();
            } else {
                this.complete();
            }
        });
    },

    complete() {
        this.session.complete();
        const container = document.getElementById('study-content');
        const accuracy = this.session.getAccuracy();
        
        let emoji = '🎉';
        let message = '¡Excelente trabajo!';
        
        if (accuracy < 50) {
            emoji = '📚';
            message = 'Sigue practicando';
        } else if (accuracy < 80) {
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
                <p>Respuestas correctas: ${this.session.correctAnswers} / ${this.session.cardsStudied}</p>
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
