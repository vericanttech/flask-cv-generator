class CVExporter {
    constructor() {
        this.downloadBtn = document.getElementById('downloadCV');
        this.originalText = this.downloadBtn ? this.downloadBtn.textContent : '';

        this.init();
    }

    init() {
        if (!this.downloadBtn) return;

        this.downloadBtn.addEventListener('click', () => this.generatePDF());
    }

    updateButtonState(isLoading, text) {
        this.downloadBtn.textContent = text;
        this.downloadBtn.disabled = isLoading;
        this.downloadBtn.style.opacity = isLoading ? '0.8' : '1';

        // Clear existing spinner
        const existingSpinner = this.downloadBtn.querySelector('.spinner');
        if (existingSpinner) {
            existingSpinner.remove();
        }

        if (isLoading) {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            this.downloadBtn.appendChild(spinner);
        }
    }

    showLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${cvTranslations.generatingCV}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }

    async generatePDF() {
        try {
            this.updateButtonState(true, cvTranslations.generatingCV);
            this.showLoadingOverlay();

            const cvSaver = new CVSaver();

            const saveResult = await new Promise((resolve, reject) => {
                const originalFetch = window.fetch;

                window.fetch = function(url, options) {
                    if (url === '/save-cv-edits') {
                        return originalFetch(url, options)
                            .then(response => response.json())
                            .then(data => {
                                if (data.status === 'success') {
                                    resolve(true);
                                } else {
                                    reject(new Error(data.message || cvTranslations.unknownError));
                                }
                                return { json: () => data };
                            })
                            .catch(error => {
                                reject(error);
                                throw error;
                            });
                    }
                    return originalFetch(url, options);
                };

                cvSaver.saveChanges();

                setTimeout(() => {
                    window.fetch = originalFetch;
                }, 500);
            });

            const response = await fetch('/process-pdf', {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate CV');
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = '/preview-pdf';
                }
            } else {
                window.location.href = '/preview-pdf';
            }

            // Restore button state on success
            //this.updateButtonState(false, this.originalText);
            //this.hideLoadingOverlay();

        } catch (error) {
            console.error('CV generation failed:', error);
            this.updateButtonState(false, cvTranslations.errorRetry);
            this.hideLoadingOverlay();

            setTimeout(() => {
                this.updateButtonState(false, this.originalText);
            }, 3000);
        }
    }
}