function addDeleteButton(container) {
    const deleteButtons = container.getElementsByClassName('delete-field');
    for (const button of deleteButtons) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const fieldEntry = this.closest('.field-entry');
            if (fieldEntry) {
                fieldEntry.remove();
            }
        });
    }
}


// Hide the resume text at start
document.addEventListener('DOMContentLoaded', function() {
    // Hide the textarea and its label
    const textareaLabel = document.querySelector('label[for="professional_summary"]');
    const textarea = document.querySelector('textarea[name="professional_summary"]');

    if (textareaLabel) textareaLabel.style.display = 'none';
    if (textarea) textarea.style.display = 'none';

});



document.addEventListener('DOMContentLoaded', function() {
    // Hide all experience description textareas and labels
    const experienceEntries = document.querySelectorAll('.experience-entry');
    experienceEntries.forEach(entry => {
        const descriptionLabel = entry.querySelector('label[for*="description_"]');
        const descriptionTextarea = entry.querySelector('textarea[name*="description_"]');

        if (descriptionLabel) descriptionLabel.style.display = 'none';
        if (descriptionTextarea) descriptionTextarea.style.display = 'none';
    });

});

// Create a reusable function to show loading state
function showLoadingState(button) {
    // Store the original button content
    const originalButtonContent = button.innerHTML;

    // Replace with spinner and animated dots
    button.innerHTML = `
        <div class="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25" stroke="currentColor" fill="none"></circle>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill-opacity="0.25"></path>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" stroke="currentColor" fill="none"></path>
            </svg>
            <span class="loading-dots">Loading</span>
        </div>
    `;

    // Disable the button
    button.disabled = true;

    return originalButtonContent; // Return original content for later restoration
}

// Function to restore button's original state
function restoreButtonState(button, originalContent) {
    button.innerHTML = originalContent;
    button.disabled = false;
}

