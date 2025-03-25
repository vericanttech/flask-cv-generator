class CVSaver {
    constructor() {
        this.saveChangesBtn = document.getElementById('saveChanges');
        this.editableElements = document.querySelectorAll('[data-editable="true"]');

        this.init();
    }

    init() {
        if (!this.saveChangesBtn) return;

        this.saveChangesBtn.addEventListener('click', () => this.saveChanges());
    }

    saveChanges() {
        // Create a new data structure from scratch
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
        this.editableElements.forEach(el => {
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

        // Send to server
        fetch('/save-cv-edits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(completeData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') {
                alert(cvTranslations.saveError + (data.message || cvTranslations.unknownError));
            }
        })
        .catch(error => {
            console.error(cvTranslations.saveError, error);
            alert(cvTranslations.saveError + error.message);
        });
    }
}