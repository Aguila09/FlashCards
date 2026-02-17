// Quiz Mode (Multiple Choice)
const QuizMode = {
    cards: [],
    currentIndex: 0,
    session: null,
    answered: false,

    async init(deckId) {
        this.cards = await SRSSystem.getCardsForReview(deckId);
        
        if (this.cards.length < 4) {
            alert('Se necesitan al menos 4 cartas para el modo Quiz');
            return false;
        }

        // Shuffle cards
        this.cards = this.shuffleArray([...this.cards]);
        this.currentIndex = 0;
        this.session = new StudySession(deckId, 'quiz');
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

        // Randomly decide what to ask: title from definition, or definition from title
        const questionType = Math.random() > 0.5 ? 'title' : 'definition';
        
        let question, correctAnswer, prompt;
        if (questionType === 'title') {
            question = '¿Qué término corresponde a esta definición?';
            prompt = card.description;
            correctAnswer = card.title;
        } else {
            question = '¿Cuál es la definición de este término?';
            prompt = card.title;
            correctAnswer = card.description;
        }

        // Generate options (1 correct + 3 distractors)
        const options = this.generateOptions(card, questionType);

        container.innerHTML = `
            <div class="quiz-container">
                <h3 class="quiz-question">${question}</h3>
                <div class="quiz-prompt">${prompt}</div>
                <div class="quiz-options" id="quiz-options">
                    ${options.map((option, index) => `
                        <button class="quiz-option" data-index="${index}" data-correct="${option === correctAnswer}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
                <div id="quiz-feedback" class="quiz-feedback" style="display: none;"></div>
                <div class="quiz-next" id="quiz-next" style="display: none;">
                    <button class="btn btn-primary" id="btn-quiz-next">
                        ${this.currentIndex < this.cards.length - 1 ? 'Siguiente →' : 'Finalizar'}
                    </button>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    generateOptions(correctCard, questionType) {
        const correctAnswer = questionType === 'title' ? correctCard.title : correctCard.description;
        const options = [correctAnswer];

        // Get 3 random distractors from other cards
        const otherCards = this.cards.filter(c => c.id !== correctCard.id);
        const shuffledOthers = this.shuffleArray(otherCards);
        
        for (let i = 0; i < Math.min(3, shuffledOthers.length); i++) {
            const distractor = questionType === 'title' 
                ? shuffledOthers[i].title 
                : shuffledOthers[i].description;
            options.push(distractor);
        }

        // If not enough cards for 4 options, add generic distractors
        while (options.length < 4) {
            options.push(`Opción ${options.length}`);
        }

        // Shuffle options
        return this.shuffleArray(options);
    },

    attachEventListeners() {
        const optionButtons = document.querySelectorAll('.quiz-option');
        optionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAnswer(e));
        });
    },

    handleAnswer(event) {
        if (this.answered) return;
        this.answered = true;

        const button = event.target;
        const isCorrect = button.dataset.correct === 'true';
        const feedback = document.getElementById('quiz-feedback');
        const nextSection = document.getElementById('quiz-next');

        // Disable all buttons
        const allButtons = document.querySelectorAll('.quiz-option');
        allButtons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            }
        });

        // Mark selected button
        if (isCorrect) {
            button.classList.add('correct');
            feedback.className = 'quiz-feedback correct';
            feedback.textContent = '✓ ¡Correcto!';
            this.session.recordAnswer(true);
        } else {
            button.classList.add('incorrect');
            feedback.className = 'quiz-feedback incorrect';
            feedback.textContent = '✗ Incorrecto. La respuesta correcta está marcada en verde.';
            this.session.recordAnswer(false);
        }

        feedback.style.display = 'block';
        nextSection.style.display = 'block';

        // Attach next button listener
        document.getElementById('btn-quiz-next').addEventListener('click', () => {
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
