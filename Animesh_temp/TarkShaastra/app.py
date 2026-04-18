import os
from flask import Flask, render_template, redirect, url_for, request, flash, session, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-12345')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        if user and user.password and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password', 'danger')
            
    return render_template('login.html', 
                           endpoint=os.getenv('APPWRITE_ENDPOINT'),
                           project_id=os.getenv('APPWRITE_PROJECT_ID'),
                           success_url=url_for('google_authorize', _external=True),
                           failure_url=url_for('login', _external=True))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    return render_template('signup.html',
                           endpoint=os.getenv('APPWRITE_ENDPOINT'),
                           project_id=os.getenv('APPWRITE_PROJECT_ID'),
                           verify_url=url_for('verify_email', _external=True))

@app.route('/verify-email')
def verify_email():
    return render_template('verify_email.html',
                           endpoint=os.getenv('APPWRITE_ENDPOINT'),
                           project_id=os.getenv('APPWRITE_PROJECT_ID'))

@app.route('/google-authorize')
def google_authorize():
    return render_template('google_authorize.html',
                           endpoint=os.getenv('APPWRITE_ENDPOINT'),
                           project_id=os.getenv('APPWRITE_PROJECT_ID'))

@app.route('/google-finish', methods=['POST'])
def google_finish():
    data = request.get_json()
    email = data.get('email')
    name = data.get('name')
    google_id = data.get('id')
    category = data.get('category')
    employee_id = data.get('employee_id')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            google_id=google_id,
            officer_category=category,
            employee_id=employee_id,
            password=generate_password_hash(password) if password else None
        )
        db.session.add(user)
    else:
        # Update existing user fields if they are provided
        if name: user.name = name
        if google_id: user.google_id = google_id
        if category: user.officer_category = category
        if employee_id: user.employee_id = employee_id
        # Only set password if it's currently missing and provided now
        if password and not user.password:
            user.password = generate_password_hash(password)
            
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": "Database sync failed: Possible duplicate entry."}), 400
        
    login_user(user)
    return jsonify({"status": "success"})

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
