import re
import traceback
import uuid
from functools import wraps
from io import BytesIO
from pdf2image import convert_from_path
import requests
from google.generativeai import GenerativeModel
import google.generativeai as genai
from flask import (Blueprint, render_template, request, redirect, url_for,
                   flash, session, send_file, make_response, jsonify, Response, g, current_app)
import json

from .cv_generator import generate_cv_from_form_data
from .forms import CVForm, EducationForm, ExperienceForm, SkillForm, LanguageForm, CertificationForm, HobbyForm, \
    ReferenceForm, SoftwareEntryForm
from werkzeug.utils import secure_filename
from datetime import datetime
from flask_babel import gettext as _, get_locale
import os

main = Blueprint('main', __name__)

genai.configure(api_key=os.getenv('GOOGLE_AI_API_KEY'))

datepicker_translations = {
    'fr': {
        'months': [
            'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
        ],
        'days': ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
        'selectDate': 'Sélectionner une date'
    },
    'en': {
        'months': [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
        'days': ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        'selectDate': 'Select a date'
    },
    'tr': {
        'months': [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ],
        'days': ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'],
        'selectDate': 'Bir tarih seçin'
    }
}


def payment_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow access if in test mode
        if current_app.config.get('TEST_MODE_ENABLED'):
            return f(*args, **kwargs)

        # Check if payment has been made
        if not session.get('payment_verified'):
            return redirect(url_for('main.payment_page'))
        return f(*args, **kwargs)

    return decorated_function


def limit_free_usage(max_uses=3):
    """
    Decorator to limit free usage of a route.
    Args:
        max_uses (int): Maximum number of free uses. Defaults to 3.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Always allow in testing mode
            if current_app.config.get('TEST_MODE_ENABLED'):
                return f(*args, **kwargs)

            # Track usage in session
            usage_count = session.get('free_usage_count', 0)
            print(usage_count)

            if usage_count < max_uses:
                # Increment usage count
                session['free_usage_count'] = usage_count + 1
                return f(*args, **kwargs)
            else:
                # Limit reached, redirect to payment
                flash(_('Limite d\'utilisations gratuites atteinte. Veuillez procéder au paiement.'), 'warning')
                return redirect(url_for('main.payment_page'))

        return decorated_function

    return decorator


@main.route('/toggle-test-mode')
def toggle_test_mode():
    if current_app.config.get('TEST_MODE_ENABLED'):
        session['tester_mode'] = not session.get('tester_mode', False)
        mode = _("activé") if session.get('tester_mode') else _("désactivé")
        flash(_('Mode test %(mode)s', mode=mode), 'info')
    else:
        flash(_('Le mode test n est pas disponible'), 'warning')
    return redirect(url_for('main.create_cv'))


@main.route('/preview-pdf-thumbnail')
def preview_pdf_thumbnail():
    pdf_path = os.path.join(current_app.config['UPLOAD_FOLDER'], session.get('generated_cv'))

    if not os.path.exists(pdf_path):
        return "PDF file not found", 404

    # Generate an image filename based on the session
    image_filename = f"{session.get('generated_cv').split('.')[0]}_preview.png"
    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], image_filename)

    # Convert only the first page of the PDF to an image (if it doesn’t already exist)
    if not os.path.exists(image_path):
        images = convert_from_path(pdf_path, first_page=1, last_page=1)
        images[0].save(image_path, 'PNG')

    return send_file(image_path, mimetype='image/png')


def add_preview_watermark(input_path, output_path):
    """
    Add a watermark to the PDF preview.
    This function requires PyPDF2 and reportlab packages.

    pip install PyPDF2 reportlab
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        import io

        # Create watermark
        watermark_stream = io.BytesIO()
        c = canvas.Canvas(watermark_stream, pagesize=letter)

        # Draw diagonal watermark text
        c.saveState()
        c.translate(100, 400)  # Reduced x translation to move left
        c.rotate(45)
        c.setFont("Helvetica", 60)
        c.setFillColorRGB(0, 0, 1, alpha=0.3)
        c.drawString(0, 0, _("APERÇU SEULEMENT"))
        c.drawString(0, -100, _("PAIEMENT REQUIS"))
        c.restoreState()

        # Finalize the watermark
        c.save()
        watermark_stream.seek(0)

        # Create watermark PDF
        from PyPDF2 import PdfReader as Reader  # Renamed to avoid conflict
        watermark_pdf = Reader(watermark_stream)
        watermark_page = watermark_pdf.pages[0]

        # Apply watermark to each page
        pdf_reader = PdfReader(input_path)
        pdf_writer = PdfWriter()

        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            page.merge_page(watermark_page)
            pdf_writer.add_page(page)

        # Save the watermarked PDF
        with open(output_path, 'wb') as out_file:
            pdf_writer.write(out_file)

        return True
    except ImportError:
        # If PyPDF2 or reportlab is not installed, just copy the file
        import shutil
        shutil.copy(input_path, output_path)
        current_app.logger.warning("PyPDF2 or reportlab not installed. Watermark not applied.")
        return False
    except Exception as e:
        current_app.logger.error(f"Error applying watermark: {str(e)}")
        import shutil
        shutil.copy(input_path, output_path)
        return False


@main.route('/payment-page')
def payment_page():
    if 'generated_cv' not in session:
        flash('No CV has been generated yet.', 'error')
        return redirect(url_for('main.create_cv'))

    # Get the CV path to preview
    cv_path = os.path.join(current_app.config['UPLOAD_FOLDER'], session['generated_cv'])
    if not os.path.exists(cv_path):
        flash('Generated CV file not found.', 'error')
        return redirect(url_for('main.create_cv'))

    # Debug: Print config values
    # print("Config values:", current_app.config)

    # Prepare payment data
    try:
        payment_data = {
            "amount": current_app.config['PAYMENT_AMOUNT'],  # Use dictionary access
            "currency": current_app.config['CURRENCY'],
            "payment_method": "wave",
            "description": _("Télécharger le CV en PDF"),
            "transaction_id": str(uuid.uuid4()),
            "customer_name": session.get('cv_data', {}).get('personal_info', {}).get('name', 'Customer'),
            "callback_url": url_for('main.payment_callback', _external=True)
        }
    except KeyError as e:
        print(f"Missing config key: {e}")
        return "Configuration error, check logs", 500

    # Store payment data in session
    session['payment_data'] = payment_data

    return render_template('payment.html',
                           payment_data=payment_data,
                           test_mode=current_app.config.get("TEST_MODE_ENABLED"), now=datetime.now())


@main.route('/initiate-payment', methods=['POST'])
def initiate_payment():
    try:
        # Get payment data from session
        payment_data = session.get('payment_data')
        if not payment_data:
            return jsonify({'error': 'No payment data found'}), 400

        # Call Wave API to initiate payment
        headers = {
            'Authorization': f"Bearer {current_app.config['WAVE_API_KEY']}",
            'Content-Type': 'application/json'
        }

        response = requests.post(
            f"{current_app.config['WAVE_API_URL']}/checkout/sessions",
            headers=headers,
            json=payment_data
        )

        if response.status_code != 200:
            return jsonify({'error': 'Failed to initiate payment with Wave'}), 500

        payment_response = response.json()

        # Store the payment session ID
        session['wave_payment_id'] = payment_response.get('id')

        # Return the payment URL to redirect the user
        return jsonify({
            'success': True,
            'payment_url': payment_response.get('payment_url')
        })

    except Exception as e:
        current_app.logger.error(f'Error initiating payment: {str(e)}')
        return jsonify({'error': str(e)}), 500


@main.route('/payment-callback')
def payment_callback():
    payment_id = request.args.get('id')
    status = request.args.get('status')

    # Verify the payment status with Wave
    if payment_id and status == 'successful':
        # Verify with Wave API
        headers = {
            'Authorization': f'Bearer {current_app.config.WAVE_API_KEY}',
            'Content-Type': 'application/json'
        }

        response = requests.get(
            f"{current_app.config['WAVE_API_URL']}/checkout/sessions/{payment_id}",
            headers=headers
        )

        if response.status_code == 200:
            payment_data = response.json()
            if payment_data.get('status') == 'successful':
                # Mark payment as verified in session
                session['payment_verified'] = True
                flash('Payment successful! You can now download your CV.', 'success')
                return redirect(url_for('main.preview_pdf'))

    # Payment failed or verification failed
    flash('Payment verification failed. Please try again.', 'error')
    return redirect(url_for('main.payment_page'))


# gemini-2.0-flash
def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


@main.route('/')
def index():
    return render_template('index.html', now=datetime.now())


@main.route('/templates')
def choose_template():
    """Render the template selection page"""
    return render_template('choose_template.html', now=datetime.now())


@main.route('/set_template', methods=['POST'])
def set_template():
    """Store the selected template in the session"""
    data = request.get_json()
    template_id = data.get('template')

    if template_id:
        session['selected_template'] = template_id
        return jsonify({'success': True})

    return jsonify({'success': False, 'error': 'No template selected'})

    # Get the selected template from the session, default to 'template1' if none is selected
    # template = session.get('selected_template', 'template1')
    # I need a function to chose which template to use


@main.route('/set_language/<lang>')
def set_language(lang):
    if lang in ['en', 'fr', 'tr']:  # Validate the language
        session['lang'] = lang
        session.modified = True  # Ensure the session is saved

    # Check if it's an AJAX request
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'status': 'success', 'language': lang})

    # Regular request - redirect back
    return redirect(request.referrer or url_for('main.index'))