// Ensure the CSS is added just once
function addLoadingDotsStyle() {
    if (!document.getElementById('loading-dots-style')) {
        const style = document.createElement('style');
        style.id = 'loading-dots-style';
        style.textContent = `
            .loading-dots:after {
                content: '.';
                animation: dots 1.5s steps(5, end) infinite;
            }

            @keyframes dots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60% { content: '...'; }
                80%, 100% { content: ''; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Call this once in your script
addLoadingDotsStyle();



document.getElementById('add-education').addEventListener('click', function() {
    const container = document.getElementById('education-forms');

    showLoading(container); // Show loader

    fetch('/add-field/education')
        .then(response => response.text())
        .then(html => {
            const index = container.children.length;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const formFields = tempDiv.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                const oldName = field.name;
                const newName = `education-${index}-${oldName}`;
                field.name = newName;
                field.id = newName;

                if (field.type === 'date' || field.id.endsWith('-start_date') || field.id.endsWith('-end_date')) {
                    field.classList.add('new-date-picker');
                }
            });

            hideLoading(container); // Remove loader before adding content
            container.appendChild(tempDiv.firstElementChild);

            addDeleteButton(container);
            initializeDatePickers('.new-date-picker');
        })
        .catch(error => {
            console.error('Error loading the field:', error);
            hideLoading(container); // Ensure loader is removed on error
            alert('Failed to load education field. Please try again.');
        });
});


// Modify your addField function
function addField(containerId, fieldType) {
    const container = document.getElementById(containerId);
    const index = container.children.length;

    showLoading(container); // Show loader

    fetch(`/add-field/${fieldType}`)
        .then(response => response.text())
        .then(html => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const formFields = tempDiv.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                const oldName = field.name;
                const newName = `${fieldType}s-${index}-${oldName}`;
                field.name = newName;
                field.id = newName;
                if (field.type === 'date' || field.id.endsWith('-date')) {
                  field.classList.add('new-date-picker');
                }
            });

            hideLoading(container); // Remove loader

            const newField = tempDiv.firstElementChild;
            container.appendChild(newField);
            initializeDatePickers('.new-date-picker');

            const newHobbyInput = newField.querySelector('.hobby-input');
            if (newHobbyInput) {
                addHobbyDropdown(newHobbyInput);
            }

            addDeleteButton(container);
        })
        .catch(error => {
            console.error(`Error loading ${fieldType} field:`, error);
            hideLoading(container);
            alert(`Failed to load ${fieldType} field. Please try again.`);
        });
}

// Modify your event listeners to pass proper container IDs
document.getElementById('add-certification').addEventListener('click', function() {
    addField('certifications-container', 'certification');
});

document.getElementById('add-hobby').addEventListener('click', function() {
    addField('hobbies-container', 'hobby');
});

document.getElementById('add-reference').addEventListener('click', function() {
    addField('references-container', 'reference');
});

document.getElementById('add-software').addEventListener('click', function() {
    addField('software-container', 'software');
});


function addHobbyDropdown(input) {
    const dropdown = input.nextElementSibling;
    const options = dropdown.querySelectorAll('.hobby-option');

    input.addEventListener('focus', function() {
        dropdown.classList.remove('hidden');
    });

    input.addEventListener('blur', function() {
        setTimeout(function() {
            dropdown.classList.add('hidden');
        }, 200);
    });

    options.forEach(function(option) {
        option.addEventListener('click', function() {
            input.value = this.dataset.hobby;
            dropdown.classList.add('hidden');
        });
    });
}


document.getElementById('add-experience').addEventListener('click', function() {
    const container = document.getElementById('experience-forms');

    showLoading(container); // Show loader
    fetch('/add-field/experience')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('experience-forms');
            const index = container.children.length;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const formFields = tempDiv.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                const oldName = field.name;
                const newName = `experience-${index}-${oldName}`;
                field.name = newName;
                field.id = newName;
                if (field.type === 'date' || field.id.endsWith('-start_date') || field.id.endsWith('-end_date')) {
                  field.classList.add('new-date-picker');
                }
            });


            hideLoading(container); // Remove loader before adding content

            container.appendChild(tempDiv.firstElementChild);

            initializeDatePickers('.new-date-picker');

            // Get the newly added entry
            const newEntry = container.lastElementChild;

            // Hide the description label and textarea in the new entry
            const descriptionLabel = newEntry.querySelector('label[for*="description_"]');
            const descriptionTextarea = newEntry.querySelector('textarea[name*="description_"]');

            if (descriptionLabel) descriptionLabel.style.display = 'none';
            if (descriptionTextarea) descriptionTextarea.style.display = 'none';

            // Set up the button and textarea relationship
            const generateButton = newEntry.querySelector('.generate-experience-content');
            if (generateButton) {
                generateButton.setAttribute('data-index', index);
            }

            addDeleteButton(container);
            setupCurrentPositionToggle();
        });
});

// Skill fields - refactored with proper indexing
document.getElementById('add-skill').addEventListener('click', function() {

    const container = document.getElementById('skills-forms');

    showLoading(container); // Show loader
    fetch('/add-field/skill')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('skills-forms');
            const index = container.children.length;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const formFields = tempDiv.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                const oldName = field.name;
                const newName = `skills-${index}-${oldName}`;
                field.name = newName;
                field.id = newName;
            });

            const newField = tempDiv.firstElementChild;
            container.appendChild(newField);

            const newSkillInput = newField.querySelector('.skill-input');
            if (newSkillInput) {
                addSkillDropdown(newSkillInput);
            }

            hideLoading(container); // Remove loader before adding content

            addDeleteButton(container);
        });
});


document.getElementById('add-language').addEventListener('click', function() {
    const container = document.getElementById('languages-container');

    showLoading(container); // Show loader
    fetch('/add-field/language')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('languages-container');
            const index = container.children.length;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const formFields = tempDiv.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                const oldName = field.name;
                const newName = `languages-${index}-${oldName}`;
                field.name = newName;
                field.id = newName;
            });

            hideLoading(container); // Remove loader before adding content

            const newField = tempDiv.firstElementChild; // Get the actual new field element
            container.appendChild(newField);

            const newLanguageInput = newField.querySelector('.language-input');
            const newLevelInput = newField.querySelector('.level-input');

            if (newLanguageInput) {
                addLanguageDropdown(newLanguageInput);
            }
            if (newLevelInput) {
                addLevelDropdown(newLevelInput);
            }

            addDeleteButton(container);
        });
});




// Initialize delete buttons for existing fields when page loads
document.addEventListener('DOMContentLoaded', function() {
    const containers = [
        'education-forms',
        'experience-forms',
        'skills-forms',
        'languages-container',
        'certifications-container',
        'hobbies-container',
        'references-container' ,
        'software-container'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            addDeleteButton(container);
        }
    });
});

// toggle button for is-current
document.addEventListener('DOMContentLoaded', function() {
    // Apply the logic to existing experience entries
    setupCurrentPositionToggle();

    // Set up event listener for the "Add Experience" button
    document.getElementById('add-experience').addEventListener('click', function() {
        // Wait a bit for the new entry to be added to the DOM
        setTimeout(setupCurrentPositionToggle, 100);
    });
});

function setupCurrentPositionToggle() {
    // Get all checkboxes with the current-position-checkbox class
    const currentCheckboxes = document.querySelectorAll('.current-position-checkbox');

    currentCheckboxes.forEach(checkbox => {
        // Find the closest experience entry
        const experienceEntry = checkbox.closest('.experience-entry');
        const endDateField = experienceEntry.querySelector('.end-date-field');
        const presentText = experienceEntry.querySelector('.present-text');

        // Set initial state
        updateEndDateState(checkbox, endDateField, presentText);

        // Add change event listener
        checkbox.addEventListener('change', function() {
            updateEndDateState(this, endDateField, presentText);
        });
    });
}

function updateEndDateState(checkbox, endDateField, presentText) {
    if (checkbox.checked) {
        endDateField.disabled = true;
        endDateField.classList.add('bg-gray-100');
        endDateField.value = ''; // Clear the end date
        presentText.classList.remove('hidden');
        presentText.classList.add('inline-block'); // Ensure it stays inline
    } else {
        endDateField.disabled = false;
        endDateField.classList.remove('bg-gray-100');
        presentText.classList.add('hidden');
    }
}

// Replace the professional summary generation event listener
document.getElementById('generate-content').addEventListener('click', function() {
    const button = this;
    const professionalSummaryField = document.querySelector('textarea[name="professional_summary"]');
    const firstNameField = document.querySelector('input[name="first_name"]');
    const lastNameField = document.querySelector('input[name="last_name"]');
    const modal = document.getElementById('guidanceModal');
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Handle modal interactions
    const handleSubmit = async () => {
        const guidance = document.getElementById('guidanceText').value.trim();

        if (!guidance) {
            alert('Veuillez fournir quelques informations pour personnaliser votre résumé.');
            return;
        }

        // Close modal
        modal.classList.add('hidden');
        modal.classList.remove('flex');

        // Apply loading state and store original content
        const originalButtonContent = showLoadingState(button);

        // Remove button styling
        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        button.classList.add('bg-gray-400');

        // Show the textarea and its label when the button is clicked
        const textareaLabel = document.querySelector('label[for="professional_summary"]');
        const textarea = document.querySelector('textarea[name="professional_summary"]');

        if (textareaLabel) textareaLabel.style.display = 'block';
        if (textarea) textarea.style.display = 'block';

        // Clear existing content
        professionalSummaryField.value = '';

        // Prepare data for the request
        const summaryData = {
            first_name: firstNameField.value.trim(),
            last_name: lastNameField.value.trim(),
            guidance: guidance,
            ui_lang: document.documentElement.lang || document.querySelector('html').getAttribute('lang') || 'fr'
        };

        try {
            const response = await fetch('/generate-professional-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                credentials: 'same-origin',  // Add this line to send cookies with the request
                body: JSON.stringify(summaryData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();

            function processStream() {
                return reader.read().then(({done, value}) => {
                    if (done) {
                        restoreButtonState(button, originalButtonContent
                        );
                        button.classList.replace('bg-gray-400', 'bg-green-600');
                        button.classList.add('hover:bg-green-700');
                        return;
                    }

                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.summary) {
                                    professionalSummaryField.value = data.summary;
                                }
                            } catch (e) {
                                console.warn('Error parsing chunk:', e);
                            }
                        }
                    });

                    return processStream();
                });
            }

            return processStream();
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            restoreButtonState(button, 'Générer');
            button.classList.remove('bg-gray-400');
            button.classList.add('bg-blue-600', 'hover:bg-blue-700');
            alert('Une erreur est survenue lors de la génération du résumé professionnel.');
        }
    };

    // Set up modal event listeners
    document.getElementById('submitGuidance').addEventListener('click', handleSubmit);
    document.getElementById('cancelGuidance').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
});

// Generate experience description
document.getElementById('experience-forms').addEventListener('click', function(event) {
    if (event.target.classList.contains('generate-experience-content')) {
        const button = event.target;
        const experienceEntry = button.closest('.experience-entry');
        const descriptionLabel = experienceEntry.querySelector('label[for*="description_"]');
        const descriptionTextarea = experienceEntry.querySelector('textarea[name*="description_"]');

        // Get experience data from the form fields
        const companyField = experienceEntry.querySelector('input[name*="company"]');
        const positionField = experienceEntry.querySelector('input[name*="position"]');
        const startDateField = experienceEntry.querySelector('input[name*="start_date"]');
        const endDateField = experienceEntry.querySelector('input[name*="end_date"]');
        const isCurrentCheckbox = experienceEntry.querySelector('input[name*="is_current"]');

        // Validate required fields
        if (!companyField.value.trim() || !positionField.value.trim()) {
            alert('Veuillez remplir au moins le nom de l\'entreprise et le poste avant de générer une description.');
            return;
        }

        // Show the description label and textarea
        if (descriptionLabel) descriptionLabel.style.display = 'block';
        if (descriptionTextarea) descriptionTextarea.style.display = 'block';

        // Store the original button content and show loading state
        const originalContent = showLoadingState(button);

        // Clear existing content
        descriptionTextarea.value = '';

        // Create data object to send to backend
        const experienceData = {
            company: companyField.value.trim(),
            position: positionField.value.trim(),
            start_date: startDateField ? startDateField.value : '',
            end_date: (isCurrentCheckbox && isCurrentCheckbox.checked) ? 'Present' : (endDateField ? endDateField.value : ''),
            ui_lang: document.documentElement.lang || document.querySelector('html').getAttribute('lang') || 'fr'
        };

        // Replace the fetch part in the experience description generation event listener
        fetch('/generate-experience-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            credentials: 'same-origin',
            body: JSON.stringify(experienceData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            let accumulatedText = '';

            function processStream() {
                return reader.read().then(({done, value}) => {
                    if (done) {
                        // Restore the button to its original state when done
                        restoreButtonState(button, originalContent);
                        return;
                    }

                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.description) {
                                    // Replace '*' with '• ' for better formatting
                                    descriptionTextarea.value = data.description.replace(/\*\s*/g, ' ');
                                }

                            } catch (e) {
                                console.warn('Error parsing chunk:', e);
                            }
                        }
                    });

                    return processStream();
                });
            }

            return processStream();
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            // Restore the button to its original state in case of error
            restoreButtonState(button, originalContent);
            alert('Une erreur est survenue lors de la génération de la description.');
        });
    }
});

const sections = ['personal', 'education', 'experience', 'skills', 'additional'];


function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.form-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show the selected section
    document.getElementById(`${sectionName}-section`).style.display = 'block';

    // Update progress bar with correct width
    const progressWidths = {
        'personal': '20%',
        'education': '40%',
        'experience': '60%',
        'skills': '80%',
        'additional': '100%'
    };

    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = progressWidths[sectionName];
    }

    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.section === sectionName) {
            btn.classList.add('text-primary');
        } else {
            btn.classList.remove('text-primary');
        }
    });

    // Update next/previous button states
    updateNavigationButtons(sectionName);
}

function updateNavigationButtons(currentSection) {
    const currentIndex = sections.indexOf(currentSection);
    const prevButton = document.querySelector('.prev-section');
    const nextButton = document.querySelector('.next-section');

    if (prevButton) {
        prevButton.disabled = currentIndex === 0;
    }
    if (nextButton) {
        nextButton.disabled = currentIndex === sections.length - 1;
    }
}

let isNavigating = false;

function nextSection() {
    // Prevent rapid clicks
    if (isNavigating) return;
    isNavigating = true;

    const currentSection = getCurrentSection();
    const currentIndex = sections.indexOf(currentSection);

    console.log("Current Index:", currentIndex);

    if (currentIndex < sections.length - 1) {
        const nextIndex = currentIndex + 1;
        console.log("Next Index:", nextIndex);
        showSection(sections[nextIndex]);
    }

    // Reset after a short delay
    setTimeout(() => {
        isNavigating = false;
    }, 300);
}


function prevSection() {
    const currentSection = getCurrentSection();
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex > 0) {
        showSection(sections[currentIndex - 1]);
    }
}

function getCurrentSection() {
    // Log all sections
    document.querySelectorAll('.form-section').forEach(section => {
        console.log(`Section ${section.id}: display=${section.style.display}, computed=${window.getComputedStyle(section).display}`);
    });

    // Try finding by computed style
    const visibleSection = Array.from(document.querySelectorAll('.form-section')).find(
        section => window.getComputedStyle(section).display !== 'none'
    );

    // If found, return the section name
    if (visibleSection) {
        console.log("Found visible section:", visibleSection.id);
        return visibleSection.id.replace('-section', '');
    }

    // Fallback
    console.log("No visible section found, defaulting to 'personal'");
    return 'personal';
}
// Show initial section on page load
document.addEventListener('DOMContentLoaded', function() {
    // Get initial section from URL or default to 'personal'
    const urlParams = new URLSearchParams(window.location.search);
    const initialSection = urlParams.get('section') || 'personal';
    showSection(initialSection);

    // Add event listeners to next/prev buttons
    const nextButton = document.querySelector('.next-section');
    const prevButton = document.querySelector('.prev-section');

    if (nextButton) {
        nextButton.addEventListener('click', nextSection);
    }
    if (prevButton) {
        prevButton.addEventListener('click', prevSection);
    }
});

function submitForm(event) {
    event.preventDefault(); // Prevent default form submission

    // Get the name and surname fields
    const firstName = document.querySelector('[name="first_name"]');
    const lastName = document.querySelector('[name="last_name"]');

    // Check if both fields are filled
    if (firstName.value.trim() && lastName.value.trim()) {
        // Both fields are filled, submit the form
        document.querySelector('form').submit();
    } else {
        // Generic error message for any empty required field
        showErrorPopup("Please fill in both first name and last name fields");
    }
}

// Function to show a popup error message
function showErrorPopup(message) {
    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'error-popup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        border: 2px solid #f44336;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 90%;
        width: 400px;
        text-align: center;
    `;

    // Error message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        color: #333;
        font-size: 16px;
        margin: 0 0 20px 0;
    `;

    // OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.cssText = `
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 20px;
        cursor: pointer;
        font-size: 14px;
    `;
    okButton.onclick = function() {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    };

    // Overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 999;
    `;

    // Assemble and show popup
    popup.appendChild(messageEl);
    popup.appendChild(okButton);
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
}


// Add this to your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ... your existing code ...

    // Add form submission handler
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            // If you want to do any final validation before submission
            const formData = new FormData(form);

            // Log form data for debugging
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }
        });
    }
});


