class CVPreviewLoader {
    constructor() {
        this.cvData = null;
        this.photoBase64 = null;
    }

    // Load data from localStorage
    loadFromLocalStorage() {
        const storedCvData = localStorage.getItem('cv_data');
        this.photoBase64 = localStorage.getItem('photo_base64');

        if (storedCvData) {
            try {
                this.cvData = JSON.parse(storedCvData);
                console.log('Loaded CV data:', this.cvData); // Debug log
                return true;
            } catch (e) {
                console.error('Error parsing CV data from localStorage:', e);
                return false;
            }
        }
        return false;
    }

    // Handle photo display
    displayPhoto() {
        if (this.photoBase64) {
            const photoContainer = document.querySelector('.profile-photo');
            if (photoContainer) {
                // Check if photo container already has an image
                let img = photoContainer.querySelector('img');

                // If not, create one
                if (!img) {
                    img = document.createElement('img');
                    photoContainer.appendChild(img);
                }

                // Set the image source to the base64 data
                img.src = this.photoBase64;
                img.alt = "Profile Photo";
                photoContainer.style.display = 'block';
            }
        }
    }

    // Get a nested property value safely using a path like "personal_info.first_name"
    getNestedValue(obj, path) {
        if (!obj) return '';

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current[key] === undefined) return '';
            current = current[key];
        }

        return current;
    }

    // Special method to handle full name which is combined from first_name and last_name
    getFullName() {
        const firstName = this.getNestedValue(this.cvData, 'personal_info.first_name') || '';
        const lastName = this.getNestedValue(this.cvData, 'personal_info.last_name') || '';
        return `${firstName} ${lastName}`.trim();
    }

    // Populate editable elements based on data attributes
    populateEditableElements() {
        if (!this.cvData) return;

        // Find all editable elements
        const editableElements = document.querySelectorAll('[data-editable="true"]');

        editableElements.forEach(element => {
            const fieldPath = element.getAttribute('data-field');

            // Special case for full name
            if (fieldPath === 'personal_info.full_name') {
                element.textContent = this.getFullName();
            } else {
                // Regular field
                element.textContent = this.getNestedValue(this.cvData, fieldPath);
            }
        });
    }

    // Format date string for display (simple format)
    formatDate(dateStr) {
        if (!dateStr) return '';

        try {
            // Assuming dateStr is in format YYYY-MM-DD or ISO format
            const date = new Date(dateStr);
            return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateStr; // Return original if parsing fails
        }
    }

    // Populate experience section
    populateExperienceSection() {
        if (!this.cvData || !this.cvData.experience || !this.cvData.experience.length) return;

        const experienceList = document.querySelector('.experience-list');
        if (!experienceList) return;

        // Clear existing content
        experienceList.innerHTML = '';

        // Loop through experience items and create elements
        this.cvData.experience.forEach((exp, index) => {
            const expItem = document.createElement('div');
            expItem.className = 'experience-item';

            // Format dates
            const startDate = this.formatDate(exp.start_date);
            const endDate = exp.current === '1' ? 'Présent' : this.formatDate(exp.end_date);

            expItem.innerHTML = `
                <div class="experience-header">
                    <h3 class="position"
                        data-editable="true"
                        data-field="experience.${index}.position"
                        data-parent="experience"
                        contenteditable="true">${exp.position || ''}</h3>
                    <div class="date-range">
                        <i class="icon-calendar"></i>
                        <span data-editable="true"
                            data-field="experience.${index}.start_date"
                            data-parent="experience"
                            contenteditable="true">${startDate}</span> -
                        <span data-editable="true"
                            data-field="experience.${index}.end_date"
                            data-parent="experience"
                            contenteditable="true">${endDate}</span>
                    </div>
                </div>
                <div class="company-info">
                    <span class="company-name"
                        data-editable="true"
                        data-field="experience.${index}.company"
                        data-parent="experience"
                        contenteditable="true">${exp.company || ''}</span>
                    <div class="location">
                        <i class="icon-location"></i>
                        <span data-editable="true"
                            data-field="experience.${index}.location"
                            data-parent="experience"
                            contenteditable="true">${exp.location || ''}</span>
                    </div>
                </div>
                <p class="experience-description"
                    data-editable="true"
                    data-field="experience.${index}.description_"
                    data-parent="experience"
                    contenteditable="true">${exp.description_ || ''}</p>
            `;

            experienceList.appendChild(expItem);
        });
    }

    // Populate education section
    populateEducationSection() {
        if (!this.cvData || !this.cvData.education || !this.cvData.education.length) return;

        const educationList = document.querySelector('.education-list');
        if (!educationList) return;

        // Clear existing content
        educationList.innerHTML = '';

        // Loop through education items and create elements
        this.cvData.education.forEach((edu, index) => {
            const eduItem = document.createElement('div');
            eduItem.className = 'education-item';

            // Format dates
            const startDate = this.formatDate(edu.start_date);
            const endDate = edu.current === '1' ? 'Présent' : this.formatDate(edu.end_date);

            eduItem.innerHTML = `
                <div class="education-header">
                    <h3 class="degree"
                        data-editable="true"
                        data-field="education.${index}.degree"
                        data-parent="education"
                        contenteditable="true">${edu.degree || ''}</h3>
                    <div class="date-range">
                        <i class="icon-calendar"></i>
                        <span data-editable="true"
                            data-field="education.${index}.start_date"
                            data-parent="education"
                            contenteditable="true">${startDate}</span> -
                        <span data-editable="true"
                            data-field="education.${index}.end_date"
                            data-parent="education"
                            contenteditable="true">${endDate}</span>
                    </div>
                </div>
                <div class="institution-info">
                    <span class="institution-name"
                        data-editable="true"
                        data-field="education.${index}.institution"
                        data-parent="education"
                        contenteditable="true">${edu.institution || ''}</span>
                    <span class="field-of-study"
                        data-editable="true"
                        data-field="education.${index}.field_of_study"
                        data-parent="education"
                        contenteditable="true">${edu.field_of_study || ''}</span>
                </div>
            `;

            educationList.appendChild(eduItem);
        });
    }

    // Populate lists (skills, languages, etc.)
    populateListSection(sectionSelector, dataKey) {
        if (!this.cvData || !this.cvData[dataKey] || !this.cvData[dataKey].length) return;

        const sectionElement = document.querySelector(sectionSelector);
        if (!sectionElement) return;

        // Find the list container within the section
        const listContainer = sectionElement.querySelector(`.${dataKey.replace(/s$/, '')}-list`);
        if (!listContainer) return;

        // Clear existing content
        listContainer.innerHTML = '';

        // Loop through data items and create elements
        this.cvData[dataKey].forEach((item, index) => {
            const listItem = document.createElement('div');
            listItem.className = `${dataKey.replace(/s$/, '')}-item`;

            // Create content based on the data type
            if (dataKey === 'skills') {
                listItem.innerHTML = `
                    <span class="skill-name"
                        data-editable="true"
                        data-field="${dataKey}.${index}.name"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.name || ''}</span>
                    <div class="skill-level" data-level="${item.level || 0}"></div>
                `;
            } else if (dataKey === 'languages') {
                listItem.innerHTML = `
                    <span class="language-name"
                        data-editable="true"
                        data-field="${dataKey}.${index}.name"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.name || ''}</span>
                    <div class="language-level" data-level="${item.level || 0}"></div>
                `;
            } else if (dataKey === 'certifications') {
                listItem.innerHTML = `
                    <span
                        data-editable="true"
                        data-field="${dataKey}.${index}.name"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.name || ''}</span>
                `;
            } else if (dataKey === 'hobbies') {
                listItem.innerHTML = `
                    <span
                        data-editable="true"
                        data-field="${dataKey}.${index}.name"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.name || ''}</span>
                `;
            } else if (dataKey === 'software') {
                listItem.innerHTML = `
                    <span class="software-name"
                        data-editable="true"
                        data-field="${dataKey}.${index}.name"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.name || ''}</span>
                    <div class="software-level" data-level="${item.level || 0}"></div>
                `;
            } else if (dataKey === 'references') {
                listItem.innerHTML = `
                    <div class="reference-name"
                        data-editable="true"
                        data-field="${dataKey}.${index}.name"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.name || ''}</div>
                    <div class="reference-title"
                        data-editable="true"
                        data-field="${dataKey}.${index}.title"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.title || ''}</div>
                    <div class="reference-contact"
                        data-editable="true"
                        data-field="${dataKey}.${index}.contact"
                        data-parent="${dataKey}"
                        contenteditable="true">${item.contact || ''}</div>
                `;
            }

            listContainer.appendChild(listItem);
        });
    }

    // Show/hide sections based on whether they have content
    toggleSectionVisibility() {
        // Check if professional summary exists
        const summarySection = document.querySelector('.summary-section');
        if (summarySection) {
            const summaryContent = this.getNestedValue(this.cvData, 'personal_info.professional_summary');
            summarySection.style.display = summaryContent ? 'block' : 'none';
        }

        // Other sections that might need to be hidden if empty
        const sections = [
            { selector: '.experience-section', dataKey: 'experience' },
            { selector: '.education-section', dataKey: 'education' },
            { selector: '.skills-section', dataKey: 'skills' },
            { selector: '.languages-section', dataKey: 'languages' },
            { selector: '.software-section', dataKey: 'software' },
            { selector: '.certifications-section', dataKey: 'certifications' },
            { selector: '.hobbies-section', dataKey: 'hobbies' },
            { selector: '.references-section', dataKey: 'references' }
        ];

        sections.forEach(section => {
            const sectionElement = document.querySelector(section.selector);
            if (sectionElement) {
                const hasData = this.cvData && this.cvData[section.dataKey] && this.cvData[section.dataKey].length > 0;
                sectionElement.style.display = hasData ? 'block' : 'none';
            }
        });
    }

    // Main method to load and display all data
    initialize() {
        const dataLoaded = this.loadFromLocalStorage();

        if (!dataLoaded) {
            console.error('No CV data found in localStorage');
            // You might want to redirect back to the form here
            return false;
        }

        // Display photo if available
        this.displayPhoto();

        // Populate all editable elements
        this.populateEditableElements();

        // Populate structured sections
        this.populateExperienceSection();
        this.populateEducationSection();

        // Populate list sections
        this.populateListSection('.skills-section', 'skills');
        this.populateListSection('.languages-section', 'languages');
        this.populateListSection('.software-section', 'software');
        this.populateListSection('.certifications-section', 'certifications');
        this.populateListSection('.hobbies-section', 'hobbies');
        this.populateListSection('.references-section', 'references');

        // Show/hide sections based on content
        this.toggleSectionVisibility();

        return true;
    }
}