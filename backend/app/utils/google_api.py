import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app import db # Assuming db is available
import base64
import email as email_parser # To parse email content

users_collection = db.get_collection("Users")

def get_google_credentials(app_user_id):
    """Gets Google credentials using a stored refresh token."""
    user_data = users_collection.find_one({'_id': app_user_id})
    if not user_data or 'google_refresh_token' not in user_data:
        print(f"No Google refresh token found for user {app_user_id}")
        return None

    try:
        credentials = Credentials(
            token=None, # Access token will be refreshed
            refresh_token=user_data['google_refresh_token'],
            token_uri='https://oauth2.googleapis.com/token',
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
            scopes=[ 'https://www.googleapis.com/auth/gmail.readonly' ] # Or load from config
        )
        # Check if token needs refreshing (it always will if token=None)
        if not credentials.valid:
             if credentials.expired and credentials.refresh_token:
                  print(f"Refreshing Google token for user {app_user_id}")
                  credentials.refresh(Request()) # Requires google.auth.transport.requests.Request
                  # Optionally save the new access token and expiry back to DB
                  # users_collection.update_one(...)
             else:
                  print(f"Credentials invalid and no refresh token for user {app_user_id}")
                  return None # Cannot proceed
        return credentials
    except Exception as e:
         print(f"Error getting/refreshing Google credentials for user {app_user_id}: {e}")
         return None


def get_gmail_service(app_user_id):
    """Builds the Gmail API service object."""
    credentials = get_google_credentials(app_user_id)
    if not credentials:
        return None
    try:
        service = build('gmail', 'v1', credentials=credentials, cache_discovery=False) # Disable discovery cache sometimes helps
        return service
    except Exception as e:
        print(f"Error building Gmail service for user {app_user_id}: {e}")
        return None

def list_new_messages(app_user_id, query='is:unread in:inbox'):
    """Lists new/unread messages for the user."""
    service = get_gmail_service(app_user_id)
    if not service:
        return None
    try:
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])
        return messages # List of {'id': '...', 'threadId': '...'}
    except Exception as e:
        print(f"Error listing messages for user {app_user_id}: {e}")
        return None

def get_email_details(app_user_id, message_id):
    """Gets the content of a specific email."""
    service = get_gmail_service(app_user_id)
    if not service:
        return None
    try:
        # Get raw message to handle different content types
        message = service.users().messages().get(userId='me', id=message_id, format='raw').execute()
        if 'raw' in message:
            # Decode base64url raw message
            msg_str = base64.urlsafe_b64decode(message['raw'].encode('ASCII'))
            # Parse the raw email content
            mime_msg = email_parser.message_from_bytes(msg_str)

            email_data = {
                'id': message_id,
                'subject': mime_msg['subject'],
                'from': mime_msg['from'],
                'to': mime_msg['to'],
                'date': mime_msg['date'],
                'body_plain': None,
                'body_html': None
            }

            # Extract body (handle multipart emails)
            if mime_msg.is_multipart():
                for part in mime_msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition"))
                    try:
                        body = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='replace')
                    except Exception:
                        continue # Skip parts that can't be decoded easily

                    if "attachment" not in content_disposition:
                        if content_type == "text/plain" and not email_data['body_plain']:
                            email_data['body_plain'] = body
                        elif content_type == "text/html" and not email_data['body_html']:
                            email_data['body_html'] = body
            else:
                # Not multipart, payload is the body
                content_type = mime_msg.get_content_type()
                try:
                     body = mime_msg.get_payload(decode=True).decode(mime_msg.get_content_charset() or 'utf-8', errors='replace')
                     if content_type == "text/plain":
                          email_data['body_plain'] = body
                     elif content_type == "text/html":
                          email_data['body_html'] = body
                except Exception as e:
                     print(f"Error decoding non-multipart body: {e}")


            # Prefer plain text body if available
            email_data['body'] = email_data['body_plain'] or email_data['body_html'] or ''

            return email_data
        else:
            print(f"Could not find raw content for message {message_id}")
            return None

    except Exception as e:
        print(f"Error getting message {message_id} for user {app_user_id}: {e}")
        return None

# Add the 'watch' function here if implementing push notifications later