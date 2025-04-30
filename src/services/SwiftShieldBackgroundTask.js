// SwiftShieldBackgroundTask.js
// This file must be registered in your app's index.js or App.js

import { NativeEventEmitter, NativeModules, AppRegistry } from 'react-native';
import config from '../config/config'; // Assuming config is available here
import { Buffer } from 'buffer'; // May need this if encoding/decoding is involved, though fetch usually handles UTF-8

// Access your native module
const { BackgroundMonitorModule } = NativeModules;

// Define the headless task logic
const SwiftShieldBackgroundTask = async (taskData) => {
  console.log('SwiftShieldBackgroundTask: Started for SMS processing.');

  if (!taskData || !taskData.smsData) {
    console.error('SwiftShieldBackgroundTask: No SMS data received.');
    // Indicate task completion (return value doesn't strictly matter for headless tasks,
    // but resolving the implicit promise ends it).
    return;
  }

  try {
    const smsDataJsonString = taskData.smsData;
    let smsDataObject;
    try {
        smsDataObject = JSON.parse(smsDataJsonString);
    } catch (parseError) {
        console.error('SwiftShieldBackgroundTask: Failed to parse SMS data JSON:', parseError);
        return; // Exit if JSON is invalid
    }

    const { body, sender, timestamp } = smsDataObject;

    console.log(`SwiftShieldBackgroundTask: Processing SMS - From: ${sender}, Body: ${body ? body.substring(0, 50) + '...' : 'No body'}`);

    // --- Call your backend endpoint to classify the SMS ---
    const endpoint = `${config.BASE_URL}/sms/classify-text`; // Your backend SMS endpoint
    const payload = {
      body: body || '', // Ensure body is a string
      sender: sender || 'Unknown', // Ensure sender is a string
      timestamp: timestamp, // Pass timestamp if backend uses it
    };

    console.log(`SwiftShieldBackgroundTask: Sending SMS data to backend: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include', // Include user auth credentials if needed
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SwiftShieldBackgroundTask: Backend classification error (${response.status}):`, errorText);
      // Log backend error, maybe send a non-phishing notification indicating scan failure?
      return; // Task finished (with backend error)
    }

    const result = await response.json();
    console.log('SwiftShieldBackgroundTask: Backend classification result:', result);

    // --- Process the backend response ---
    // Assuming backend returns { classification: 'phishing'/'clean', log_details: { ... } }
    if (result && result.classification === 'phishing' && result.log_details) {
      console.log('SwiftShieldBackgroundTask: Phishing detected by backend! Preparing event.');

      // Prepare data to send back to the main JS application via the native module
      // This structure MUST match what BackgroundTaskHandler.js's handleNewThreatDetected expects
      const detectionData = {
        type: 'sms', // Explicitly state type
        detectionId: result.log_details._id, // Assuming backend log ID
        sender: result.log_details.source || sender, // Use backend source if available, else original
        preview: result.log_details.text_preview || (result.log_details.content ? result.log_details.content.substring(0, Math.min(result.log_details.content.length, 100)) + '...' : 'No preview'), // Use backend preview or content snippet
        // Add other necessary fields from log_details that BackgroundTaskHandler/NotificationService might need
        ...result.log_details // Include all relevant log details
      };

      // --- Trigger the native event emission ---
      // The Headless Task calls a ReactMethod on the native module,
      // which in turn calls the static sendEventToJs method.
      if (BackgroundMonitorModule && BackgroundMonitorModule.triggerThreatDetectedEvent) {
          // triggerThreatDetectedEvent expects a ReadableMap, Arguments.createMap() creates one
          await BackgroundMonitorModule.triggerThreatDetectedEvent(detectionData); // Pass the prepared JS object/map
          console.log('SwiftShieldBackgroundTask: Event "onNewThreatDetected" triggered via native module.');
      } else {
          console.error('SwiftShieldBackgroundTask: BackgroundMonitorModule.triggerThreatDetectedEvent not available.');
      }


    } else if (result && result.classification !== 'phishing') {
       console.log('SwiftShieldBackgroundTask: SMS classified as clean.');
       // Optionally log this quietly in the main app if needed, but usually not required for non-threats
    } else {
       console.warn('SwiftShieldBackgroundTask: Backend returned unexpected result structure or missing data for classification:', result);
        // Handle cases where classification is missing or result is malformed
    }

  } catch (error) {
    console.error('SwiftShieldBackgroundTask: Error processing SMS:', error);
    // Handle errors during fetch or processing
    // Consider sending an event indicating scan failure if critical
  }

  console.log('SwiftShieldBackgroundTask: Finished.');
  // The task will be finished implicitly when the async function completes.
};

// Register the task name
AppRegistry.registerHeadlessTask('SwiftShieldBackgroundTask', () => SwiftShieldBackgroundTask);

// This task requires the 'smsData' extra passed in the native Intent.