@main.route('/debug_translations')
def debug_translations():
    current_locale = get_locale()
    babel_translation_directories = current_app.config.get('BABEL_TRANSLATION_DIRECTORIES', 'translations')

    # Try to get the translation path
    import os
    translation_path = os.path.join(
        current_app.root_path,
        babel_translation_directories,
        str(current_locale),
        'LC_MESSAGES',
        'messages.mo'
    )

    file_exists = os.path.exists(translation_path)

    return {
        'current_locale': str(current_locale),
        'translation_path': translation_path,
        'file_exists': file_exists,
        'app_root_path': current_app.root_path,
        'babel_translation_directories': babel_translation_directories
    }


@main.route('/create-cv', methods=['GET', 'POST'])
@limit_free_usage(max_uses=5)  # Allow 3 free uses
def create_cv():
    form = CVForm()
    selected_lang = session.get('lang', 'fr')
    translations = datepicker_translations.get(selected_lang, datepicker_translations['fr'])
    if request.method == 'POST':
        if form.validate_on_submit():

            # Helper function to convert None to empty string
            def clean_value(value):
                return "" if value is None else value

            # Helper function to clean dictionary values
            def clean_dict(d):
                return {k: clean_value(v) for k, v in d.items()}

            # Handle photo upload
            if form.photo.data:
                file = form.photo.data
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    session['photo_path'] = filepath

            # Store form data in session with cleaned values
            session['cv_data'] = {
                'personal_info': clean_dict({
                    'first_name': form.first_name.data,
                    'last_name': form.last_name.data,
                    'email': form.email.data,
                    'phone': form.phone.data,
                    'address': form.address.data,
                    'city': form.city.data,
                    'professional_summary': form.professional_summary.data  # form.professional_summary.data
                }),
                'education': [clean_dict(dict(ed)) for ed in form.education.data if any(ed.values())],
                'experience': [clean_dict(dict(exp)) for exp in form.experience.data if any(exp.values())],
                'skills': [clean_dict(dict(skill)) for skill in form.skills.data if any(skill.values())],
                'languages': [clean_dict(dict(lang)) for lang in form.languages.data if any(lang.values())],
                'certifications': [clean_dict(dict(cert)) for cert in form.certifications.data if any(cert.values())],
                'hobbys': [clean_dict(dict(hobby)) for hobby in form.hobbys.data if any(hobby.values())],
                'references': [clean_dict(dict(ref)) for ref in form.references.data if any(ref.values())],
                'softwares': [clean_dict(dict(ref)) for ref in form.softwares.data if any(ref.values())]

            }

            return redirect(url_for('main.preview_cv'))
        else:
            print("Form errors:", form.errors)

    return render_template('cv_form.html', form=form, now=datetime.now(), translations=jsonify(translations).get_json())