document.addEventListener('DOMContentLoaded', function() {
    // Language Inputs
    document.querySelectorAll('.language-input').forEach(function(input) {
        const dropdown = input.nextElementSibling;
        const options = dropdown.querySelectorAll('.language-option');

        input.addEventListener('focus', function() {
            dropdown.classList.remove('hidden');
        });

        input.addEventListener('blur', function() {
            setTimeout(function() {
                dropdown.classList.add('hidden');
            }, 200);
        });

        options.forEach(function(option) {
            option.addEventListener('click', function() {
                input.value = this.dataset.language;
                dropdown.classList.add('hidden');
            });
        });
    });

    // Level Inputs
    document.querySelectorAll('.level-input').forEach(function(input) {
        const dropdown = input.nextElementSibling;
        const options = dropdown.querySelectorAll('.level-option');

        input.addEventListener('focus', function() {
            dropdown.classList.remove('hidden');
        });

        input.addEventListener('blur', function() {
            setTimeout(function() {
                dropdown.classList.add('hidden');
            }, 200);
        });

        options.forEach(function(option) {
            option.addEventListener('click', function() {
                input.value = this.dataset.level;
                dropdown.classList.add('hidden');
            });
        });
    });

    // Skill Inputs
    document.querySelectorAll('.skill-input').forEach(function(input) {
        const dropdown = input.nextElementSibling;
        const options = dropdown.querySelectorAll('.skill-option');

        input.addEventListener('focus', function() {
            dropdown.classList.remove('hidden');
        });

        input.addEventListener('blur', function() {
            setTimeout(function() {
                dropdown.classList.add('hidden');
            }, 200);
        });

        options.forEach(function(option) {
            option.addEventListener('click', function() {
                input.value = this.dataset.skill;
                dropdown.classList.add('hidden');
            });
        });
    });
});

    function addSkillDropdown(input) {
    const dropdown = input.nextElementSibling;
    const options = dropdown.querySelectorAll('.skill-option');

    input.addEventListener('focus', function() {
        dropdown.classList.remove('hidden');
    });

    input.addEventListener('blur', function() {
        setTimeout(function() {
            dropdown.classList.add('hidden');
        }, 200);
    });

    options.forEach(function(option) {
        option.addEventListener('click', function() {
            input.value = this.dataset.skill;
            dropdown.classList.add('hidden');
        });
    });
}


    function addLanguageDropdown(input) {
    const dropdown = input.nextElementSibling;
    const options = dropdown.querySelectorAll('.language-option');

    input.addEventListener('focus', function() {
        dropdown.classList.remove('hidden'); // Show the dropdown
    });

    input.addEventListener('blur', function() {
        setTimeout(function() {
            dropdown.classList.add('hidden'); // Hide the dropdown after a delay
        }, 200);
    });

    options.forEach(function(option) {
        option.addEventListener('click', function() {
            input.value = this.dataset.language;
            dropdown.classList.add('hidden'); // Hide after selection
        });
    });
}

