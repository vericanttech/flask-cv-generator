from app import create_app

if __name__ == '__main__':
    app = create_app('testing')  # or 'testing', 'development'
    app.run(debug=True, port=5000)
