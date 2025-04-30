// BackgroundTaskHandler.js
import { NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from "../config/config";
// Dynamically import NotificationService when needed

const { BackgroundMonitorModule } = NativeModules;
const eventEmitter = BackgroundMonitorModule ? new NativeEventEmitter(BackgroundMonitorModule) : null;

// Define AsyncStorage keys
const SMS_MONITORING_KEY = 'smsMonitoringEnabled';
const GMAIL_MONITORING_KEY = 'gmailMonitoringEnabled';
// const OVERALL_MONITORING_KEY = 'monitoringEnabled'; // Removed

class BackgroundTaskHandler {

  // Keep track of listener subscriptions for cleanup
  static threatListenerSubscription = null; // Single listener for confirmed threats
  static gmailLinkExpirySubscription = null;


  static async initialize() {
    console.log('BackgroundTaskHandler: Initializing...');
    if (!eventEmitter) {
        console.error('BackgroundTaskHandler: Native module BackgroundMonitorModule not found or does not support events.');
        return;
    }

    try {
      // --- Set up ONE listener for confirmed threats ---
      if (this.threatListenerSubscription) {
         this.threatListenerSubscription.remove();
      }
       // This event is emitted by native services (SMS Headless Task via native module, Gmail Service)
      this.threatListenerSubscription = eventEmitter.addListener('onNewThreatDetected', this.handleNewThreatDetected);
      console.log('BackgroundTaskHandler: Subscribed to onNewThreatDetected event.');

       // --- Optional: Set up listener for Gmail link expiry ---
       if (this.gmailLinkExpirySubscription) {
           this.gmailLinkExpirySubscription.remove();
       }
       this.gmailLinkExpirySubscription = eventEmitter.addListener('onGmailLinkExpired', this.handleGmailLinkExpired);
       console.log('BackgroundTaskHandler: Subscribed to onGmailLinkExpired event.');

      // No need to start services here, rely on Home.js useFocusEffect calling getMonitoringStatus
      // and the user interaction with the toggle calling startMonitoring.

    } catch (error) {
      console.error('Error initializing BackgroundTaskHandler:', error);
       this.cleanupListeners(); // Clean up listeners on initialization failure
    }
  }

   // Method to update the *intended* monitoring status in AsyncStorage
   static async setMonitoringStates(smsEnabled, gmailEnabled) {
       console.log(`BackgroundTaskHandler: Setting intended monitoring states - SMS: ${smsEnabled}, Gmail: ${gmailEnabled}`);
       try {
           await AsyncStorage.setItem(SMS_MONITORING_KEY, smsEnabled ? 'true' : 'false');
           await AsyncStorage.setItem(GMAIL_MONITORING_KEY, gmailEnabled ? 'true' : 'false');
           console.log('BackgroundTaskHandler: Intended states saved to AsyncStorage.');
       } catch (error) {
           console.error('BackgroundTaskHandler: Failed to save monitoring states to AsyncStorage:', error);
           throw error; // Re-throw
       }
   }


  // Method to get the current intended monitoring status from AsyncStorage
  static async getMonitoringStatus() {
     try {
       // Read the intended states from AsyncStorage
       const isSmsEnabled = await AsyncStorage.getItem(SMS_MONITORING_KEY) === 'true';
       const isGmailEnabled = await AsyncStorage.getItem(GMAIL_MONITORING_KEY) === 'true';

       // The overall status is active if *either* service is intended to be active
       const isActive = isSmsEnabled || isGmailEnabled;

       console.log(`BackgroundTaskHandler: getMonitoringStatus returning { isActive: ${isActive}, sms: ${isSmsEnabled}, gmail: ${isGmailEnabled} }`);
       return {
         isActive: isActive, // Overall active if any service *should* be on
         sms: isSmsEnabled,     // Is SMS monitoring intended to be on?
         gmail: isGmailEnabled,   // Is Gmail monitoring intended to be on?
         // Note: This reflects the *intended* state based on AsyncStorage.
       };
     } catch (error) {
       console.error('Error getting monitoring status:', error);
       return { isActive: false, sms: false, gmail: false }; // Default to off on error
     }
  }


  static async startMonitoring() {
    console.log('BackgroundTaskHandler: startMonitoring called.');
     if (!BackgroundMonitorModule) {
        console.error('BackgroundTaskHandler: Native module not available.');
        throw new Error('Background monitoring not supported on this platform or module not linked.');
     }

    let smsAttempted = false;
    let gmailAttempted = false;
    let smsStartRequested = false; // Track if native start method was *called*
    let gmailStartRequested = false; // Track if native start method was *called*


    try {
      // Check intended state from AsyncStorage (set by Home.js before calling this)
      const intendedSmsState = await AsyncStorage.getItem(SMS_MONITORING_KEY) === 'true';
      const intendedGmailState = await AsyncStorage.getItem(GMAIL_MONITORING_KEY) === 'true';

       console.log(`BackgroundTaskHandler: Start monitoring based on intended states - SMS: ${intendedSmsState}, Gmail: ${intendedGmailState}`);


      // 1. Attempt SMS Monitoring Start if intended
      if (intendedSmsState && BackgroundMonitorModule.startSmsMonitoringService) {
         smsAttempted = true;
         try {
            console.log('BackgroundTaskHandler: Requesting start for native SMS service...');
            await BackgroundMonitorModule.startSmsMonitoringService(); // Native method handles permission check internally if needed
            smsStartRequested = true;
            console.log('BackgroundTaskHandler: Start SMS service request sent.');
         } catch (smsError) {
            console.error('BackgroundTaskHandler: Failed to request start for native SMS service:', smsError);
            // The AsyncStorage state remains 'true' (intended). Native module failed.
            // This might need a different UI feedback (e.g., "SMS monitoring failed to start").
         }
      } else if (intendedSmsState && !BackgroundMonitorModule.startSmsMonitoringService) {
           console.warn('BackgroundTaskHandler: Native startSmsMonitoringService method not available.');
      } else {
           console.log('BackgroundTaskHandler: SMS monitoring not intended to start.');
      }


      // 2. Attempt Gmail Monitoring Start if intended AND linked
      let gmailStatusLinked = false;
      if (intendedGmailState) { // Only check link status if Gmail monitoring is intended
          gmailAttempted = true;
          try {
              const gmailStatus = await this.checkGmailLinkStatus();
              gmailStatusLinked = gmailStatus.linked;
              console.log('BackgroundTaskHandler: Gmail link status:', gmailStatusLinked);
          } catch(e) {
               console.error('BackgroundTaskHandler: Error checking Gmail status before starting native service:', e);
               // Assume not linked on error for this check, but state remains 'true' (intended)
          }

          if (gmailStatusLinked && BackgroundMonitorModule.startGmailMonitoringService) {
             try {
                console.log('BackgroundTaskHandler: Requesting start for native Gmail monitoring service...');
                await BackgroundMonitorModule.startGmailMonitoringService();
                gmailStartRequested = true;
                console.log('BackgroundTaskHandler: Start Gmail service request sent.');
             } catch (gmailError) {
                console.error('BackgroundTaskHandler: Failed to request start for native Gmail monitoring service:', gmailError);
                // The AsyncStorage state remains 'true' (intended). Native module failed.
             }
          } else if (intendedGmailState && !gmailStatusLinked) {
               console.log('BackgroundTaskHandler: Gmail monitoring intended, but account not linked. Skipping native start.');
               // No native start called, intended state remains 'true' until user links or toggles off.
          } else if (intendedGmailState && !BackgroundMonitorModule.startGmailMonitoringService) {
              console.warn('BackgroundTaskHandler: Native startGmailMonitoringService method not available.');
          }
      } else {
           console.log('BackgroundTaskHandler: Gmail monitoring not intended to start.');
      }


      // 3. Notify Backend Monitoring Status
       try {
          console.log('BackgroundTaskHandler: Notifying backend monitoring status...');
          // Send the *intended* state from AsyncStorage to the backend
          const response = await fetch(`${config.BASE_URL}/monitor/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enable: (intendedSmsState || intendedGmailState), sms_enabled: intendedSmsState, gmail_enabled: intendedGmailState }),
            credentials: 'include',
          });

          if (!response.ok) {
             const errorBody = await response.text();
             console.error('BackgroundTaskHandler: Failed to notify backend:', response.status, errorBody);
          } else {
              console.log('BackgroundTaskHandler: Backend notified successfully.');
          }
       } catch (backendError) {
          console.error('BackgroundTaskHandler: Error notifying backend:', backendError);
       }

      // Get the final state from AsyncStorage to return to the UI
      const finalStatus = await this.getMonitoringStatus();
      console.log('BackgroundTaskHandler: startMonitoring finished. Final status (from AsyncStorage):', finalStatus);

      // Return the final status object from AsyncStorage
      return finalStatus;

    } catch (error) {
      console.error('BackgroundTaskHandler: Unexpected error during startMonitoring:', error);
      // Get state from AsyncStorage even on unexpected error
      const finalStatus = await this.getMonitoringStatus();
      throw error; // Re-throw the error
    }
  }


  static async stopMonitoring() {
     console.log('BackgroundTaskHandler: stopMonitoring called.');
      if (!BackgroundMonitorModule) {
         console.error('BackgroundTaskHandler: Native module not available.');
         // Can't stop native services, but can update AsyncStorage and backend
      }

    let smsStopRequested = false;
    let gmailStopRequested = false;

    try {
      // 1. Request Stop for native SMS service
      if (BackgroundMonitorModule && BackgroundMonitorModule.stopSmsMonitoringService) {
          try {
             console.log('BackgroundTaskHandler: Requesting stop for native SMS service...');
             await BackgroundMonitorModule.stopSmsMonitoringService();
             smsStopRequested = true;
             console.log('BackgroundTaskHandler: Stop SMS service request sent.');
          } catch (smsError) {
             console.error('BackgroundTaskHandler: Failed to request stop for native SMS service:', smsError);
          }
      } else {
          console.warn('BackgroundTaskHandler: stopSmsMonitoringService native method not available.');
      }


      // 2. Request Stop for native Gmail service
       if (BackgroundMonitorModule && BackgroundMonitorModule.stopGmailMonitoringService) {
          try {
              console.log('BackgroundTaskHandler: Requesting stop for native Gmail monitoring service...');
             await BackgroundMonitorModule.stopGmailMonitoringService();
              gmailStopRequested = true;
              console.log('BackgroundTaskHandler: Stop Gmail service request sent.');
          } catch (gmailError) {
              console.error('BackgroundTaskHandler: Failed to request stop for native Gmail monitoring service:', gmailError);
          }
       } else {
           console.warn('BackgroundTaskHandler: stopGmailMonitoringService native method not available.');
       }

      // Always update AsyncStorage states to false after attempting to stop
      await this.setMonitoringStates(false, false);


      // 3. Notify Backend Monitoring Status (all disabled)
       try {
          console.log('BackgroundTaskHandler: Notifying backend monitoring is disabled...');
          const response = await fetch(`${config.BASE_URL}/monitor/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enable: false, sms_enabled: false, gmail_enabled: false }),
            credentials: 'include',
          });

          if (!response.ok) {
             const errorBody = await response.text();
             console.error('BackgroundTaskHandler: Failed to notify backend:', response.status, errorBody);
          } else {
              console.log('BackgroundTaskHandler: Backend notified successfully.');
          }
       } catch (backendError) {
          console.error('BackgroundTaskHandler: Error notifying backend:', backendError);
       }

       // Get the final state from AsyncStorage to return to the UI (should be {isActive: false, sms: false, gmail: false})
      const finalStatus = await this.getMonitoringStatus();
      console.log('BackgroundTaskHandler: stopMonitoring finished. Final status (from AsyncStorage):', finalStatus);

      // Return the final status object
      return finalStatus;

    } catch (error) {
      console.error('BackgroundTaskHandler: Unexpected error during stopMonitoring:', error);
       // Ensure AsyncStorage states are marked off even on unexpected error
       await this.setMonitoringStates(false, false);
       // Re-fetch final status from AsyncStorage
       const finalStatus = await this.getMonitoringStatus();
      throw error;
    }
  }

  // --- Event Handler for Native Module Callbacks (Threats) ---

  // This handler is triggered by native code (Headless Task via native module, Gmail Service)
  // when a phishing threat has been CONFIRMED by the backend.
  static async handleNewThreatDetected(detectionData) {
    console.log('BackgroundTaskHandler: handleNewThreatDetected triggered with:', detectionData);
    // detectionData should be the WritableMap sent from native, containing type, detectionId, sender, preview, etc.

    if (!detectionData || typeof detectionData !== 'object' || !detectionData.type || !detectionData.detectionId) {
        console.error('BackgroundTaskHandler: Received invalid or incomplete detection data:', detectionData);
        return;
    }

    try {
        // Trigger notification based on the data provided by the native module/headless task
        await this.triggerPhishingNotification(detectionData);

        // Optionally, pass this data to your NotificationContext
        // Your `useNotifications` context handles updating the log list/UI
        // Assuming `handleNewScanResult` is the method to add a new log entry to the context state
        // Note: The context should handle potential duplicate events if native emits multiple times
        if (typeof this.handleNewScanResultContext === 'function') { // Check if the context method is available
             this.handleNewScanResultContext(detectionData);
        } else {
             console.warn("BackgroundTaskHandler: NotificationContext method handleNewScanResult not found/linked.");
             // This indicates the context wasn't properly initialized or linked to the handler.
             // The notification will still show, but the in-app log list might not update immediately.
        }


    } catch (error) {
        console.error('BackgroundTaskHandler: Error handling new threat detection:', error);
    }
  }

  // Link the handleNewScanResult method from NotificationContext to this handler
  // This is needed if NotificationContext needs to update UI state based on background events.
  static setNotificationContextHandler(handlerFunction) {
     this.handleNewScanResultContext = handlerFunction;
     console.log("BackgroundTaskHandler: Linked NotificationContext handler.");
  }


  // Handler for Gmail link expiry event
  static async handleGmailLinkExpired() {
      console.log('BackgroundTaskHandler: handleGmailLinkExpired triggered.');
      // The native service invalidated credentials and stopped polling.
      // Update the AsyncStorage state to reflect this.
      await AsyncStorage.setItem(GMAIL_MONITORING_KEY, 'false');
      // The getMonitoringStatus method will now return gmail: false
      // The UI (Home.js) will update on the next focus via useFocusEffect -> getMonitoringStatus.
      // Optionally, show a proactive alert to the user that they need to re-link Gmail.
      // Alerting from a background task handler can be tricky; deferring to UI on focus is safer.
  }


  static async triggerPhishingNotification(data) {
    console.log('BackgroundTaskHandler: triggerPhishingNotification called with:', data);
    try {
      // Dynamic import of NotificationService
      const NotificationServiceModule = await import('./NotificationService');
      const NotificationService = NotificationServiceModule.NotificationService; // Assuming it's exported like this


      let title = 'SwiftShield Phishing Alert';
      let body = 'Potential phishing detected.';

      const type = data.type || 'unknown';
      const sender = data.sender || 'Unknown Sender';
      const subject = data.subject || 'No Subject'; // Relevant for email
      const preview = data.preview || data.content || 'No preview available.'; // Preview text


      if (type === 'sms') {
          body = `SMS from ${sender}`;
          if (preview) {
              body += `: ${preview.substring(0, Math.min(preview.length, 100))}...`;
          }
      } else if (type === 'email') {
           body = `Email from ${sender}`;
           if (subject && subject !== 'No Subject') {
              body += `\nSubject: ${subject.substring(0, Math.min(subject.length, 100))}...`;
           } else if (preview) {
               body += `: ${preview.substring(0, Math.min(preview.length, 100))}...`;
           }
      } else {
         console.warn('BackgroundTaskHandler: triggerPhishingNotification called with unknown type:', type);
         body = `Potential phishing detected from ${sender}.`;
      }

      // Pass the full data object received from native to the notification payload
      await NotificationService.showNotification({
        title: title,
        body: body,
        data: data
      });
      console.log('BackgroundTaskHandler: NotificationService.showNotification called.');

    } catch (error) {
      console.error('BackgroundTaskHandler: Error showing notification:', error);
    }
  }

   // This method remains as is, used by startMonitoring to check Gmail link status
  static async checkGmailLinkStatus() {
    try {
      console.log('BackgroundTaskHandler: Checking Gmail status...');
      const response = await fetch(`${config.BASE_URL}/google-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include', // Include user auth credentials
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ error: 'Unknown error format' }));
         console.error('BackgroundTaskHandler: Error response checking Gmail status:', response.status, errorData);
         return { linked: false, error: errorData.error || `Failed to check Gmail status: ${response.status}` };
      }

      const result = await response.json();
      console.log('BackgroundTaskHandler: checkGmailLinkStatus result:', result);

      if (typeof result.linked !== 'boolean') {
          console.warn('BackgroundTaskHandler: Unexpected Gmail status result format:', result);
           return { linked: false };
      }
      // Assuming backend returns { linked: boolean }
      return result;

    } catch (error) {
      console.error('BackgroundTaskHandler: Error checking Gmail status:', error);
      return { linked: false, error: error.message };
    }
  }

   static cleanupListeners() {
      console.log('BackgroundTaskHandler: Cleaning up listeners...');
      this.threatListenerSubscription?.remove();
      this.gmailLinkExpirySubscription?.remove();
      this.threatListenerSubscription = null;
      this.gmailLinkExpirySubscription = null;
   }

  // Add a cleanup method if needed (e.g., on app shutdown or user logout)
  static cleanup() {
      console.log('BackgroundTaskHandler: Cleaning up BackgroundTaskHandler...');
      this.cleanupListeners();
      // Note: This does NOT stop native services. stopMonitoring() should be called for that.
  }
}

// Initialize the handler when the module is imported
BackgroundTaskHandler.initialize();


export default BackgroundTaskHandler;