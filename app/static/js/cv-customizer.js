class CVCustomizer {
    constructor() {
        this.customizeBtn = document.getElementById('customizeForJob');
        this.jobDescContainer = document.querySelector('.job-description-container');
        this.customizationStatus = document.querySelector('.customization-status');
        this.cancelBtn = document.getElementById('cancelCustomization');
        this.processBtn = document.getElementById('processCustomization');
        this.jobDescInput = document.getElementById('jobDescription');
        this.careerGoalsInput = document.getElementById('careerGoals');

        // Translations for error messages
        this.cvTranslations = window.cvTranslations || {
            jobDescriptionRequired: 'Une description du poste est requise',
            customizationSuccess: 'Votre CV a été adapté avec succès pour ce poste!',
            customizationError: 'Erreur lors de la personnalisation du CV: '
        };

        this.init();
    }

    init() {
        if (!this.customizeBtn) return;

        this.customizeBtn.addEventListener('click', () => this.showJobDescriptionForm());
        this.cancelBtn.addEventListener('click', () => this.hideJobDescriptionForm());
        this.processBtn.addEventListener('click', () => this.customizeCV());
    }

    showJobDescriptionForm() {
        this.jobDescContainer.style.display = 'block';

        // Scroll to the top of the page to ensure form visibility
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // This gives a smooth scrolling effect
        });
    }

    hideJobDescriptionForm() {
        this.jobDescContainer.style.display = 'none';
        this.jobDescInput.value = '';
        this.careerGoalsInput.value = '';
    }

    async customizeCV() {
        const jobDescription = this.jobDescInput.value.trim();
        const careerGoals = this.careerGoalsInput.value.trim();

        if (!jobDescription) {
            alert(this.cvTranslations.jobDescriptionRequired);
            return;
        }

        try {
            // Hide form, show loading status
            this.jobDescContainer.style.display = 'none';
            this.customizationStatus.style.display = 'flex';

            // Get current CV data
            const cvData = this.collectCurrentCVData();

            // Send to backend
            const response = await fetch('/customize-cv-for-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobDescription: jobDescription,
                    careerGoals: careerGoals,
                    cvData: cvData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to customize CV');
            }

            const data = await response.json();

            // Update the CV with new content
            this.updateCVWithCustomizedData(data.customizedCV);

            // Hide loading status
            this.customizationStatus.style.display = 'none';

            // Show success message
            alert(this.cvTranslations.customizationSuccess);

        } catch (error) {
            console.error('CV customization failed:', error);
            this.customizationStatus.style.display = 'none';
            alert(this.cvTranslations.customizationError + error.message);
        }
    }

    collectCurrentCVData() {
        // Similar to the save function but just returns the data without saving
        const editableElements = document.querySelectorAll('[data-editable="true"]');
        const completeData = {
            personal_info: {},
            education: [],
            experience: [],
            skills: [],
            languages: [],
            certifications: [],
            hobbys: [],
            references: [],
            softwares: []
        };

        // Collect all fields by parent type
        editableElements.forEach(el => {
            const field = el.getAttribute('data-field');
            const parentKey = el.getAttribute('data-parent');
            const value = el.textContent.trim();

            // Handle array items (identified by index in data-field)
            if (field.includes('.')) {
                const [section, fieldPath] = field.split('.');

                // Check if this is an array item with index
                const indexMatch = fieldPath.match(/^(\d+)\.(.+)$/);
                if (indexMatch) {
                    // Array item with nested property
                    const index = parseInt(indexMatch[1]);
                    const property = indexMatch[2];

                    // Ensure array has enough items
                    while (completeData[parentKey].length <= index) {
                        completeData[parentKey].push({});
                    }

                    completeData[parentKey][index][property] = value;
                } else if (/^\d+$/.test(fieldPath)) {
                    // Direct array index
                    const index = parseInt(fieldPath);

                    // For simple array values
                    while (completeData[parentKey].length <= index) {
                        completeData[parentKey].push({});
                    }

                    // Get field name from the last part of the data-field attribute
                    const lastDotIndex = field.lastIndexOf('.');
                    const propertyName = field.substring(lastDotIndex + 1);

                    // Extract the actual property name (not the index)
                    const actualProperty = propertyName.includes('.') ?
                        propertyName.substring(propertyName.indexOf('.') + 1) :
                        propertyName;

                    completeData[parentKey][index][actualProperty] = value;
                } else {
                    // Simple nested property like personal_info.email
                    completeData[parentKey][fieldPath] = value;
                }
            } else {
                // Direct property
                completeData[parentKey] = value;
            }
        });

        // Special handling for full name
        const fullNameEl = document.querySelector('[data-field="personal_info.full_name"]');
        if (fullNameEl) {
            const nameParts = fullNameEl.textContent.trim().split(' ');
            completeData.personal_info.first_name = nameParts.slice(0, -1).join(' ');
            completeData.personal_info.last_name = nameParts[nameParts.length - 1];
        }

        return completeData;
    }

    updateCVWithCustomizedData(customizedData) {
        // Update each editable element with the new data
        const editableElements = document.querySelectorAll('[data-editable="true"]');

        editableElements.forEach(el => {
            const field = el.getAttribute('data-field');
            const parentKey = el.getAttribute('data-parent');

            // Skip if no field attribute
            if (!field) return;

            // Logic to extract the proper value from customizedData based on field path
            if (field.includes('.')) {
                const [section, fieldPath] = field.split('.');

                // Check if this is an array item with index
                const indexMatch = fieldPath.match(/^(\d+)\.(.+)$/);
                if (indexMatch) {
                    // Array item with nested property
                    const index = parseInt(indexMatch[1]);
                    const property = indexMatch[2];

                    // Check if the array and index exist in customized data
                    if (customizedData[parentKey] &&
                        Array.isArray(customizedData[parentKey]) &&
                        customizedData[parentKey][index] &&
                        customizedData[parentKey][index][property] !== undefined) {

                        let text = customizedData[parentKey][index][property];
                        if (typeof text === 'string') {
                            text = text.replace(/\*/g, '\n');
                        }
                        el.textContent = text;
                    }
                } else if (/^\d+$/.test(fieldPath)) {
                    // Direct array index
                    const index = parseInt(fieldPath);

                    // Get field name from the last part of the data-field attribute
                    const lastDotIndex = field.lastIndexOf('.');
                    const propertyName = field.substring(lastDotIndex + 1);

                    // Extract the actual property name (not the index)
                    const actualProperty = propertyName.includes('.') ?
                        propertyName.substring(propertyName.indexOf('.') + 1) :
                        propertyName;

                    // Check if the array and index exist in customized data
                    if (customizedData[parentKey] &&
                        Array.isArray(customizedData[parentKey]) &&
                        customizedData[parentKey][index] &&
                        customizedData[parentKey][index][actualProperty] !== undefined) {

                        let text = customizedData[parentKey][index][actualProperty];
                        if (typeof text === 'string') {
                            text = text.replace(/\*/g, '\n');
                        }
                        el.textContent = text;
                    }
                } else {
                    // Simple nested property like personal_info.email
                    if (customizedData[parentKey] &&
                        customizedData[parentKey][fieldPath] !== undefined) {

                        let text = customizedData[parentKey][fieldPath];
                        if (typeof text === 'string') {
                            text = text.replace(/\*/g, '\n');
                        }
                        el.textContent = text;
                    }
                }
            } else {
                // Direct property
                if (customizedData[parentKey] !== undefined) {
                    let text = customizedData[parentKey];
                    if (typeof text === 'string') {
                        text = text.replace(/\*/g, '\n');
                    }
                    el.textContent = text;
                }
            }
        });

        // Special handling for full name if present in customized data
        if (customizedData.personal_info &&
            customizedData.personal_info.first_name &&
            customizedData.personal_info.last_name) {

            const fullNameEl = document.querySelector('[data-field="personal_info.full_name"]');
            if (fullNameEl) {
                fullNameEl.textContent = `${customizedData.personal_info.first_name} ${customizedData.personal_info.last_name}`;
            }
        }

        // After updating CV data, call the CVSaver's save method
        if (window.cvSaver) {
            window.cvSaver.saveChanges();
        } else {
            // Create a temporary CVSaver instance and call save
            const saver = new CVSaver();
            saver.saveChanges();
        }
    }
}

