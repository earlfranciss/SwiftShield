import config from './src/config/config'; 
import axios from 'axios'; 

// Import utility for URL extraction if needed locally (alternative to backend)
// import { extractUrlsFromText } from '../utils/helpers';


const sendSmsToBackend = async (smsData) => {
    if (!smsData || !smsData.body) {
        console.log('[BackgroundTask] Received incomplete SMS data:', smsData);
        return null; // Indicate no result
    }
    console.log(`[BackgroundTask] Processing SMS from ${smsData.sender}: ${smsData.body.substring(0, 50)}...`);

    // --- OPTION 1: Call Backend for Extraction AND Classification ---
    // (Using the unified /predict/scan endpoint that handles body)
    const endpoint = `${config.BASE_URL}/scan`;
    const payload = {
        body: smsData.body,
        sender: smsData.sender
    };
    console.log(`[BackgroundTask] Sending to ${endpoint} with payload:`, JSON.stringify(payload));
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[BackgroundTask] Backend Scan Error (${response.status}):`, errorText);
            throw new Error(`Backend error: ${response.status}`);
        }
        const data = await response.json();
        console.log("[BackgroundTask] Unified Scan Result:", data);
        // Add sender back for potential notification generation
        data.sender = smsData.sender;
        return data; // Return the classification result
    } catch (error) {
        console.error("[BackgroundTask] Error during unified scan fetch:", error.message);
        return null; // Indicate error
    }

    // --- OPTION 2: Call Backend ONLY for Extraction ---
    /*
    const extractionEndpoint = `${config.BASE_URL}/sms/classify_content`;
    const extractionPayload = { body: smsData.body, sender: smsData.sender };
    console.log(`[BackgroundTask] Requesting URL extraction from ${extractionEndpoint}`);
    try {
        const extractionResponse = await fetch(extractionEndpoint, { ... });
        if (!extractionResponse.ok) throw new Error(...);
        const extractionData = await extractionResponse.json();
        const extractedUrls = extractionData.extracted_urls || [];
        console.log("[BackgroundTask] Extracted URLs:", extractedUrls);

        if (extractedUrls.length > 0) {
            // If URLs found, scan the FIRST one (or loop and aggregate results)
            const urlToScan = extractedUrls[0];
            const scanEndpoint = `${config.BASE_URL}/predict/scan`;
            const scanPayload = { url: urlToScan };
            console.log(`[BackgroundTask] Scanning extracted URL: ${urlToScan}`);
            const scanResponse = await fetch(scanEndpoint, { method: 'POST', ... });
            if (!scanResponse.ok) throw new Error(...);
            const scanData = await scanResponse.json();
            scanData.sender = smsData.sender; // Add sender back
            return scanData; // Return the URL scan result
        } else {
            console.log("[BackgroundTask] No URLs found in SMS body.");
            // Return a "safe" result for non-URL text if desired
            return { classification: "safe", prediction: 1, sender: smsData.sender, reason: "No URL found" };
        }
    } catch (error) {
        console.error("[BackgroundTask] Error during SMS processing pipeline:", error.message);
        return null;
    }
    */
};

// --- Main Headless Task Function ---
// This function is called by the OS when triggered by the native service
module.exports = async (taskData) => {
  console.log('[BackgroundTask] Task Received:', taskData);

  // Check the type of task (e.g., from SMS or another trigger)
  // This structure depends on what your Native Service sends
  if (taskData && taskData.type === 'SMS_RECEIVED' && taskData.message) {
    const smsMessage = taskData.message; // { originatingAddress: '...', body: '...' }

    // Process the SMS data
    const classificationResult = await sendSmsToBackend(smsMessage);

    // If phishing detected by backend, trigger a system notification
    if (classificationResult && classificationResult.prediction === 0) { // Assuming 0 = Phishing
      console.log('[BackgroundTask] Phishing detected! Scheduling notification.');
      try {
          // Use NotificationService directly (ensure it's initialized properly for background use if needed)
          const NotificationService = require('../services/NotificationService'); // Import service here
          const title = "⚠️ Phishing Alert!";
          const body = `Suspicious content detected in SMS from ${smsMessage.originatingAddress || 'Unknown Sender'}.`;
          NotificationService.scheduleNotification(title, body, classificationResult); // Pass result data
      } catch (notifError) {
           console.error('[BackgroundTask] Failed to schedule notification:', notifError);
      }
    } else if (classificationResult) {
         console.log('[BackgroundTask] SMS processed, result:', classificationResult.classification);
    } else {
         console.log('[BackgroundTask] SMS processing failed or no result.');
    }
  }
  // Add handlers for other potential task types here (e.g., background fetch)

  console.log('[BackgroundTask] Task Finished.');
  // A Headless JS task should return a Promise, but often just completing is enough
};