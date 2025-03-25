class CVFormDataCollector {
    constructor() {
        this.formData = {
            personal_info: {},
            education: [],
            experience: [],
            skills: [],
            languages: [],
            certifications: [],
            hobbys: [],
            references: [],
            softwares: [],
            photoBase64: null
        };
    }

    // Helper to clean values
    cleanValue(value) {
        return value === null ? "" : value;
    }

    cleanDict(obj) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            cleaned[key] = this.cleanValue(value);
        }
        return cleaned;
    }

    // Collect personal info
    collectPersonalInfo() {
        const fields = ["first_name", "last_name", "email", "phone", "address", "city", "professional_summary"];
        this.formData.personal_info = fields.reduce((acc, field) => {
            acc[field] = document.querySelector(`[name="${field}"]`)?.value || "";
            return acc;
        }, {});
        return this;
    }

    // Collect skills specifically
    collectSkills() {
        // Target the skills-forms container first, then find all skill inputs within it
        const skillsContainer = document.getElementById('skills-forms');
        if (skillsContainer) {
            this.formData.skills = Array.from(skillsContainer.querySelectorAll('.skill-input'))
                .map(input => {
                    // Only include skills that have a value
                    if (input.value.trim()) {
                        return { skill: input.value };
                    }
                    return null;
                })
                .filter(Boolean);
        }
        return this;
    }

    // Collect languages specifically
    collectLanguages() {
        const languagesContainer = document.getElementById('languages-container');
        if (languagesContainer) {
            // Group language and level inputs by their parent .language-entry
            const languageEntries = languagesContainer.querySelectorAll('.language-entry');

            this.formData.languages = Array.from(languageEntries)
                .map(entry => {
                    const languageInput = entry.querySelector('.language-input');
                    const levelInput = entry.querySelector('.level-input');

                    if (languageInput?.value.trim() || levelInput?.value.trim()) {
                        return {
                            language: languageInput?.value || "",
                            level: levelInput?.value || ""
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        }
        return this;
    }

    // Collect certifications
    collectCertifications() {
        const container = document.getElementById('certifications-container');
        if (container) {
            this.formData.certifications = Array.from(container.querySelectorAll('input[name*="certification"]'))
                .map(input => {
                    if (input.value.trim()) {
                        return { certification: input.value };
                    }
                    return null;
                })
                .filter(Boolean);
        }
        return this;
    }

    // Collect hobbies
    collectHobbies() {
        const container = document.getElementById('hobbies-container');
        if (container) {
            this.formData.hobbys = Array.from(container.querySelectorAll('input[name*="hobby"]'))
                .map(input => {
                    if (input.value.trim()) {
                        return { hobby: input.value };
                    }
                    return null;
                })
                .filter(Boolean);
        }
        return this;
    }

    // Collect software skills
    collectSoftware() {
        const container = document.getElementById('software-container');
        if (container) {
            // Find all software entries
            const softwareEntries = container.querySelectorAll('div');

            this.formData.softwares = Array.from(softwareEntries)
                .map(entry => {
                    const nameInput = entry.querySelector('input[name*="software"]');
                    const levelInput = entry.querySelector('input[name*="level"], select[name*="level"]');

                    if (nameInput?.value.trim()) {
                        return {
                            software: nameInput.value,
                            level: levelInput?.value || ""
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        }
        return this;
    }

    // Collect references
    collectReferences() {
        const container = document.getElementById('references-container');
        if (container) {
            // Look for all divs that might be reference entries
            const referenceEntries = container.querySelectorAll('div');

            this.formData.references = Array.from(referenceEntries)
                .map(entry => {
                    // Find all input elements within this entry
                    const inputs = entry.querySelectorAll('input, textarea');
                    if (inputs.length > 0) {
                        const refObj = {};
                        let hasValue = false;

                        inputs.forEach(input => {
                            // Extract the field name from the input name
                            const fieldMatch = input.name.match(/reference-(\w+)/);
                            if (fieldMatch && fieldMatch[1]) {
                                const fieldName = fieldMatch[1];
                                refObj[fieldName] = input.value;
                                if (input.value.trim()) hasValue = true;
                            }
                        });

                        return hasValue ? refObj : null;
                    }
                    return null;
                })
                .filter(Boolean);
        }
        return this;
    }

    // Collect any repeating field dynamically (for education and experience which seem to work)
    collectRepeatingFields(fieldName, selector) {
        const items = document.querySelectorAll(selector);
        this.formData[fieldName] = Array.from(items).map(item => {
            const fieldObj = {};
            const inputs = item.querySelectorAll('input, textarea, select');
            let hasValue = false;

            inputs.forEach(input => {
                const key = input.name.split('-').pop();
                fieldObj[key] = input.value;
                if (input.value.trim()) hasValue = true;
            });

            return hasValue ? this.cleanDict(fieldObj) : null;
        }).filter(Boolean);

        return this;
    }

    // Handle photo upload properly
    async handlePhoto() {
        const photoInput = document.querySelector('[name="photo"]');
        if (photoInput?.files?.length) {
            const file = photoInput.files[0];
            const reader = new FileReader();

            return new Promise(resolve => {
                reader.onload = e => {
                    this.formData.photoBase64 = e.target.result;
                    resolve(this);
                };
                reader.readAsDataURL(file);
            });
        }
        return this;
    }

    // Collect all form data at once
    async collectAllData() {
        this.collectPersonalInfo();

        // Collect education and experience using the existing method
        this.collectRepeatingFields("education", ".education-entry");
        this.collectRepeatingFields("experience", ".experience-entry");

        // Use specialized collectors for the problematic sections
        this.collectSkills()
            .collectLanguages()
            .collectCertifications()
            .collectHobbies()
            .collectSoftware()
            .collectReferences();

        await this.handlePhoto();
        return this;
    }

    // Save to localStorage
    saveToLocalStorage() {
        localStorage.setItem("cv_data", JSON.stringify(this.formData));
        return this;
    }

    // Retrieve stored data
    static getStoredData() {
        const cvData = localStorage.getItem("cv_data");
        return cvData ? JSON.parse(cvData) : null;
    }

    // Redirect to preview after saving
    navigateToPreview() {
        this.saveToLocalStorage();
        window.location.href = "/preview-cv";
    }
}