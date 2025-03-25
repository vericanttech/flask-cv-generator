class NavigationWarning {
    constructor() {
        this.translations = typeof cvTranslations !== 'undefined' ? cvTranslations : {};
        this.setupEventListeners();
        this.setupBackButtonInterception();
    }

    setupEventListeners() {
        // Handle beforeunload event for browser's native warning
        this.beforeUnloadHandler = (e) => {
            const message = this.translations.warningMessage || 'Si vous quittez cette page, toutes les modifications seront perdues.';
            e.returnValue = message;
            return message;
        };

        // Initially add the event listener
        if (this.isPreviewCvPage()) {
            window.addEventListener('beforeunload', this.beforeUnloadHandler);
        }

        // Handle link clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (!target) return;

            // Get current route and destination route without domain
            const currentPath = window.location.pathname;
            const destinationUrl = new URL(target.href, window.location.origin);
            const destinationPath = destinationUrl.pathname;

            // Check if we should show warning
            if (this.shouldShowWarning(currentPath, destinationPath)) {
                e.preventDefault();

                // Use browser's native confirm dialog
                if (confirm(this.translations.warningMessage || 'Si vous quittez cette page, toutes les modifications seront perdues.')) {
                    // If user confirms, remove the beforeunload handler and navigate
                    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
                    window.location.href = target.href;
                }
            } else if (currentPath.includes('/preview-cv')) {
                // For allowed navigation from preview-cv, remove the beforeunload handler
                window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            }
        });
    }

    setupBackButtonInterception() {
        // Save current state
        history.pushState(null, '', window.location.href);

        window.addEventListener('popstate', (e) => {
            const currentPath = window.location.pathname;

            // Only handle back button on preview-cv page
            if (this.isPreviewCvPage()) {
                // Get the previous page from referrer (might not always work)
                const referrerUrl = document.referrer ? new URL(document.referrer) : null;
                const referrerPath = referrerUrl ? referrerUrl.pathname : '';

                // Check if we should show warning
                if (this.shouldShowWarning(currentPath, referrerPath)) {
                    // Use browser's native confirm dialog
                    if (confirm(this.translations.warningMessage || 'Si vous quittez cette page, toutes les modifications seront perdues.')) {
                        // If user confirms, remove the handler and allow navigation
                        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
                        history.back();
                    } else {
                        // If user cancels, push state to prevent navigation
                        history.pushState(null, '', window.location.href);
                    }
                } else {
                    // For allowed navigation, remove the beforeunload handler
                    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
                }
            }
        });
    }

    isPreviewCvPage() {
        return window.location.pathname.includes('/preview-cv');
    }

    shouldShowWarning(currentPath, destinationPath) {
        // Only show warning when navigating from preview-cv to create-cv
        return currentPath.includes('/preview-cv') &&
               destinationPath.includes('/create-cv') &&
               !destinationPath.includes('/payment-page');
    }
}

