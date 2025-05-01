// src/services/GmailService.js
import { google } from 'googleapis';
import { GOOGLE_CLIENT_ID } from '@env';
import { Platform, Alert } from 'react-native';
import { Buffer } from 'buffer';
import PushNotification from 'react-native-push-notification';
import { useContext, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';


// Ensure Buffer is globally available for react native < 17
if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
  }

GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID, // Replace with your actual web client ID
    offlineAccess: true,
  });


// Gmail Scanning Function
export const scanGmail = async () => {
  try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (!isSignedIn) {
        await GoogleSignin.signIn();
      }

      const { accessToken } = await GoogleSignin.getTokens();
      const gmailData = await getNewGmailMessages(accessToken); // Call Gmail API

      // Display in Alert for Testing
      if (gmailData && gmailData.length > 0 && gmailData[0].subject != null) {
        const alertMessage = gmailData.map(email => `Subject: ${email.subject}\nFrom: ${email.sender}\nBody: ${email.body}`).join('\n\n');
        Alert.alert("New Emails Found!", alertMessage);
      } else {
        Alert.alert("No New Emails", "No new emails found in your inbox.");
      }

      return gmailData
  } catch (error) {
    console.error('Error scanning Gmail:', error);
  }
};

//Gmail API initialization function
const gmailAPI = async (accessToken) => {
  try {
    // Create an OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
      '', // Client Secret (Not needed for mobile apps using access token)
      '', // Redirect URI (Not needed for mobile apps using access token)
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    return gmail;
  } catch (error) {
    console.error('Error initializing Gmail API:', error);
    throw error;
  }
};

//Function to get new emails and set the "read" label
async function getNewGmailMessages(accessToken) {
  try {
    const gmail = await gmailAPI(accessToken);

    //Get the list of all unread emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
    });

    const messages = response.data.messages || [];

    if (messages.length === 0) {
      console.log('No unread messages found.');
      return [];
    }

    const emailData = [];
    for (const message of messages) {
      const messageData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const payload = messageData.data.payload;
      const headers = payload.headers;

      // Extract headers
      const subject = headers.find(header => header.name === 'Subject')?.value || '';
      const sender = headers.find(header => header.name === 'From')?.value || '';

      let body = '';
      if (payload.parts) {
        // If there are multiple parts, try to find the plain text part
        const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
        if (textPart) {
          body = base64Decode(textPart.body.data);
        } else {
          // If no plain text part, try to find the HTML part and extract text
          const htmlPart = payload.parts.find(part => part.mimeType === 'text/html');
          if (htmlPart) {
            // You would need to use a library like 'html-to-text' to convert HTML to text
            // For simplicity, I'm just extracting the data
            body = base64Decode(htmlPart.body.data);
          }
        }
      } else if (payload.body && payload.body.data) {
        // If there's no parts, get the body data
        body = base64Decode(payload.body.data);
      }

      emailData.push({
        subject: subject,
        sender: sender,
        body: body,
      });

      //Mark the email as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: message.id,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    }

    return emailData;
  } catch (error) {
    console.error('Error retrieving Gmail messages:', error);
    return [];
  }
}

// Function to decode Base64 data
function base64Decode(data) {
  if (!data) return '';
  let buff = new Buffer(data, 'base64');
  return buff.toString('utf-8');
}