// Translation object to handle internationalization
const cvTranslations = {
    editCV: document.getElementById('editMode')?.textContent || 'Modifier le CV',
    quitEditMode: 'Quitter le mode édition',
    generatingCV: 'Génération du CV',
    errorRetry: 'Erreur - Réessayez',
    saveSuccess: 'Modifications enregistrées avec succès!',
    saveError: "Erreur lors de l'enregistrement des modifications : ",
    unknownError: 'Erreur inconnue',
    jobDescriptionRequired: 'Veuillez remplir la description du poste',
    customizationSuccess: 'CV personnalisé avec succès!',
    customizationError: 'Erreur lors de la personnalisation du CV : '
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all the components
    const cvEditor = new CVEditor();
    window.cvSaver = new CVSaver();
    const cvExporter = new CVExporter();
    const cvCustomizer = new CVCustomizer();
    // Initialize CV preview loader
    const previewLoader = new CVPreviewLoader();
    const initialized = previewLoader.initialize();

    if (!initialized) {
        alert('Aucune donnée de CV trouvée. Veuillez remplir le formulaire d\'abord.');
    }
});