// Manual photo input setting
    document.addEventListener('DOMContentLoaded', function() {
        const realFileBtn = document.getElementById("photo");
        const customBtn = document.getElementById("custom-button");
        const customText = document.getElementById("custom-text");
        const previewContainer = document.getElementById("preview-container");
        const imagePreview = document.getElementById("image-preview");

        customBtn.addEventListener("click", function() {
            realFileBtn.click();
        });

        realFileBtn.addEventListener("change", function() {
            if (realFileBtn.value) {
                // Show file name
                const fileName = realFileBtn.value.match(/[\/\\]([\w\d\s\.\-]+)$/)[1];
                customText.innerText = fileName;

                // Show image preview if it's an image file
                if (realFileBtn.files && realFileBtn.files[0]) {
                    const reader = new FileReader();

                    reader.onload = function(e) {
                        imagePreview.src = e.target.result;
                        previewContainer.classList.remove("hidden");
                    }

                    reader.readAsDataURL(realFileBtn.files[0]);
                }
            } else {
                customText.innerText = "{{ _('Aucun fichier sélectionné') }}";
                previewContainer.classList.add("hidden");
            }
        });
    });

function addLevelDropdown(input) {
    // Same logic as addLanguageDropdown, but for level
    const dropdown = input.nextElementSibling;
    const options = dropdown.querySelectorAll('.level-option');

    input.addEventListener('focus', function() {
        dropdown.classList.remove('hidden');
    });

    input.addEventListener('blur', function() {
        setTimeout(function() {
            dropdown.classList.add('hidden');
        }, 200);
    });

    options.forEach(function(option) {
        option.addEventListener('click', function() {
            input.value = this.dataset.level;
            dropdown.classList.add('hidden');
        });
    });
}



