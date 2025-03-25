function initializeDatePickers(selector = '[id$="-start_date"], [id$="-end_date"], [id$="-date"]') {
  const months = translations.months; // Use translated months
  const daysOfWeek = translations.days; // Use translated days
  const currentYear = new Date().getFullYear();
  const yearRange = 100;

  const dateFields = document.querySelectorAll(selector);

  dateFields.forEach(dateField => {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-date-picker-wrapper relative';

    const originalId = dateField.id;
    const originalName = dateField.name;
    const originalValue = dateField.value;

    const displayInput = document.createElement('input');
    displayInput.type = 'text';
    displayInput.readOnly = true;
    displayInput.className = dateField.className + ' cursor-pointer';
    displayInput.placeholder = translations.selectDate;
    if (originalValue) {
      displayInput.value = originalValue;
    }

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = originalId;
    hiddenInput.name = originalName;
    hiddenInput.value = originalValue;

    dateField.parentNode.replaceChild(wrapper, dateField);
    wrapper.appendChild(displayInput);
    wrapper.appendChild(hiddenInput);

    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'custom-date-picker absolute mt-1 bg-white shadow-lg rounded border border-gray-300 z-50 hidden';
    pickerContainer.style.width = '300px';
    wrapper.appendChild(pickerContainer);

    const header = document.createElement('div');
    header.className = 'picker-header flex justify-between items-center bg-gray-100 p-2 rounded-t';
    pickerContainer.appendChild(header);

    const prevYearBtn = document.createElement('button');
    prevYearBtn.innerHTML = '&laquo;';
    prevYearBtn.className = 'p-1 hover:bg-gray-200 rounded';
    prevYearBtn.type = 'button';
    header.appendChild(prevYearBtn);

    const prevMonthBtn = document.createElement('button');
    prevMonthBtn.innerHTML = '&lsaquo;';
    prevMonthBtn.className = 'p-1 hover:bg-gray-200 rounded';
    prevMonthBtn.type = 'button';
    header.appendChild(prevMonthBtn);

    const monthYearDisplay = document.createElement('div');
    monthYearDisplay.className = 'flex-grow text-center flex justify-center items-center space-x-2';
    header.appendChild(monthYearDisplay);

    const monthSelect = document.createElement('select');
    monthSelect.className = 'bg-gray-100 p-1 rounded cursor-pointer';
    months.forEach((month, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = month;
      monthSelect.appendChild(option);
    });
    monthYearDisplay.appendChild(monthSelect);

    const yearSelect = document.createElement('select');
    yearSelect.className = 'bg-gray-100 p-1 rounded cursor-pointer';
    for (let i = currentYear - yearRange; i <= currentYear + 10; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      yearSelect.appendChild(option);
    }
    monthYearDisplay.appendChild(yearSelect);

    const nextMonthBtn = document.createElement('button');
    nextMonthBtn.innerHTML = '&rsaquo;';
    nextMonthBtn.className = 'p-1 hover:bg-gray-200 rounded';
    nextMonthBtn.type = 'button';
    header.appendChild(nextMonthBtn);

    const nextYearBtn = document.createElement('button');
    nextYearBtn.innerHTML = '&raquo;';
    nextYearBtn.className = 'p-1 hover:bg-gray-200 rounded';
    nextYearBtn.type = 'button';
    header.appendChild(nextYearBtn);

    const calendarBody = document.createElement('div');
    calendarBody.className = 'calendar-body p-2';
    pickerContainer.appendChild(calendarBody);

    const daysHeader = document.createElement('div');
    daysHeader.className = 'days-header grid grid-cols-7 text-center font-bold text-sm';
    calendarBody.appendChild(daysHeader);

    daysOfWeek.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.className = 'py-1';
        daysHeader.appendChild(dayEl);
    });

    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid grid grid-cols-7 text-center';
    calendarBody.appendChild(daysGrid);

    let currentDate = originalValue ? new Date(originalValue) : new Date();
    if (isNaN(currentDate.getTime())) currentDate = new Date();

    function renderCalendar() {
      daysGrid.innerHTML = '';
      monthSelect.value = currentDate.getMonth();
      yearSelect.value = currentDate.getFullYear();

      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDay = firstDay.getDay();

      for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'text-gray-300 py-2';
        daysGrid.appendChild(emptyDay);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.className = 'py-2 hover:bg-gray-100 cursor-pointer';

        const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        if (displayInput.value) {
          const displayDate = new Date(displayInput.value);
          if (displayDate.getDate() === day &&
              displayDate.getMonth() === currentDate.getMonth() &&
              displayDate.getFullYear() === currentDate.getFullYear()) {
            dayEl.className += ' bg-blue-100 font-bold';
          }
        }

        dayEl.addEventListener('click', function() {
          const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const formattedDate = formatDate(selectedDate);
          displayInput.value = formattedDate;
          hiddenInput.value = formattedDate;
          pickerContainer.classList.add('hidden');
          renderCalendar();

          if (originalId === 'end_date') {
            const presentText = document.querySelector('.present-text');
            if (presentText) {
              presentText.classList.add('hidden');
            }
          }
        });

        daysGrid.appendChild(dayEl);
      }
    }

    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function parseDate(dateString) {
      if (!dateString) return new Date();
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      return new Date();
    }

    prevYearBtn.addEventListener('click', function() {
      currentDate.setFullYear(currentDate.getFullYear() - 1);
      renderCalendar();
    });

    nextYearBtn.addEventListener('click', function() {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      renderCalendar();
    });

    prevMonthBtn.addEventListener('click', function() {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });

    nextMonthBtn.addEventListener('click', function() {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });

    monthSelect.addEventListener('change', function() {
currentDate.setMonth(parseInt(this.value));
      renderCalendar();
    });

    yearSelect.addEventListener('change', function() {
      currentDate.setFullYear(parseInt(this.value));
      renderCalendar();
    });

    displayInput.addEventListener('click', function(e) {
      e.stopPropagation();
      const isHidden = pickerContainer.classList.contains('hidden');

      document.querySelectorAll('.custom-date-picker').forEach(picker => {
        picker.classList.add('hidden');
      });

      if (isHidden) {
        if (displayInput.value) {
          currentDate = parseDate(displayInput.value);
        }
        renderCalendar();
        pickerContainer.classList.remove('hidden');
      } else {
        pickerContainer.classList.add('hidden');
      }
    });

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        pickerContainer.classList.add('hidden');
      }
    });

    renderCalendar();
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initializeDatePickers();
});