@main.route('/preview-cv')
def preview_cv():
    # Get CV data from session
    cv_data = session.get('cv_data')
    if not cv_data:
        flash('No CV data found. Please fill out the form first.', 'error')
        return redirect(url_for('main.create_cv'))

    # Get photo path if it exists
    photo_path = session.get('photo_path')

    # Convert full system path to relative path for template
    if photo_path:
        # Extract the part after 'static/'
        relative_path = photo_path.split('static/')[-1] if 'static/' in photo_path else None
        # Replace backslashes with forward slashes if present
        relative_path = relative_path.replace('\\', '/') if relative_path else None
    else:
        relative_path = None

    return render_template(
        'cv_preview.html',
        cv_data=cv_data,
        photo_path=relative_path,
        now=datetime.now()
    )


@main.route('/preview-pdf')
@payment_required  # This decorator checks if payment has been made
@limit_free_usage(max_uses=3)  # Allow 3 free uses
def preview_pdf():
    try:
        if 'generated_cv' not in session:
            flash('No CV has been generated yet.', 'error')
            return redirect(url_for('main.create_cv'))

        cv_path = os.path.join(current_app.config['UPLOAD_FOLDER'], session['generated_cv'])
        if not os.path.exists(cv_path):
            flash('Generated CV file not found.', 'error')
            return redirect(url_for('main.create_cv'))

        return send_file(cv_path, as_attachment=False)
    except Exception as e:
        flash(f'Error previewing CV: {str(e)}', 'error')
        return redirect(url_for('main.create_cv'))


