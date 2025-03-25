function submitForm(event) {
    event.preventDefault(); // Prevent default form submission

    // Get the form
    const form = document.querySelector('form');

    // Submit the form
    if (form.checkValidity()) {
        form.submit();
    } else {
        // If form is invalid, show error messages
        form.reportValidity();

        // Collect and display individual error messages
        const invalidFields = form.querySelectorAll(':invalid');
        invalidFields.forEach(field => {
            if (field.validationMessage) {
                showMessage('error', field.validationMessage);
            }
        });
    }
}

// Function to show messages to the user
function showMessage(type, message) {
    // Create message container if it doesn't exist
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.className = 'message-container';

        // Insert at the top of the form
        const form = document.querySelector('form');
        if(form){
            form.insertBefore(messageContainer, form.firstChild);
        } else {
            console.error("Form not found");
            return;
        }

    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;

    // Add close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close-message';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = function() {
        messageElement.remove();
    };
    messageElement.appendChild(closeButton);

    // Add to container
    messageContainer.appendChild(messageElement);
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}