// Main Application Entry Point
(async function() {
    'use strict';

    // Initialize the database
    try {
        await db.init();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        alert('Error al inicializar la base de datos. Por favor, recarga la página.');
        return;
    }

    // Initialize SRS system
    await SRSSystem.init();

    // Initialize UI
    UI.init();

    // Show home view
    UI.showView('home');

    console.log('FlashCards app loaded successfully');
})();