@main.route('/download-pdf')
@payment_required  # This decorator checks if payment has been made
@limit_free_usage(max_uses=3)  # Allow 3 free uses
def download_pdf():
    try:
        if 'generated_cv' not in session:
            flash('No CV has been generated yet.', 'error')
            return redirect(url_for('main.create_cv'))

        cv_path = os.path.join(current_app.config['UPLOAD_FOLDER'], session['generated_cv'])
        if not os.path.exists(cv_path):
            flash('Generated CV file not found.', 'error')
            return redirect(url_for('main.create_cv'))

        # Send file as attachment (for downloading)
        return send_file(cv_path, as_attachment=True, download_name=session['generated_cv'])
    except Exception as e:
        flash(f'Error downloading CV: {str(e)}', 'error')
        return redirect(url_for('main.create_cv'))


@main.route('/save-cv-edits', methods=['POST'])
def save_cv_edits():
    try:
        # Get the complete data structure from the request
        updated_cv_data = request.json

        # Validate input
        if not updated_cv_data:
            return jsonify({
                'status': 'error',
                'message': 'No data received'
            }), 400

        # Simply replace the entire CV data in the session
        session['cv_data'] = updated_cv_data
        session.modified = True

        # Log the updated session data
        # print("Updated session data:")
        # print(json.dumps(session['cv_data'], indent=2))

        return jsonify({
            'status': 'success',
            'message': 'CV data updated successfully'
        })

    except Exception as e:
        # Log the full error traceback
        print("Error saving CV edits:")
        traceback.print_exc()

        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@main.route('/process-pdf', methods=['POST'])
@limit_free_usage(max_uses=3)  # Allow 3 free uses
def process_pdf():
    try:
        # Ensure session has CV data
        if 'cv_data' not in session:
            raise ValueError('No CV data found in session.')

        # Retrieve selected language (default to 'fr' if not set)
        selected_lang = session.get('lang', 'fr')

        # Delete old CV file if it exists
        old_cv_filename = session.get('generated_cv')
        if old_cv_filename:
            old_cv_path = os.path.join(current_app.config['UPLOAD_FOLDER'], old_cv_filename)
            if os.path.exists(old_cv_path):
                os.remove(old_cv_path)
                current_app.logger.info(f'Deleted old CV file: {old_cv_filename}')

        # Generate new CV
        cv_filename = generate_cv_from_form_data(
            session['cv_data'],
            current_app.config['UPLOAD_FOLDER'],
            selected_lang
        )
        session['generated_cv'] = cv_filename

        # Redirect logic
        if current_app.config.get('TEST_MODE_ENABLED') and session.get('tester_mode'):
            return redirect(url_for('main.preview_pdf'))

        return redirect(url_for('main.payment_page'))

    except Exception as e:
        current_app.logger.error(f'Error processing PDF: {str(e)}')
        return jsonify({'error': str(e)}), 500


@main.route('/add-field/<field_type>')
def add_field(field_type):
    """AJAX endpoint for dynamically adding form fields"""
    if field_type == 'education':
        form = EducationForm()
    elif field_type == 'experience':
        form = ExperienceForm()
    elif field_type == 'skill':
        form = SkillForm()
    elif field_type == 'language':
        form = LanguageForm()
    elif field_type == 'certification':
        form = CertificationForm()
    elif field_type == 'hobby':
        form = HobbyForm()
    elif field_type == 'software':
        form = SoftwareEntryForm()
    elif field_type == 'reference':
        form = ReferenceForm()
    else:
        return 'Invalid field type', 400

    return render_template(f'_partials/{field_type}_form.html', form=form)


# AIzaSyBh-ZJ5D144Dbk8X0so6aCWEaHN7V0QTpk

