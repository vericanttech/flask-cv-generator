class CVEditor {
    constructor() {
        this.editModeBtn = document.getElementById('editMode');
        this.saveChangesBtn = document.getElementById('saveChanges');
        this.editableElements = document.querySelectorAll('[data-editable="true"]');
        this.isEditMode = false;

        this.init();
    }

    init() {
        if (!this.editModeBtn) return;

        this.editModeBtn.addEventListener('click', () => this.toggleEditMode());
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;

        this.editableElements.forEach(el => {
            el.contentEditable = this.isEditMode;

            if (this.isEditMode) {
                el.classList.add('edit-mode');
            } else {
                el.classList.remove('edit-mode');
            }
        });

        // Toggle button states
        this.editModeBtn.textContent = this.isEditMode ?
            cvTranslations.quitEditMode :
            cvTranslations.editCV;
        this.saveChangesBtn.style.display = this.isEditMode ? 'inline-block' : 'none';
    }
}