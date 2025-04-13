import os
from flask import Blueprint, request, jsonify, session, redirect, url_for, current_app
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app import db # Assuming db is initialized in __init__

bp = Blueprint("google_auth", __name__, url_prefix="/google")

# Ensure client_secrets.json is NOT needed if using config vars directly
# flow = Flow.from_client_secrets_file(
#     'path/to/your/client_secret_web.json', # Download this from Google Cloud Console if preferred
#     scopes=current_app.config['GOOGLE_SCOPES'],
#     redirect_uri=current_app.config['GOOGLE_REDIRECT_URI'])

# --- OAuth Initiation Endpoint ---
@bp.route("/login")
def google_login():
    # Use config variables directly
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [current_app.config['GOOGLE_REDIRECT_URI']],
                 # Add auth_provider_x509_cert_url and client_x509_cert_url if needed, often not
            }
        },
        scopes=current_app.config['GOOGLE_SCOPES'],
        redirect_uri=current_app.config['GOOGLE_REDIRECT_URI']
    )

    # Generate authorization URL
    authorization_url, state = flow.authorization_url(
        access_type='offline', # Request refresh token
        prompt='consent',      # Force consent screen for refresh token
        include_granted_scopes='true'
    )

    # Store state in session for CSRF protection
    session['oauth_state'] = state
    # Store the intended final redirect for the frontend (optional but helpful)
    # You might pass this as a query param from the frontend initially
    session['final_redirect_uri'] = request.args.get('final_redirect', 'swiftshield://google/auth/success') # Default deep link

    print(f"Generated Auth URL: {authorization_url}") # Debugging
    print(f"Stored state: {state}") # Debugging

    # Redirect user to Google's OAuth page
    return redirect(authorization_url)

# --- OAuth Callback Endpoint ---
@bp.route("/callback")
def google_callback():
    # Verify state to prevent CSRF
    received_state = request.args.get('state')
    expected_state = session.get('oauth_state')

    print(f"Callback received state: {received_state}") # Debugging
    print(f"Callback expected state: {expected_state}") # Debugging

    if not received_state or received_state != expected_state:
        print("Error: State mismatch.") # Debugging
        final_redirect = session.pop('final_redirect_uri', 'swiftshield://google/auth/error?reason=state_mismatch')
        return redirect(final_redirect)

    # Clear state from session
    session.pop('oauth_state', None)

    # Initialize flow again (needed to fetch token)
    flow = Flow.from_client_config(
         client_config={
            "web": {
                "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [current_app.config['GOOGLE_REDIRECT_URI']],
            }
        },
        scopes=current_app.config['GOOGLE_SCOPES'],
        redirect_uri=current_app.config['GOOGLE_REDIRECT_URI'],
        state=received_state # Pass state back to flow for verification
    )

    try:
        # Exchange authorization code for tokens
        flow.fetch_token(authorization_response=request.url)

        # Get credentials (includes access_token, refresh_token, expiry, etc.)
        credentials = flow.credentials
        refresh_token = credentials.refresh_token # THIS IS THE KEY TOKEN TO STORE

        # --- Get User Info (Optional but good practice) ---
        # Build service object to get user's email
        user_info_service = build('oauth2', 'v2', credentials=credentials)
        user_info = user_info_service.userinfo().get().execute()
        user_email = user_info.get('email')
        print(f"Successfully obtained tokens for user: {user_email}") # Debugging

        if not user_email:
             raise ValueError("Could not retrieve user email from Google.")

        # --- Store Refresh Token Securely ---
        # Assuming you have a way to identify the current user of *your* app
        # Maybe from your app's own login session stored in Flask session?
        # For example: app_user_id = session.get('user_id')
        app_user_id = "PLACEHOLDER_GET_YOUR_APP_USER_ID" # !!! REPLACE THIS !!!

        if not app_user_id:
            raise ValueError("Application user ID not found in session.")

        users_collection = db.get_collection("Users")
        users_collection.update_one(
            {'_id': app_user_id}, # Find your app user
            {'$set': { # Store Google credentials securely
                'google_refresh_token': refresh_token,
                'google_email': user_email, # Link the Google account email
                # Store other details if needed, e.g., access token, expiry, scopes
                # 'google_access_token': credentials.token,
                # 'google_token_expiry': credentials.expiry.isoformat() if credentials.expiry else None,
                'google_auth_linked_on': datetime.now()
             }},
            upsert=False # Don't create user if not found, they should be logged in
        )
        print(f"Stored refresh token for user: {app_user_id} ({user_email})") # Debugging

        final_redirect = session.pop('final_redirect_uri', 'swiftshield://google/auth/success')
        return redirect(final_redirect)

    except Exception as e:
        print(f"Error fetching token or storing credentials: {str(e)}") # Debugging
        import traceback
        traceback.print_exc() # Print full traceback
        final_redirect = session.pop('final_redirect_uri', f'swiftshield://google/auth/error?reason=token_error')
        return redirect(final_redirect)