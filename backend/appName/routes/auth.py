from flask import Blueprint, request, jsonify
from app import db, bcrypt
from bson.objectid import ObjectId
import re
import pytz
from flask import session
from datetime import datetime
from functools import wraps


bp = Blueprint("auth", __name__, url_prefix="/auth")

users = db.get_collection("Users")

PH_TZ = pytz.timezone("Asia/Manila")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            print("DEBUG: Access denied. User not logged in.")
            return jsonify({"error": "Authentication required"}), 401
        # Optionally: Check if user_id still exists in DB
        user = users.find_one({"_id": session['user_id']})
        if not user:
            session.clear() # Clear invalid session
            print("DEBUG: Access denied. User ID from session not found in DB.")
            return jsonify({"error": "Invalid session, please log in again"}), 401
        return f(*args, **kwargs)
    return decorated_function


@bp.route("/Registration", methods=['POST'])
def Registration():
    # Public endpoint
    data = request.json
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    contact_number = data.get('contactNumber')

    # Validate required fields
    if not all([email, password, first_name, last_name, contact_number]):
        return jsonify({"error": "All fields are required"}), 400

    # Validate email format
    import re
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    # Validate password strength
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    # Check if user already exists
    existing_user = users.find_one({'email': email})
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 400

    try:
        # Hash the password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        # Generate a unique user ID
        user_id = str(ObjectId())

        # Create user document
        new_user = {
            '_id': user_id,
            'email': email,
            'password': hashed_password,
            'firstName': first_name,
            'lastName': last_name,
            'contactNumber': contact_number,
            'created_at': datetime.now(PH_TZ),
            'last_login': None,
            'role': 'user',
        }

        # Insert the new user
        result = users.insert_one(new_user)

        if not result.acknowledged:
            return jsonify({"error": "Failed to insert user into database"}), 500

        print(f"User registered successfully: {email}, Role: user")

        return jsonify({
            "message": "User registered successfully",
            "userId": user_id,
            "email": email,
            "firstName": first_name,
            "redirect": "/Login" 
        }), 201

    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@bp.route("/Login", methods=['POST'])
def Login():
    try:
        data = request.json
        if not data:
                    return jsonify({"error": "Invalid request, expected JSON"}), 400  

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Check if user exists
        user = users.find_one({'email': email})
        if not user:
            return jsonify({"error": "No user found with email"}), 401

        # Verify password
        if not bcrypt.check_password_hash(user['password'], password):
            return jsonify({"error": "Incorrect password"}), 401

        # --- Login Successful - Set Session ---
        session['user_id'] = str(user['_id'])
        session['role'] = user.get('role', 'user')
        session['email'] = user['email']
        session['firstName'] = user.get('firstName', '') 


        # Update last login time
        users.update_one(
            {'_id': user['_id']}, 
            {"$set": {"last_login": datetime.now(PH_TZ)}}
        )

        return jsonify({
            "message": "Login successful",
            "userId": session['user_id'],
            "email": session['email'],
            "firstName": session['firstName'],
            "role": session['role'], 
            # "redirect": "/Dashboard"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500 
    

@bp.route("/Logout", methods=['POST'])
@login_required # Ensure user is logged in to log out
def Logout():
    user_email = session.get('email', 'Unknown user')
    session.clear() # Clear all session data
    print(f"✅ User logged out: {user_email}")
    return jsonify({"message": "Logout successful"}), 200