@main.route('/generate-experience-description', methods=['POST'])
def generate_experience_description():
    try:
        experience_data = request.json

        # Validation des champs obligatoires
        if not experience_data.get('company') or not experience_data.get('position'):
            return jsonify({'error': 'L\'entreprise et le poste sont requis'}), 400

        company = experience_data.get('company', '')
        position = experience_data.get('position', '')
        start_date = experience_data.get('start_date', '')
        end_date = experience_data.get('end_date', '')
        skills = experience_data.get('skills', '')
        selected_lang_code = experience_data.get('ui_lang') or session.get('lang', 'fr')

        # Language dictionary
        language_dict = {
            'fr': 'français',
            'tr': 'Türkçe',
            'en': 'English'
        }

        # Validate language code
        if selected_lang_code not in language_dict:
            return jsonify({'error': 'Langue non prise en charge'}), 400

        selected_lang_name = language_dict[selected_lang_code]

        # Création d'un prompt contextuel pour l'IA
        prompt = f"""
        Génère une description de poste pour un CV, en {selected_lang_name}, en utilisant uniquement les informations suivantes,
         sans phrase d'introduction ni de conclusion :
        Entreprise: {company}
        Poste: {position}
        Date de début: {start_date}
        Date de fin: {end_date}
        Compétences: {skills}
        Écris la réponse en {selected_lang_name}

        La description doit :
        - Mettre en évidence les réalisations, responsabilités et compétences.
        - Utiliser un ton professionnel et des verbes d'action.
        - Être structurée en 3 à 5 phrases maximum, sous forme de points.

        Exemple de format :
        - Réalisation 1.
        - Responsabilité 1.
        - Compétence 1.
        """

        # Initialisation du modèle
        model = GenerativeModel('gemini-2.0-flash')

        # Génération de contenu avec flux
        response = model.generate_content(prompt, stream=True)

        def generate():
            full_text = ""
            for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    yield f"data: {json.dumps({'description': full_text})}\n\n"

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        current_app.logger.error(f'Erreur lors de la génération de la description de l\'expérience : {str(e)}')
        return jsonify({'error': str(e)}), 500


@main.route('/generate-professional-summary', methods=['POST'])
def generate_professional_summary():
    try:
        data = request.json

        # Validate required fields
        # not data.get('first_name') or not data.get('last_name') or
        if not data.get('guidance'):
            return jsonify({'error': 'All fields are required'}), 400

        selected_lang = data.get('ui_lang') or session.get('lang', 'fr')

        # Create a contextual prompt for the AI
        prompt = f"""
        Generate a professional summary for a CV/resume with the following details:
        - Name: {data['first_name']} {data['last_name']}

        Additional context provided by the person:
        {data['guidance']}

        The summary should be:
        - Professional and engaging
        - 3-4 sentences maximum
        - Highlight expertise and key achievements
        - Written in first person
        - In {selected_lang} language

        Important: Provide ONLY the summary text, without any explanations or additional notes.
        """

        # Initialize the model
        model = GenerativeModel('gemini-2.0-flash')

        # Generate content with streaming
        response = model.generate_content(prompt, stream=True)

        def generate():
            full_text = ""
            for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    yield f"data: {json.dumps({'summary': full_text})}\n\n"

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        current_app.logger.error(f'Error generating professional summary: {str(e)}')
        return jsonify({'error': str(e)}), 500


@main.route('/customize-cv-for-job', methods=['POST'])
def customize_cv_for_job():
    try:
        data = request.json

        # Validate required fields
        if not data.get('jobDescription') or not data.get('cvData'):
            return jsonify({'error': 'Job description and CV data are required'}), 400

        # Extract data
        job_description = data['jobDescription']
        career_goals = data.get('careerGoals', '')
        cv_data = data['cvData']

        selected_lang = session.get('lang', 'fr')

        # Create a contextual prompt for the AI
        prompt = f"""
        You are a professional CV/resume writer specializing in tailoring CVs to match specific job descriptions.

        I want you to optimize the following CV data to better match this job description:

        JOB DESCRIPTION:
        {job_description}

        {'CAREER GOALS: ' + career_goals if career_goals else ''}

        CV DATA (current information):
        {json.dumps(cv_data, indent=2)}

        Please analyze the job description and modify the CV data to better match the requirements. Focus on:

        1. Rewriting the professional summary to highlight relevant experience
        2. Adjusting experience descriptions to emphasize relevant skills and achievements
        3. Prioritizing skills that match the job requirements
        4. Keep the same formatting and structure, just optimize the content
        5. Write in {selected_lang} language

        Return ONLY the modified CV data in the same JSON structure as the input data, with no explanations.
        """

        # Initialize the model
        model = GenerativeModel('gemini-2.0-flash')

        # Generate content
        response = model.generate_content(prompt)

        # Parse the response - assume it's valid JSON
        try:
            customized_cv = json.loads(response.text)
        except json.JSONDecodeError:
            # If not valid JSON, try to extract JSON from the response
            # This is a fallback in case the model adds extra text
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response.text)
            if json_match:
                customized_cv = json.loads(json_match.group(1))
            else:
                raise ValueError("Failed to parse AI response as JSON")

        return jsonify({
            'status': 'success',
            'customizedCV': customized_cv
        })

    except Exception as e:
        current_app.logger.error(f'Error customizing CV: {str(e)}')
        return jsonify({'error': str(e)}), 500


