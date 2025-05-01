// api.js

import config from "../config/config"; // Replace with your API endpoint

export const classifyURL = async (url) => {
  try {
    const response = await fetch(`${config.BASE_URL}/classify-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data; // Expected format: { label: "phishing", confidence: 0.9 }
  } catch (error) {
    console.error('Error classifying URL:', error);
    throw error; // Re-throw the error to be caught in Home.js
  }
};

export const classifySMS = async (message) => {
  try {
    const response = await fetch(`${config.BASE_URL}/classify-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data; // Expected format: { label: "spam", confidence: 0.8 }
  } catch (error) {
    console.error('Error classifying SMS:', error);
    throw error;
  }
};

export const classifyGmail = async (subject, body, sender) => {
    try {
      const response = await fetch(`${config.BASE_URL}/classify-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, body, sender }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data; // Expected format: { label: "phishing", confidence: 0.95 }
    } catch (error) {
      console.error('Error classifying Gmail:', error);
      throw error;
    }
  };