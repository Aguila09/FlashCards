// UI Manager
const UI = {
    currentDeckId: null,
    currentCardId: null,
    currentView: 'home',

    init() {
        this.attachGlobalEventListeners();
        this.initTheme();
    },

    attachGlobalEventListeners() {
        // Navigation
        document.getElementById('btn-home').addEventListener('click', () => this.showView('home'));
        document.getElementById('btn-decks').addEventListener('click', () => this.showView('decks'));
        document.getElementById('btn-stats').addEventListener('click', () => this.showView('stats'));
        document.getElementById('btn-settings').addEventListener('click', () => this.showView('settings'));

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Deck operations
        document.getElementById('btn-create-first-deck').addEventListener('click', () => this.openDeckModal());
        document.getElementById('btn-new-deck').addEventListener('click', () => this.openDeckModal());
        document.getElementById('form-deck').addEventListener('submit', (e) => this.handleDeckSubmit(e));

        // Card operations
        document.getElementById('btn-new-card').addEventListener('click', () => this.openCardModal());
        document.getElementById('form-card').addEventListener('submit', (e) => this.handleCardSubmit(e));
        document.getElementById('btn-add-face').addEventListener('click', () => this.addFaceField());
        document.getElementById('btn-add-example').addEventListener('click', () => this.addExampleField());

        // Deck detail
        document.getElementById('btn-back-to-decks').addEventListener('click', () => this.showView('decks'));
        document.getElementById('btn-edit-deck').addEventListener('click', () => this.editDeck());
        document.getElementById('btn-delete-deck').addEventListener('click', () => this.deleteDeck());

        // Study modes
        document.querySelectorAll('.mode-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.startStudyMode(mode);
            });
        });

        // Study exit
        document.getElementById('btn-exit-study').addEventListener('click', () => {
            this.showView('deck-detail');
        });

        // Settings
        document.getElementById('srs-enabled').addEventListener('change', (e) => {
            SRSSystem.toggle(e.target.checked);
        });
        document.getElementById('btn-export').addEventListener('click', () => this.exportData());
        document.getElementById('btn-import').addEventListener('click', () => {
            document.getElementById('file-import').click();
        });
        document.getElementById('file-import').addEventListener('change', (e) => this.importData(e));
    },

    showView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

        const viewMap = {
            'home': 'btn-home',
            'decks': 'btn-decks',
            'stats': 'btn-stats',
            'settings': 'btn-settings'
        };

        if (viewMap[viewName]) {
            document.getElementById(viewMap[viewName]).classList.add('active');
        }

        document.getElementById(`view-${viewName}`).classList.add('active');
        this.currentView = viewName;

        // Load view data
        switch (viewName) {
            case 'home':
                this.loadHomeView();
                break;
            case 'decks':
                this.loadDecksView();
                break;
            case 'deck-detail':
                this.loadDeckDetail();
                break;
            case 'stats':
                this.loadStatsView();
                break;
            case 'settings':
                this.loadSettingsView();
                break;
        }
    },

    async loadHomeView() {
        const decks = await StorageService.getAllDecks();
        const recentDecksContainer = document.getElementById('recent-decks');

        if (decks.length === 0) {
            recentDecksContainer.innerHTML = '';
            return;
        }

        const recentDecks = decks.slice(0, 3);
        recentDecksContainer.innerHTML = `
            <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Mazos Recientes</h3>
            <div class="decks-grid">
                ${await Promise.all(recentDecks.map(deck => this.renderDeckCard(deck)))}
            </div>
        `;

        // Attach click listeners
        document.querySelectorAll('.deck-card').forEach(card => {
            card.addEventListener('click', () => {
                const deckId = parseInt(card.dataset.deckId);
                this.showDeckDetail(deckId);
            });
        });
    },

    async loadDecksView() {
        const decks = await StorageService.getAllDecks();
        const container = document.getElementById('decks-list');

        if (decks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <p>No tienes mazos aún</p>
                    <button class="btn btn-primary" onclick="UI.openDeckModal()">Crear mi primer mazo</button>
                </div>
            `;
            return;
        }

        container.innerHTML = `${await Promise.all(decks.map(deck => this.renderDeckCard(deck)))}`;

        // Attach click listeners
        document.querySelectorAll('.deck-card').forEach(card => {
            card.addEventListener('click', () => {
                const deckId = parseInt(card.dataset.deckId);
                this.showDeckDetail(deckId);
            });
        });
    },

    async renderDeckCard(deck) {
        const stats = await StorageService.getDeckStats(deck.id);
        return `
            <div class="deck-card" data-deck-id="${deck.id}">
                <h3>${deck.name}</h3>
                <p>${deck.description || 'Sin descripción'}</p>
                <div class="deck-card-stats">
                    <span>📊 ${stats.totalCards} cartas</span>
                    <span>✓ ${stats.masteryPercentage}% dominio</span>
                </div>
            </div>
        `;
    },

    showDeckDetail(deckId) {
        this.currentDeckId = deckId;
        this.showView('deck-detail');
    },

    async loadDeckDetail() {
        if (!this.currentDeckId) {
            this.showView('decks');
            return;
        }

        const deck = await StorageService.getDeck(this.currentDeckId);
        if (!deck) {
            this.showView('decks');
            return;
        }

        const stats = await StorageService.getDeckStats(this.currentDeckId);
        const cards = await StorageService.getCardsByDeck(this.currentDeckId);

        document.getElementById('deck-title').textContent = deck.name;
        document.getElementById('deck-card-count').textContent = stats.totalCards;
        document.getElementById('deck-mastery').textContent = `${stats.masteryPercentage}%`;

        // Disable study modes if not enough cards
        document.querySelectorAll('.mode-card').forEach(btn => {
            const mode = btn.dataset.mode;
            const minCards = { sequential: 1, quiz: 4, match: 3, input: 1, memory: 3 };
            btn.disabled = cards.length < minCards[mode];
        });

        // Render cards list
        const cardsContainer = document.getElementById('cards-list');
        if (cards.length === 0) {
            cardsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No hay cartas en este mazo</p>
                </div>
            `;
            return;
        }

        cardsContainer.innerHTML = cards.map(card => `
            <div class="card-item">
                <div class="card-item-content">
                    <h4>${card.title}</h4>
                    <p>${card.description.substring(0, 100)}${card.description.length > 100 ? '...' : ''}</p>
                </div>
                <div class="card-item-actions">
                    <button onclick="UI.editCard(${card.id})">✏️</button>
                    <button onclick="UI.deleteCard(${card.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    async loadStatsView() {
        const stats = await StorageService.getGlobalStats();
        const container = document.getElementById('stats-content');

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.totalDecks}</div>
                <div class="stat-label">Mazos Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalCards}</div>
                <div class="stat-label">Cartas Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.masteredCards}</div>
                <div class="stat-label">Cartas Dominadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.averageMastery}%</div>
                <div class="stat-label">Dominio Promedio</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalReviews}</div>
                <div class="stat-label">Repasos Totales</div>
            </div>
        `;
    },

    async loadSettingsView() {
        const srsEnabled = await StorageService.getSetting('srsEnabled', false);
        document.getElementById('srs-enabled').checked = srsEnabled;
    },

    // Modal operations
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    openDeckModal(deckId = null) {
        this.currentDeckId = deckId;
        const modal = document.getElementById('modal-deck');
        const title = document.getElementById('modal-deck-title');
        const form = document.getElementById('form-deck');

        if (deckId) {
            title.textContent = 'Editar Mazo';
            StorageService.getDeck(deckId).then(deck => {
                document.getElementById('deck-name').value = deck.name;
                document.getElementById('deck-description').value = deck.description || '';
            });
        } else {
            title.textContent = 'Nuevo Mazo';
            form.reset();
        }

        this.openModal('modal-deck');
    },

    async handleDeckSubmit(event) {
        event.preventDefault();
        const name = document.getElementById('deck-name').value;
        const description = document.getElementById('deck-description').value;

        if (this.currentDeckId) {
            await StorageService.updateDeck(this.currentDeckId, { name, description });
        } else {
            await StorageService.createDeck(name, description);
        }

        this.closeModal('modal-deck');
        this.showView('decks');
    },

    editDeck() {
        this.openDeckModal(this.currentDeckId);
    },

    async deleteDeck() {
        if (!confirm('¿Estás seguro de que deseas eliminar este mazo y todas sus cartas?')) {
            return;
        }

        await StorageService.deleteDeck(this.currentDeckId);
        this.showView('decks');
    },

    openCardModal(cardId = null) {
        this.currentCardId = cardId;
        const modal = document.getElementById('modal-card');
        const title = document.getElementById('modal-card-title');
        const form = document.getElementById('form-card');

        // Clear dynamic fields
        document.getElementById('faces-container').innerHTML = '';
        document.getElementById('examples-container').innerHTML = '';

        if (cardId) {
            title.textContent = 'Editar Carta';
            StorageService.getCard(cardId).then(card => {
                document.getElementById('card-title').value = card.title;
                document.getElementById('card-description').value = card.description;
                document.getElementById('card-image').value = card.imageUrl || '';

                card.faces.forEach(face => this.addFaceField(face));
                card.examples.forEach(example => this.addExampleField(example));
            });
        } else {
            title.textContent = 'Nueva Carta';
            form.reset();
        }

        this.openModal('modal-card');
    },

    addFaceField(value = '') {
        const container = document.getElementById('faces-container');
        const index = container.children.length;
        const div = document.createElement('div');
        div.className = 'dynamic-field';
        div.innerHTML = `
            <textarea placeholder="Contenido de la cara adicional" class="face-input">${value}</textarea>
            <button type="button" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(div);
    },

    addExampleField(value = '') {
        const container = document.getElementById('examples-container');
        const div = document.createElement('div');
        div.className = 'dynamic-field';
        div.innerHTML = `
            <input type="text" placeholder="Ejemplo de uso" class="example-input" value="${value}">
            <button type="button" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(div);
    },

    async handleCardSubmit(event) {
        event.preventDefault();

        const cardData = {
            title: document.getElementById('card-title').value,
            description: document.getElementById('card-description').value,
            imageUrl: document.getElementById('card-image').value,
            faces: Array.from(document.querySelectorAll('.face-input')).map(input => input.value).filter(v => v),
            examples: Array.from(document.querySelectorAll('.example-input')).map(input => input.value).filter(v => v)
        };

        if (this.currentCardId) {
            await StorageService.updateCard(this.currentCardId, cardData);
        } else {
            await StorageService.createCard(this.currentDeckId, cardData);
        }

        this.closeModal('modal-card');
        this.loadDeckDetail();
    },

    editCard(cardId) {
        this.openCardModal(cardId);
    },

    async deleteCard(cardId) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta carta?')) {
            return;
        }

        await StorageService.deleteCard(cardId);
        this.loadDeckDetail();
    },

    // Study modes
    async startStudyMode(mode) {
        this.showView('study');
        
        let initialized = false;
        switch (mode) {
            case 'sequential':
                initialized = await SequentialMode.init(this.currentDeckId);
                if (initialized) SequentialMode.render();
                break;
            case 'quiz':
                initialized = await QuizMode.init(this.currentDeckId);
                if (initialized) QuizMode.render();
                break;
            case 'match':
                initialized = await MatchMode.init(this.currentDeckId);
                if (initialized) MatchMode.render();
                break;
            case 'input':
                initialized = await InputMode.init(this.currentDeckId);
                if (initialized) InputMode.render();
                break;
            case 'memory':
                initialized = await MemoryMode.init(this.currentDeckId);
                if (initialized) MemoryMode.render();
                break;
        }

        if (!initialized) {
            this.showView('deck-detail');
        }
    },

    // Theme
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = savedTheme;
        this.updateThemeIcon(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.body.dataset.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    },

    updateThemeIcon(theme) {
        const icon = document.getElementById('theme-toggle');
        icon.textContent = theme === 'light' ? '🌙' : '☀️';
    },

    // Export/Import
    async exportData() {
        try {
            const jsonData = await StorageService.exportData();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flashcards-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert('Datos exportados correctamente');
        } catch (error) {
            alert('Error al exportar los datos');
            console.error(error);
        }
    },

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            await StorageService.importData(text);
            alert('Datos importados correctamente');
            this.showView('decks');
        } catch (error) {
            alert('Error al importar los datos. Verifica el formato del archivo.');
            console.error(error);
        }
    }
};
