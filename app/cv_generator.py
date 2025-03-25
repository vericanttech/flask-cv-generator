import locale
import re
from functools import wraps

from flask import session, current_app
import fitz
from PIL import Image
import os
from datetime import datetime
from flask_babel import lazy_gettext as _


def parse_date(date_str, lang='fr'):
    """
    Parse date string in various formats and return formatted date.
    Returns None if date_str is None or empty.

    Args:
        date_str (str): The date string to parse
        lang (str): Language code for the output month name (default: 'en')

    Returns:
        str or None: Formatted date string or None if input is empty
    """
    if not date_str:
        return None

    # Clean up the date string more aggressively
    # Replace multiple spaces, tabs, and newlines with a single space
    import re
    from datetime import datetime
    date_str = re.sub(r'\s+', ' ', date_str).strip()

    # Check if the string already contains a date range
    if ' - ' in date_str:
        # Return the first part of the range
        return parse_date(date_str.split(' - ')[0].strip(), lang)

    formats_to_try = [
        '%a, %d %b %Y %H:%M:%S GMT',  # Original format
        '%b %Y',  # Simple month year format (e.g. Mar 2025)
        '%Y-%m-%d',  # ISO format
        '%m/%d/%Y',  # US format
        '%d/%m/%Y',  # European format
        '%B %Y',  # Full month name
    ]

    for date_format in formats_to_try:
        try:
            date_obj = datetime.strptime(date_str, date_format)

            # Get month and year
            month_number = date_obj.month
            year = date_obj.year

            # Translate month name based on language
            month_name = get_month_name(month_number, lang)

            # Return formatted date
            return f"{month_name} {year}"
        except ValueError:
            continue

    # If we can't parse the date, return it as is with a warning
    import logging
    logging.warning(f"Could not parse date: {date_str}")
    return date_str


def get_month_name(month_number, lang='fr'):
    """
    Get the month name for a given month number in the specified language.

    Args:
        month_number (int): Month number (1-12)
        lang (str): Language code

    Returns:
        str: Month name in the specified language
    """
    # Month translations for different languages
    month_translations = {
        'en': [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ],
        'tr': [
            'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
            'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
        ],
        'fr': [
            'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
            'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
        ]
    }

    # If language not supported, fall back to English
    if lang not in month_translations:
        import logging
        logging.warning(f"Language {lang} not supported, falling back to English")
        lang = 'fr'

    # Return the abbreviated month name
    return month_translations[lang][month_number - 1]


# Dictionary with translations for all section titles
TRANSLATIONS = {
    'en': {
        'contact': 'Contact Information',
        'skills': 'Skills',
        'software': 'Software',
        'languages': 'Languages',
        'hobbies': 'Hobbies',
        'references': 'References',
        'career_goals': 'Professional Objective',
        'work_experience': 'Work Experience',
        'education': 'Education',
        'certifications': 'Certifications',
        'present': 'present',  # For date ranges
    },
    'fr': {
        'contact': 'Coordonnées',
        'skills': 'Compétences',
        'software': 'Logiciels',
        'languages': 'Langues',
        'hobbies': 'Loisirs',
        'references': 'Références',
        'career_goals': 'Objectif professionnel',
        'work_experience': 'Expérience professionnelle',
        'education': 'Formation',
        'certifications': 'Certifications',
        'present': 'présent',  # For date ranges
    },
    'tr': {
        'contact': 'İletişim Bilgileri',
        'skills': 'Beceriler',
        'software': 'Yazılım',
        'languages': 'Diller',
        'hobbies': 'Hobiler',
        'references': 'Referanslar',
        'career_goals': 'Profesyonel Hedef',
        'work_experience': 'İş Deneyimi',
        'education': 'Eğitim',
        'certifications': 'Sertifikalar',
        'present': 'Devam',  # For date ranges
    }
}