// loading spinner
function showLoading(container) {
    // Inject CSS for the loader if it hasn't been added yet
    if (!document.getElementById('loading-style')) {
        const style = document.createElement('style');
        style.id = 'loading-style';
        style.textContent = `
            .loading-spinner {
                font-size: 14px;
                font-weight: bold;
                color: #666;
                text-align: center;
                margin: 10px 0;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .loading-spinner::after {
                content: '';
                width: 12px;
                height: 12px;
                border: 2px solid #666;
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 0.6s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Create and append the loading spinner
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerText = 'Loading...';
    loadingIndicator.classList.add('loading-spinner');
    loadingIndicator.id = 'loading-indicator';
    container.appendChild(loadingIndicator);
}

// Function to remove the loading spinner
function hideLoading(container) {
    const loader = container.querySelector('.loading-spinner');
    if (loader) {
        loader.remove();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Attach to preview button
    const previewButton = document.querySelector('#previewCVButton');
    if (previewButton) {
        previewButton.addEventListener('click', async (e) => {
            e.preventDefault();

            // Validate form
            const firstName = document.querySelector('[name="first_name"]');
            const lastName = document.querySelector('[name="last_name"]');

            if (firstName.value.trim() && lastName.value.trim()) {
                // Collect data and navigate to preview
                const collector = new CVFormDataCollector();
                await collector.collectAllData();
                collector.navigateToPreview();
            } else {
                // Show error
                alert("Please fill in both first name and last name fields");
            }
        });
    }
});
