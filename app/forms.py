from flask_wtf import FlaskForm
from wtforms import (StringField, TextAreaField, DateField, FileField,
                     SelectField, FieldList, FormField, IntegerField, BooleanField, EmailField)
from wtforms.validators import DataRequired, Email, Length, Optional
from flask_wtf.file import FileAllowed
from flask_babel import lazy_gettext as _


class SoftwareEntryForm(FlaskForm):
    class Meta:
        csrf = False  # Temporarily disable CSRF for testing

    name = StringField('Software Name', validators=[Optional()])
    proficiency = SelectField('Proficiency Level',
                              choices=[(_('Débutant'), _('Débutant')),
                                       (_('Intermédiaire'), _('Intermédiaire')),
                                       (_('Avancé'), _('Avancé'))],
                              validators=[Optional()])


class CertificationForm(FlaskForm):
    class Meta:
        csrf = False  # Temporarily disable CSRF for testing

    name = StringField('Certification', validators=[Optional()])
    issuer = StringField('Issuer', validators=[Optional()])
    date = DateField('Date', validators=[Optional()])


class HobbyForm(FlaskForm):
    class Meta:
        csrf = False

    name = StringField('Loisir', validators=[Optional()])


class ReferenceForm(FlaskForm):
    class Meta:
        csrf = False  # Temporarily disable CSRF for testing

    name = StringField('Name', validators=[Optional()])
    company = StringField('Company', validators=[Optional()])
    contact = StringField('Contact', validators=[Optional()])


class EducationForm(FlaskForm):
    class Meta:
        csrf = False  # Temporarily disable CSRF for testing

    institution = StringField('Institution', validators=[Optional()])
    degree = StringField('Degree', validators=[Optional()])
    field_of_study = StringField('Field of Study', validators=[Optional()])

    start_date = DateField('Start Date', validators=[Optional()], render_kw={"type": "date"})
    end_date = DateField('End Date', validators=[Optional()], render_kw={"type": "date"})

    current = BooleanField('Current', validators=[Optional()])


class LanguageForm(FlaskForm):
    class Meta:
        csrf = False

    language = StringField('Langue', validators=[Optional()])
    level = StringField('Niveau', validators=[Optional()])


class ExperienceForm(FlaskForm):
    class Meta:
        csrf = False  # Temporarily disable CSRF for testing

    company = StringField('Company', validators=[Optional()])
    position = StringField('Position', validators=[Optional()])
    location = StringField('Location', validators=[Optional()])  # Changed to Optional
    start_date = DateField('Start Date', validators=[Optional()])
    end_date = DateField('End Date', validators=[Optional()])
    description_ = TextAreaField('Description', validators=[Optional()])
    is_current = BooleanField('Current', validators=[Optional()])  # Changed to Optional


class SkillForm(FlaskForm):
    class Meta:
        csrf = False

    skill = StringField('Compétence', validators=[Optional()])


class CVForm(FlaskForm):
    class Meta:
        csrf = True  # Temporarily disable CSRF for testing

    first_name = StringField('First Name', validators=[DataRequired()])
    last_name = StringField('Last Name', validators=[DataRequired()])
    email = EmailField('Email', validators=[Optional(), Email()])
    phone = StringField('Phone', validators=[Optional()])
    address = StringField('Address', validators=[Optional()])
    city = StringField('City', validators=[Optional()])  # Changed to Optional
    professional_summary = TextAreaField('Professional Summary', validators=[Optional()])
    photo = FileField('Photo', validators=[Optional()])

    # Education - Dynamic list of education entries
    education = FieldList(FormField(EducationForm), min_entries=1)

    # Work Experience - Dynamic list of experience entries
    experience = FieldList(FormField(ExperienceForm), min_entries=1)

    # Skills - Dynamic list of skills
    skills = FieldList(FormField(SkillForm), min_entries=1)

    # Languages
    languages = FieldList(FormField(LanguageForm), min_entries=1)

    # Additional Information
    certifications = FieldList(FormField(CertificationForm), min_entries=0)
    hobbys = FieldList(FormField(HobbyForm), min_entries=0)
    references = FieldList(FormField(ReferenceForm), min_entries=0)

    softwares = FieldList(FormField(SoftwareEntryForm), min_entries=1)