class CVGenerator:
    def __init__(self, cv_data, upload_folder, language='fr'):
        self.cv_data = cv_data
        self.upload_folder = upload_folder

        # Set language (default to French if invalid language is provided)
        if language in TRANSLATIONS:
            self.language = language
        else:
            self.language = 'fr'
            current_app.logger.warning(f"Invalid language '{language}' specified, defaulting to French")

        # Translations for the selected language
        self.translations = TRANSLATIONS[self.language]

        # Page constants
        self.PAGE_WIDTH = 595  # A4 width in points
        self.PAGE_HEIGHT = 842  # A4 height in points
        self.SIDEBAR_WIDTH = self.PAGE_WIDTH * 0.3
        self.MARGIN = 20
        self.MARGIN_LEFT = self.SIDEBAR_WIDTH + 10
        self.SECTION_SPACING = 20
        self.SIDEBAR_TEXT_WIDTH = self.SIDEBAR_WIDTH - self.MARGIN

        # Colors
        self.SIDEBAR_COLOR = (237 / 255, 242 / 255, 247 / 255)  # #edf2f7 in RGB
        self.TEXT_COLOR = (0, 0, 0)
        self.LINE_COLOR = (0.3, 0.3, 0.3)  # Dark gray for timeline line

        # Fonts
        self.TITLE_FONT_SIZE = 12
        self.TEXT_FONT_SIZE = 10
        # Fonts
        if self.language == 'tr':
            self.BOLD = "Turkish-Bold"
            self.REGULAR = "Turkish-Roman"
            self.ITALIC = "Turkish-Italic"
        else:
            self.BOLD = "Helvetica-Bold"
            self.REGULAR = "Times-Roman"
            self.ITALIC = "Times-Italic"

        # Format and store CV data
        personal_info = self._format_personal_info()
        self.NAME = personal_info['NAME']
        self.CONTACT_INFO = personal_info['CONTACT_INFO']
        self.CAREER_GOALS_TEXT = personal_info['CAREER_GOALS_TEXT']

        # Format other sections
        self.SKILLS = self._format_skills()
        self.LANGUAGES = self._format_languages()
        self.HOBBIES = self._format_hobbies()
        self.REFERENCES = self._format_references()
        self.WORK_EXPERIENCES = self._format_experiences()
        self.EDUCATION_ENTRIES = self._format_education()
        self.CERTIFICATIONS = self._format_certifications()

        # Default software proficiency (you might want to add this to your form)
        self.SOFTWARE = self._format_software()

    def _format_personal_info(self):
        """Format personal info for CV generation"""
        info = self.cv_data['personal_info']

        return {
            'NAME': f"{info['first_name']} {info['last_name']}",
            'CONTACT_INFO': [
                {"text": info['email'], "icon": "📧"},  # Email
                {"text": info['phone'], "icon": "📱"},  # Phone
                {"text": info['address'], "icon": "📍"},  # Address
                # {"text": f"City: {info['city']}", "icon": "🏠"}  # City
            ],
            'CAREER_GOALS_TEXT': info.get('professional_summary', '')
        }

    def _format_software(self):
        """Format software proficiency for CV generation"""
        return {sw['name']: sw['proficiency']
                for sw in self.cv_data.get('softwares', [])
                if sw['name'] and sw['proficiency']}

    def _format_experiences(self):
        """Format work experiences for CV generation"""
        formatted_experiences = []

        for exp in self.cv_data['experience']:
            raw_dates = exp.get('start_date', '')

            # Extract clean start_date and end_date
            dates = re.split(r'\s*-\s*', raw_dates)  # Split by " - " with any extra spaces or new lines removed
            start_date = parse_date(dates[0].strip()) if dates[0] else None
            end_date = parse_date(dates[1].strip()) if len(dates) > 1 and dates[1] else None

            # Use translated word for "present" if end_date is empty
            date_text = f"{start_date} - {end_date if end_date else self.translations['present']}"

            formatted_experiences.append({
                'date': date_text,
                'company': exp.get('company', ''),
                'title': exp.get('position', ''),
                'description': exp.get('description_', '')
            })

        return formatted_experiences

    def _format_education(self):
        """Format education entries for CV generation"""
        formatted_education = []

        for edu in self.cv_data['education']:
            start_date = parse_date(edu.get('start_date', ''))
            end_date = parse_date(edu.get('end_date', ''))

            formatted_education.append({
                'date': f"{start_date} - {end_date}" if start_date and end_date else '',
                'institution': edu.get('institution', ''),
                'degree': edu.get('degree', ''),
            })

        return formatted_education

    def _format_certifications(self):
        """Format certification entries for CV generation"""
        formatted_certifications = []

        for cert in self.cv_data['certifications']:
            cert_date = parse_date(cert.get('date', ''))

            formatted_certifications.append({
                'date': cert_date if cert_date else '',
                'certificate': cert.get('name', ''),
                'issuer': cert.get('issuer', ''),
            })

        return formatted_certifications

    def _format_skills(self):
        """Format skills for CV generation"""
        return [skill['skill'] for skill in self.cv_data['skills']]

    def _format_languages(self):
        """Format languages for CV generation"""
        return {lang['language']: lang['level'] for lang in self.cv_data['languages']}

    def _format_hobbies(self):
        """Format hobbies for CV generation"""
        return [hobby['name'] for hobby in self.cv_data['hobbys']]

    def _format_references(self):
        """Format references for CV generation"""
        return [(ref['name'], ref['contact'], ref['company'])
                for ref in self.cv_data['references']]

    def generate(self):
        """Generate the CV PDF with debugging"""
        try:
            current_app.logger.info(f"Starting CV generation in {self.language} language.")

            # Log all attributes of the class instance
            current_app.logger.debug(f"Generating CV with attributes: {vars(self)}")

            # Ensure NAME exists
            if not hasattr(self, 'NAME') or not self.NAME:
                raise ValueError("Missing required attribute: 'NAME' for CV generation")

            # Create PDF document
            doc = fitz.open()
            page = doc.new_page(width=self.PAGE_WIDTH, height=self.PAGE_HEIGHT)

            font_path = r"app/static/fonts/NotoEmoji-VariableFont_wght.ttf"
            page.insert_font(fontname="icons", fontfile=font_path)  # Use F0 as alias

            # Register the fonts inside generate()

            if self.language == 'tr':
                page.insert_font(fontname="Turkish-Bold", fontfile="app/static/fonts/Turkish-Bold.ttf")
                page.insert_font(fontname="Turkish-Roman", fontfile="app/static/fonts/Turkish-Regular.ttf")
                page.insert_font(fontname="Turkish-Italic", fontfile="app/static/fonts/Turkish-Italic.ttf")

            # Draw sidebar
            current_app.logger.debug("Drawing sidebar...")
            self.draw_sidebar(page)

            # Add profile picture
            photo_path = session.get('photo_path', '')
            if photo_path and os.path.exists(photo_path):
                current_app.logger.debug(f"Adding profile picture from {photo_path}")
                self.add_profile_picture(page, photo_path)
                image_size = int(self.SIDEBAR_WIDTH * 0.8)
                start_y = 20 + image_size + 30
            else:
                if photo_path:
                    current_app.logger.warning(f"Profile picture not found at {photo_path}")
                # If no photo, start text at top with just some margin
                start_y = 50  # Adjust this value as needed for your layout

            current_app.logger.debug(f"Starting y-position for text: {start_y}")

            # Name
            current_app.logger.debug(f"Adding name: {self.NAME}")
            # Name Positioning (start from left and wrap if too long)
            y_offset = self.add_text(page, self.NAME, x=self.MARGIN, y=start_y, font=self.BOLD, size=14,
                                     max_width=self.SIDEBAR_TEXT_WIDTH)

            # Contact Info
            ICON_COLORS = {
                "email": (0.2, 0.4, 0.8),  # Blue
                "phone": (0.2, 0.7, 0.2),  # Green
                "location": (0.8, 0.3, 0.3),  # Red
                "home": (0.5, 0.3, 0.7)  # Purple
            }
            self.add_title(page, self.translations['contact'], self.MARGIN, y_offset + 10)
            y_offset += 30

            for i, contact in enumerate(self.CONTACT_INFO):
                icon_color = list(ICON_COLORS.values())[i % len(ICON_COLORS)]  # Get color for this icon
                y_offset = self.add_text(
                    page,
                    text=contact["text"],
                    x=self.MARGIN,
                    y=y_offset,
                    max_width=self.SIDEBAR_TEXT_WIDTH,
                    icon=contact["icon"],
                    icon_color=icon_color,  # Specify icon color
                    color=self.TEXT_COLOR  # Regular text remains black
                )
                y_offset += 5  # spacing between entries

            # Optional sections - only add if they have content
            # Skills
            if hasattr(self, 'SKILLS') and self.SKILLS:
                current_app.logger.debug(f"Adding skills: {self.SKILLS}")
                self.add_title(page, self.translations['skills'], self.MARGIN, y_offset + 10)
                y_offset += 30
                for skill in self.SKILLS:
                    self.add_text(page, f"{skill}", self.MARGIN, y_offset)
                    y_offset += 15

            # Software
            if hasattr(self, 'SOFTWARE') and self.SOFTWARE:
                current_app.logger.debug(f"Adding software: {self.SOFTWARE}")
                self.add_title(page, self.translations['software'], self.MARGIN, y_offset + 10)
                y_offset += 30
                for software, level in self.SOFTWARE.items():
                    y_offset = self.add_text(page, f"{software}: ({level})", self.MARGIN, y_offset,
                                             max_width=self.SIDEBAR_TEXT_WIDTH)
                    y_offset += 5

            # Languages
            if hasattr(self, 'LANGUAGES') and self.LANGUAGES:
                current_app.logger.debug(f"Adding languages: {self.LANGUAGES}")
                self.add_title(page, self.translations['languages'], self.MARGIN, y_offset + 10)
                y_offset += 30
                for lang, level in self.LANGUAGES.items():
                    self.add_text(page, f"{lang}: {level}", self.MARGIN, y_offset)
                    y_offset += 15

            # Hobbies
            if hasattr(self, 'HOBBIES') and self.HOBBIES:
                current_app.logger.debug(f"Adding hobbies: {self.HOBBIES}")
                self.add_title(page, self.translations['hobbies'], self.MARGIN, y_offset + 10)
                y_offset += 30
                for hobby in self.HOBBIES:
                    self.add_text(page, f"• {hobby}", self.MARGIN, y_offset)
                    y_offset += 15

            # References
            if hasattr(self, 'REFERENCES') and self.REFERENCES:
                current_app.logger.debug(f"Adding references: {self.REFERENCES}")
                self.add_title(page, self.translations['references'], self.MARGIN, y_offset + 10)
                y_offset += 30
                for name, phone, company in self.REFERENCES:
                    self.add_text(page, name, self.MARGIN, y_offset, font=self.ITALIC)
                    self.add_text(page, f"{company} | {phone}", self.MARGIN, y_offset + 15)
                    y_offset += 30

            # ==== MAIN CONTENT ====
            y_main = 50  # Start position for main section

            # Add Career Goals
            current_app.logger.debug(f"Adding career goals: {self.CAREER_GOALS_TEXT}")
            y_main = self.add_career_goals(page, y_main, self.CAREER_GOALS_TEXT)

            # Add Work Experience
            current_app.logger.debug(f"Adding work experiences: {self.WORK_EXPERIENCES}")
            y_main = self.add_work_experience(page, y_main, self.WORK_EXPERIENCES)

            # Add Education
            current_app.logger.debug(f"Adding education: {self.EDUCATION_ENTRIES}")
            y_main = self.add_education(page, y_main, self.EDUCATION_ENTRIES)

            # Add Certifications section
            y_main = self.add_certifications(page, y_main, self.CERTIFICATIONS)

            # Generate unique filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"cv_{timestamp}.pdf"
            filepath = os.path.join(self.upload_folder, filename)

            # Save the CV
            current_app.logger.debug(f"Saving CV to {filepath}")
            doc.save(filepath)

            current_app.logger.info(f"CV successfully generated: {filename}")
            return filename

        except Exception as e:
            current_app.logger.error(f"Error generating CV: {str(e)}", exc_info=True)
            raise

    def draw_section_title(self, page, y, text, title_x=None, draw_line=True):  # draw_line is now optional
        """Draws section titles with optional underline."""

        if title_x is None:
            title_x = self.MARGIN_LEFT + 60

        page.insert_text((title_x, y), text, fontsize=self.TITLE_FONT_SIZE, fontname=self.BOLD, color=(0, 0, 0))

        if draw_line:  # Only draw the line if draw_line is True
            page.draw_line((title_x, y + 3), (self.PAGE_WIDTH - 30, y + 3), color=(0, 0, 0))  # Underline

        return y + 20  # Move cursor down

    def add_career_goals(self, page, y, text):
        """Adds the Career Goals section with dynamic height based on content, only if text is not empty."""

        if not text or not text.strip():  # Check for empty text
            return y  # Return original y if text is empty

        # Draw the section title
        y = self.draw_section_title(page, y, self.translations['career_goals'], self.MARGIN_LEFT, False) - 10

        # Calculate text dimensions
        font = fitz.Font("Helvetica")
        text_width = self.PAGE_WIDTH - self.MARGIN_LEFT - 30  # Available width
        wrapped_text = ""
        current_line = ""

        # Estimate characters per line (approximate)
        char_width = font.glyph_advance(ord('a')) * self.TEXT_FONT_SIZE  # Get average char width

        chars_per_line = int(text_width / char_width)

        # Word wrap the text
        words = text.split()
        for word in words:
            if len(current_line) + len(word) + 1 <= chars_per_line:
                current_line += (" " + word if current_line else word)
            else:
                wrapped_text += current_line + "\n"
                current_line = word

        # Add the last line
        if current_line:
            wrapped_text += current_line

        # Calculate required height
        line_count = len(wrapped_text.split('\n'))
        line_height = self.TEXT_FONT_SIZE * 1.5  # Add 20% for line spacing
        text_height = line_height * line_count

        # Create rectangle with dynamic height
        rect = fitz.Rect(
            self.MARGIN_LEFT,  # left
            y,  # top
            self.PAGE_WIDTH - 30,  # right
            y + text_height + 10  # bottom (add padding)
        )

        # Insert text in the dynamically sized box
        page.insert_textbox(
            rect,
            text,
            fontsize=self.TEXT_FONT_SIZE,
            fontname=self.REGULAR,
            color=(0, 0, 0),
            align=0  # Left alignment
        )

        # Return the next y position (after the text box)
        return y + text_height + 20  # Add some padding after the section

    def wrap_text_with_width(self, text, font_name, font_size, max_width):
        """Helper function to wrap text based on width calculation."""
        font = fitz.Font("Helvetica")
        wrapped_text = []
        current_line = []
        current_width = 0

        words = text.split()
        for word in words:
            # Calculate word width
            word_width = sum(font.glyph_advance(ord(c)) * font_size for c in word)

            # Add space width if not first word
            if current_line:
                word_width += font.glyph_advance(ord(' ')) * font_size

            if current_width + word_width <= max_width:
                current_line.append(word)
                current_width += word_width
            else:
                if current_line:
                    wrapped_text.append(' '.join(current_line))
                current_line = [word]
                current_width = sum(font.glyph_advance(ord(c)) * font_size for c in word)

        if current_line:
            wrapped_text.append(' '.join(current_line))

        return wrapped_text

    def add_timeline_entry(self, page, y, date, company, title, description=""):
        """Adds a work/education entry with a timeline, date split across two lines."""
        LINE_X = self.MARGIN_LEFT + 55
        TEXT_X = LINE_X + 10
        TEXT_WIDTH = self.PAGE_WIDTH - TEXT_X - 30
        LINE_HEIGHT = self.TEXT_FONT_SIZE * 1.5

        # Draw timeline elements
        page.draw_line((LINE_X, y), (LINE_X, y + 50), color=self.LINE_COLOR)  # Extended line
        page.draw_circle((LINE_X, y + 2), 3, color=self.LINE_COLOR, fill=self.LINE_COLOR)

        # Handle date
        date_parts = date.split(" - ")
        if len(date_parts) == 2:
            page.insert_text((self.MARGIN_LEFT, y), date_parts[0] + " -",
                             fontsize=self.TEXT_FONT_SIZE, fontname=self.REGULAR)
            page.insert_text((self.MARGIN_LEFT, y + LINE_HEIGHT), date_parts[1],
                             fontsize=self.TEXT_FONT_SIZE, fontname=self.REGULAR)
        else:
            page.insert_text((self.MARGIN_LEFT, y), date,
                             fontsize=self.TEXT_FONT_SIZE, fontname=self.REGULAR)

        # Handle title and company
        current_y = y
        if company:
            wrapped_title = self.wrap_text_with_width(title, self.BOLD, self.TEXT_FONT_SIZE, TEXT_WIDTH)
            wrapped_company = self.wrap_text_with_width(company, self.REGULAR, self.TEXT_FONT_SIZE, TEXT_WIDTH)

            for line in wrapped_title:
                page.insert_text((TEXT_X, current_y), line,
                                 fontsize=self.TEXT_FONT_SIZE, fontname=self.BOLD)
                current_y += LINE_HEIGHT

            for line in wrapped_company:
                page.insert_text((TEXT_X, current_y), line,
                                 fontsize=self.TEXT_FONT_SIZE, fontname=self.REGULAR, color=(0.3, 0.3, 1))
                current_y += LINE_HEIGHT
        else:
            wrapped_title = self.wrap_text_with_width(title, self.REGULAR, self.TEXT_FONT_SIZE, TEXT_WIDTH)
            for line in wrapped_title:
                page.insert_text((TEXT_X, current_y), line,
                                 fontsize=self.TEXT_FONT_SIZE, fontname=self.REGULAR)
                current_y += LINE_HEIGHT

        # Add some spacing before description
        current_y += LINE_HEIGHT / 2

        # Handle description
        wrapped_desc = self.wrap_text_with_width(description, self.REGULAR, self.TEXT_FONT_SIZE, TEXT_WIDTH)
        for line in wrapped_desc:
            page.insert_text((TEXT_X, current_y), line,
                             fontsize=self.TEXT_FONT_SIZE, fontname=self.REGULAR)
            current_y += LINE_HEIGHT

        # Calculate total height used
        total_height = current_y - y + LINE_HEIGHT

        # Extend timeline line if needed
        if total_height > 100:  # If content is taller than default line
            page.draw_line((LINE_X, y), (LINE_X, current_y), color=self.LINE_COLOR)

        return current_y + self.SECTION_SPACING  # Return next Y position with spacing

    def add_certifications(self, page, y, certifications):
        """Adds the Certifications section with the same timeline format as education and work experience."""
        # Only add the section if there are certifications to display
        if certifications:
            y = self.draw_section_title(page, y, self.translations['certifications'])

            for cert in certifications:
                # Create date string and description text
                date_text = cert["date"]
                title_text = cert["certificate"]
                description = _("Émis par : {issuer}").format(issuer=cert['issuer'])


                # Use the same timeline entry function as education and work experience
                y = self.add_timeline_entry(page, y, date_text, "",
                                            title_text, description)

            return y + self.SECTION_SPACING
        else:
            # If no certifications, just return the current y position
            return y

    def add_work_experience(self, page, y, experiences):
        """Adds the Work Experience section if there are experiences."""
        if experiences:
            y = self.draw_section_title(page, y, self.translations['work_experience'])
            for exp in experiences:
                y = self.add_timeline_entry(page, y, exp["date"], exp["company"], exp["title"], exp["description"])
            y += self.SECTION_SPACING
        return y

    def add_education(self, page, y, education):
        """Adds the Education section."""
        # Only add the section if there are education entries to display
        if education:
            y = self.draw_section_title(page, y, self.translations['education'])

            for edu in education:
                y = self.add_timeline_entry(page, y, edu["date"], edu["institution"], edu["degree"])

            return y + self.SECTION_SPACING
        else:
            # If no education entries, just return the current y position
            return y

    def with_icon(func):
        """Decorator to handle icons alongside text in PDF rendering with separate icon color."""

        @wraps(func)
        def wrapper(self, page, text, x, y, font=None, size=None, color=None, max_width=None,
                    icon=None, icon_color=None, icon_spacing=15, **kwargs):
            current_x = x
            original_max_width = max_width
            # Handle icon if present
            if icon:
                page.insert_text(
                    (current_x, y),
                    icon,
                    fontsize=size or self.TEXT_FONT_SIZE,
                    fontname="icons",  # DejaVuSans for icons
                    color=icon_color or color or self.TEXT_COLOR
                )
                current_x += icon_spacing
                # Adjust max_width if it was specified
                if max_width:
                    max_width = max_width - icon_spacing
            # Call original function with adjusted parameters
            return func(
                self,
                page=page,
                text=text,
                x=current_x,
                y=y,
                font=font,
                size=size,
                color=color,
                max_width=max_width,
                **kwargs
            )

        return wrapper

    @with_icon
    def add_text(self, page, text, x, y, font=None, size=None, color=None, max_width=None, icon=None, icon_color=None):
        """Efficiently wraps text and places each line separately to prevent overflow."""
        font = font or self.REGULAR
        size = size or self.TEXT_FONT_SIZE
        color = color or self.TEXT_COLOR
        final_y = y

        # Define character width factors once (could be class constants)
        CHAR_WIDTH_FACTORS = {
            self.BOLD: 0.65,
            self.ITALIC: 0.55,
            self.REGULAR: 0.5
        }

        # Base character width for this text
        char_width_base = size * CHAR_WIDTH_FACTORS.get(font, 0.5)

        # Fast width estimation - use for quick initial checks
        def quick_width_estimate(text_str):
            return len(text_str) * char_width_base

        # More accurate width calculation - use only when needed
        def get_text_width(text_str):
            # Pre-calculate width factors for different character types
            width_factors = {
                'upper': 1.2,
                'narrow': 0.7,  # i, j, l, etc.
                'wide': 1.3,  # m, w, etc.
                'normal': 1.0
            }

            # Common narrow and wide characters
            narrow_chars = set('ijlt,.\'"|!;:()[]{}')
            wide_chars = set('mwWM@%&')

            # Calculate width using character classes for efficiency
            width = 0
            for char in text_str:
                if char.isupper():
                    width += char_width_base * width_factors['upper']
                elif char in narrow_chars:
                    width += char_width_base * width_factors['narrow']
                elif char in wide_chars:
                    width += char_width_base * width_factors['wide']
                else:
                    width += char_width_base
            return width

        if not max_width:
            # Single line text without wrapping
            page.insert_text((x, y), text, fontsize=size, fontname=font, color=color)
            return final_y + size * 1.5

        # Check if text is likely to fit in a single line using quick estimate
        if quick_width_estimate(text) <= max_width:
            # Double-check with accurate calculation only if we're close to the limit
            if quick_width_estimate(text) > max_width * 0.8:
                if get_text_width(text) <= max_width:
                    page.insert_text((x, y), text, fontsize=size, fontname=font, color=color)
                    return final_y + size * 1.5
            else:
                page.insert_text((x, y), text, fontsize=size, fontname=font, color=color)
                return final_y + size * 1.5

        # Handle emails specially
        if '@' in text:
            # Split email into parts
            parts = text.split('@')
            username = parts[0]
            domain = '@' + parts[1] if len(parts) > 1 else ''

            # Try to keep each part on its own line
            current_parts = [username, domain]
            for part in current_parts:
                # Skip empty parts
                if not part:
                    continue

                # Check if part fits on one line
                if get_text_width(part) <= max_width:
                    page.insert_text((x, final_y), part, fontsize=size, fontname=font, color=color)
                    final_y += size * 1.5
                else:
                    # Need to wrap this part
                    current_line = ""
                    for char in part:
                        test_line = current_line + char
                        if quick_width_estimate(test_line) <= max_width:
                            current_line = test_line
                        else:
                            # Verify with accurate calculation if close to limit
                            if quick_width_estimate(test_line) <= max_width * 1.1:
                                if get_text_width(test_line) <= max_width:
                                    current_line = test_line
                                    continue

                            # Output current line
                            page.insert_text((x, final_y), current_line, fontsize=size, fontname=font, color=color)
                            final_y += size * 1.5
                            current_line = char

                    # Output remaining text
                    if current_line:
                        page.insert_text((x, final_y), current_line, fontsize=size, fontname=font, color=color)
                        final_y += size * 1.5
        else:
            # Regular text - use word-based wrapping with fallback for long words
            words = text.split()
            current_line = ""

            for word in words:
                # Test if adding word to current line would exceed width
                test_line = current_line + (" " if current_line else "") + word

                # Quick check
                if quick_width_estimate(test_line) <= max_width:
                    current_line = test_line
                else:
                    # Double-check with accurate calculation if we're close
                    if quick_width_estimate(test_line) <= max_width * 1.1:
                        if get_text_width(test_line) <= max_width:
                            current_line = test_line
                            continue

                    # Output current line if it has content
                    if current_line:
                        page.insert_text((x, final_y), current_line, fontsize=size, fontname=font, color=color)
                        final_y += size * 1.5

                    # Check if single word is too long for a line
                    if quick_width_estimate(word) > max_width:
                        # Character wrapping for this word
                        current_line = ""
                        for char in word:
                            test_line = current_line + char
                            if quick_width_estimate(test_line) <= max_width:
                                current_line = test_line
                            else:
                                page.insert_text((x, final_y), current_line, fontsize=size, fontname=font, color=color)
                                final_y += size * 1.5
                                current_line = char
                    else:
                        current_line = word

            # Output remaining text
            if current_line:
                page.insert_text((x, final_y), current_line, fontsize=size, fontname=font, color=color)
                final_y += size * 1.5

        return final_y

    def draw_sidebar(self, page):
        """Draws the left sidebar."""
        page.draw_rect([0, 0, self.SIDEBAR_WIDTH, self.PAGE_HEIGHT], fill=self.SIDEBAR_COLOR, color=self.SIDEBAR_COLOR)

    def add_title(self, page, text, x, y):
        """Adds a bold, underlined title to the PDF."""
        self.add_text(page, text, x, y, font=self.BOLD, size=self.TITLE_FONT_SIZE)
        page.draw_line((x, y + 8), (x + 100, y + 8), width=1, color=self.TEXT_COLOR)

    def add_profile_picture(self, page, img_path):
        """Adds a profile picture to the top of the sidebar, resized to fit."""
        try:
            img = Image.open(img_path).convert("RGBA")

            # Calculate the target size to fit in sidebar (maintaining aspect ratio)
            max_size = int(self.SIDEBAR_WIDTH * 0.8)  # Use 80% of sidebar width

            width, height = img.size
            if width > max_size or height > max_size:
                if width > height:
                    new_width = max_size
                    new_height = int(height * (max_size / width))
                else:
                    new_height = max_size
                    new_width = int(width * (max_size / height))
                img = img.resize((new_width, new_height), Image.LANCZOS)  # High-quality resize
            else:
                new_width = width
                new_height = height

            # Center in sidebar
            x_center = self.SIDEBAR_WIDTH / 2
            rect = fitz.Rect(
                x_center - new_width / 2,  # Left
                10,  # Top
                x_center + new_width / 2,  # Right
                10 + new_height  # Bottom
            )

            # Save the resized image
            img_path = "resized_profile.png"
            img.save(img_path, quality=95)

            page.insert_image(rect, filename=img_path)
        except Exception as e:
            print("Error loading profile picture:", e)


def generate_cv_from_form_data(cv_data, upload_folder, language='fr'):
    """Helper function to generate CV from form data with language selection"""
    print(f"Generating CV in {language} language with data: {cv_data}")
    generator = CVGenerator(cv_data, upload_folder, language)
    return generator.generate()
