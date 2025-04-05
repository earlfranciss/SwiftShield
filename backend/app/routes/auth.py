from flask import Blueprint, request, jsonify
from app import db, bcrypt
from bson.objectid import ObjectId
import re
from datetime import datetime

bp = Blueprint("auth", __name__, url_prefix="/auth")

users = db.get_collection("Users")

@bp.route("/Registration", methods=['POST'])
def Registration():
    data = request.json
    
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    contact_number = data.get('contactNumber')

    # Validate required fields
    if not email or not password or not first_name or not last_name or not contact_number:
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
            'created_at': datetime.now(),
            'last_login': None,
            'role': 'user',
            'scans': []
        }

        # Insert the new user
        result = users.insert_one(new_user)

        if not result.acknowledged:
            return jsonify({"error": "Failed to insert user into database"}), 500

        print(f"User registered successfully: {email}")

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
            return jsonify({"error": "Invalid email or password"}), 401

        # Verify password
        if not bcrypt.check_password_hash(user['password'], password):
            return jsonify({"error": "Invalid email or password"}), 401

        # Update last login time
        users.update_one({'_id': user['_id']}, {"$set": {"last_login": datetime.now()}})

        return jsonify({
            "message": "Login successful",
            "userId": str(user['_id']),
            "email": user['email'],
            "firstName": user['firstName']
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500 