@main.route('/js/translations.js')
def js_translations():
    # Get the current language from the session
    current_lang = session.get('lang', 'fr')

    # Define translations for each language
    translations = {
        'fr': {
            'editCV': 'Modifier le CV',
            'quitEditMode': 'Quitter le mode édition',
            'generatingCV': 'Génération du CV',
            'errorRetry': 'Erreur - Réessayez',
            'saveSuccess': 'Modifications enregistrées avec succès!',
            'saveError': 'Erreur lors de l\'enregistrement des modifications : ',
            'unknownError': 'Erreur inconnue',
            'jobDescriptionRequired': 'Veuillez remplir la description du poste',
            'customizationSuccess': 'CV personnalisé avec succès!',
            'customizationError': 'Erreur lors de la personnalisation du CV : ',
            'warningTitle': 'Les modifications seront perdues',
            'warningMessage': 'Toutes les modifications que vous avez apportées seront perdues si vous quittez cette '
                              'page.',
            'stayButton': 'Rester sur la page',
            'leaveButton': 'Abandonner les modifications'
        },
        'en': {
            'editCV': 'Edit CV',
            'quitEditMode': 'Exit edit mode',
            'generatingCV': 'Generating CV',
            'errorRetry': 'Error - Try again',
            'saveSuccess': 'Changes saved successfully!',
            'saveError': 'Error saving changes: ',
            'unknownError': 'Unknown error',
            'jobDescriptionRequired': 'Please fill in the job description',
            'customizationSuccess': 'CV customized successfully!',
            'customizationError': 'Error customizing CV: ',
            'warningTitle': 'Changes will be lost',
            'warningMessage': 'All the changes you made will be lost if you navigate away from this page',
            'stayButton': 'Stay on Page',
            'leaveButton': 'Discard Changes'
        },
        'tr': {
            'editCV': 'CV Düzenle',
            'quitEditMode': 'Düzenleme modundan çık',
            'generatingCV': 'CV oluşturuluyor',
            'errorRetry': 'Hata - Tekrar deneyin',
            'saveSuccess': 'Değişiklikler başarıyla kaydedildi!',
            'saveError': 'Değişiklikleri kaydederken hata: ',
            'unknownError': 'Bilinmeyen hata',
            'jobDescriptionRequired': 'Lütfen iş tanımını doldurun',
            'customizationSuccess': 'CV başarıyla özelleştirildi!',
            'customizationError': 'CV özelleştirme hatası: ',
            'warningTitle': 'Değişiklikler Kaybolacak',
            'warningMessage': 'Bu sayfadan ayrılırsanız yaptığınız tüm değişiklikler kaybolacak',
            'stayButton': 'Sayfada Kal',
            'leaveButton': 'Değişiklikleri İptal Et'
        }
    }

    # Get translations for the current language, defaulting to French if not available
    lang_translations = translations.get(current_lang, translations['fr'])

    # Create JavaScript code with the translations
    js_content = f"""
    // Translation object to handle internationalization
    const cvTranslations = {json.dumps(lang_translations, ensure_ascii=False)};

    document.addEventListener('DOMContentLoaded', function() {{
        // Initialize all the components
        const cvEditor = new CVEditor();
        window.cvSaver = new CVSaver();
        const cvExporter = new CVExporter();
        const cvCustomizer = new CVCustomizer();
    }});
    """

    # Return as JavaScript
    response = make_response(js_content)
    response.headers['Content-Type'] = 'application/javascript'
    return response
