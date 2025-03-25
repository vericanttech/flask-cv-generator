# Add this to your project structure
# /tests/test_payment.py

import unittest
from flask import session
from app import create_app, db
from unittest.mock import patch, MagicMock
import json
import os


class PaymentTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app.config['TESTING'] = True
        self.app.config['WTF_CSRF_ENABLED'] = False
        self.app.config['TEST_MODE_ENABLED'] = True
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Setup test data
        self.test_cv_data = {
            'personal_info': {
                'name': 'Test User',
                'email': 'test@example.com',
                'phone': '123456789'
            },
            'education': [
                {
                    'degree': 'Bachelor',
                    'institution': 'Test University',
                    'year': '2020'
                }
            ],
            'experience': [
                {
                    'title': 'Developer',
                    'company': 'Test Company',
                    'years': '2020-2022'
                }
            ]
        }

        # Create a test PDF file
        test_pdf_path = os.path.join(self.app.config['UPLOAD_FOLDER'], 'test_cv.pdf')
        with open(test_pdf_path, 'w') as f:
            f.write('Test PDF Content')

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

        # Remove test PDF file
        test_pdf_path = os.path.join(self.app.config['UPLOAD_FOLDER'], 'test_cv.pdf')
        if os.path.exists(test_pdf_path):
            os.remove(test_pdf_path)

    def test_process_pdf_with_test_mode(self):
        """Test PDF generation with test mode enabled"""
        with self.client.session_transaction() as sess:
            sess['cv_data'] = self.test_cv_data
            sess['tester_mode'] = True

        response = self.client.post('/process-pdf', follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Preview', response.data)  # Assuming preview has "Preview" in the title

    def test_process_pdf_without_test_mode(self):
        """Test PDF generation without test mode should redirect to payment"""
        with self.client.session_transaction() as sess:
            sess['cv_data'] = self.test_cv_data
            sess['tester_mode'] = False

        response = self.client.post('/process-pdf', follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Paiement', response.data)  # Assuming payment page has "Paiement" in the title

    @patch('requests.post')
    def test_initiate_payment(self, mock_post):
        """Test initiating payment with Wave API"""
        # Mock the Wave API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 'test_payment_id',
            'payment_url': 'https://wave.com/pay/test'
        }
        mock_post.return_value = mock_response

        with self.client.session_transaction() as sess:
            sess['payment_data'] = {
                'amount': 1000,
                'currency': 'XOF',
                'description': 'CV PDF Download'
            }

        response = self.client.post('/initiate-payment')
        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['payment_url'], 'https://wave.com/pay/test')

    @patch('requests.get')
    def test_payment_callback_success(self, mock_get):
        """Test successful payment callback"""
        # Mock the Wave API verification response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 'test_payment_id',
            'status': 'successful'
        }
        mock_get.return_value = mock_response

        with self.client.session_transaction() as sess:
            sess['generated_cv'] = 'test_cv.pdf'

        response = self.client.get('/payment-callback?id=test_payment_id&status=successful', follow_redirects=True)

        with self.client.session_transaction() as sess:
            self.assertTrue(sess.get('payment_verified'))

        self.assertEqual(response.status_code, 200)

    def test_download_pdf_with_payment(self):
        """Test downloading PDF after payment"""
        with self.client.session_transaction() as sess:
            sess['generated_cv'] = 'test_cv.pdf'
            sess['payment_verified'] = True

        response = self.client.get('/download-pdf')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Content-Disposition'], 'attachment; filename=test_cv.pdf')

    def test_download_pdf_without_payment(self):
        """Test attempting to download PDF without payment"""
        with self.client.session_transaction() as sess:
            sess['generated_cv'] = 'test_cv.pdf'
            sess['payment_verified'] = False

        response = self.client.get('/download-pdf', follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Payment required', response.data)

    def test_toggle_test_mode(self):
        """Test toggling test mode"""
        response = self.client.get('/toggle-test-mode', follow_redirects=True)

        with self.client.session_transaction() as sess:
            self.assertTrue(sess.get('tester_mode'))

        # Toggle again
        response = self.client.get('/toggle-test-mode', follow_redirects=True)

        with self.client.session_transaction() as sess:
            self.assertFalse(sess.get('tester_mode'))


if __name__ == '__main__':
    unittest.main()
