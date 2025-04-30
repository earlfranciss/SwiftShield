import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import config from "../../config/config"; // Assuming config is available
import DetailsModal from '../../components/DetailsModal';
// Removed SmsListener import - BackgroundTaskHandler handles the native listener
// import SmsListener from 'react-native-android-sms-listener';
import { useNotifications } from "../../utils/NotificationContext";
// Removed AsyncStorage import - BackgroundTaskHandler manages AsyncStorage keys internally now
// import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import BackgroundTaskHandler from '../../services/BackgroundTaskHandler';

// --- IMPORTANT: Add the Gmail icon import if you want to use it in Gmail section ---
// const DUMMY_ICON_GMAIL = require('../../../assets/images/gmail_icon.png'); // Uncomment if you use it

// Placeholder for RNFS (keeping as per your original code)
const SafeRNFS = {
  isAvailable: false,
  fs: null,
  initialize: function() {
    try {
      const RNFS = require('react-native-fs');
      if (RNFS && typeof RNFS.readFile === 'function') {
        this.fs = RNFS;
        this.isAvailable = true;
        console.log('RNFS initialized successfully');
      } else {
        console.warn('RNFS available but methods missing');
      }
    } catch (error) {
      console.warn('Failed to initialize RNFS:', error);
    }
  },
  readFile: async function(path, options) {
      if (!this.isAvailable || !this.fs.readFile) {
          console.warn('RNFS readFile not available or initialized.');
          return null;
      }
      return this.fs.readFile(path, options);
  }
};

// --- Component ---
export default function Home({ route }) {
  const navigation = useNavigation();
  const [url, setUrl] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null); // Still useful? Or just use scanResultForModal?
  const [fontsLoaded, setFontsLoaded] = useState(false); // Keeping font loading
  const [inputError, setInputError] = useState("");
  const [scanResultForModal, setScanResultForModal] = useState(null);
  const [isLoadingScan, setIsLoadingScan] = useState(false); // For manual URL scan

  const [isTogglingProtection, setIsTogglingProtection] = useState(false); // For the main toggle button loading

  const [isProtectionActive, setIsProtectionActive] = useState(false); // Overall protection state (true if SMS OR Gmail intended active)
  const [isSmsMonitoringEnabled, setIsSmsMonitoringEnabled] = useState(false); // Intended SMS state from AsyncStorage
  const [isGmailMonitoringEnabled, setIsGmailMonitoringEnabled] = useState(false); // Intended Gmail state from AsyncStorage
   // Note: The UI status should probably reflect the *intended* state from AsyncStorage,
   // while BackgroundTaskHandler internally checks if native service actually started.
   // Let's use these states to reflect the AsyncStorage state.

  const [isGmailLinked, setIsGmailLinked] = useState(false); // Gmail account linked status (from backend)
  const [isConnectingGmail, setIsConnectingGmail] = useState(false); // Loading state for Gmail OAuth flow

  const [smsPermissionGranted, setSmsPermissionGranted] = useState(false); // SMS permission status (from Android OS)

  // Removed local SMS listener state/ref - managed by native BackgroundTaskHandler

  // Initialize SafeRNFS
  useEffect(() => {
    SafeRNFS.initialize();
  }, []);

  // Load fonts (keep if needed)
  useEffect(() => {
    const loadFonts = async () => {
      setTimeout(() => {
        setFontsLoaded(true);
      }, 100);
    };
    loadFonts();
  }, []);


  // --- UseFocusEffect for checking permissions and monitoring status when screen is active ---
  useFocusEffect(
    React.useCallback(() => {
      console.log("Home screen focused: Checking state...");
      const checkAppState = async () => {
        // 1. Check/Update SMS permission status (from Android OS)
        const smsGranted = await checkSmsPermissionsBasic();
        setSmsPermissionGranted(smsGranted);

        // 2. Check/Update Gmail link status (from backend via BackgroundTaskHandler)
        try {
            const gmailStatus = await BackgroundTaskHandler.checkGmailLinkStatus();
            console.log("Home screen focused: Gmail Linked Status:", gmailStatus.linked);
            setIsGmailLinked(gmailStatus.linked);
             // Optionally, backend might return intended monitoring status, sync it here too
             // setIsGmailMonitoringEnabled(gmailStatus.gmail_monitoring_enabled || false);
        } catch (error) {
            console.error("Home screen focused: Error checking Gmail link status:", error);
            setIsGmailLinked(false); // Assume not linked on error
        }

        // 3. Sync UI monitoring states (intended states from AsyncStorage via BackgroundTaskHandler)
        try {
           const monitoringStatus = await BackgroundTaskHandler.getMonitoringStatus();
           console.log("Home screen focused: Monitoring Status (from AsyncStorage):", monitoringStatus);
           setIsProtectionActive(monitoringStatus.isActive); // Overall active if either is intended
           setIsSmsMonitoringEnabled(monitoringStatus.sms); // Intended SMS state
           setIsGmailMonitoringEnabled(monitoringStatus.gmail); // Intended Gmail state

        } catch (error) {
            console.error("Home screen focused: Error getting monitoring status:", error);
             // Set states to false on error
             setIsProtectionActive(false);
             setIsSmsMonitoringEnabled(false);
             setIsGmailMonitoringEnabled(false);
        }
      };

      checkAppState();

      // Optional: Cleanup logic if needed when screen blurs
      return () => {
        console.log("Home screen blurred.");
      };
    }, []) // Empty dependency array means this runs on mount and every time the screen focuses
  );


   // --- Basic SMS Permission Check Helper (used in useFocusEffect) ---
   const checkSmsPermissionsBasic = async () => {
     if (Platform.OS !== 'android') return false; // Or true, depending on your logic for other platforms
     try {
         const readStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
         const receiveStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
         return readStatus && receiveStatus;
     } catch (err) {
         console.warn("SMS Basic Permission check failed:", err);
         return false;
     }
  };


  // --- Full Combined Permission Request Logic (used by toggle button) ---
  const requestAllPermissions = async () => {
    if (Platform.OS !== 'android') {
      console.log("Requesting All Permissions - Non-Android");
      return { smsGranted: true, notificationGranted: true }; // Assume non-Android handles permissions differently
    }

    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ];

      if (Platform.Version >= 33) { // Android 13+ requires notification permission
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      console.log("Requesting Permissions:", permissionsToRequest);
      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
      console.log("Permission Request Result:", granted);

      // Evaluate SMS permissions
      const smsReadGranted = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
      const smsReceiveGranted = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
      const coreSmsGranted = smsReadGranted && smsReceiveGranted;

      // Evaluate Notification permission (if requested)
      let notificationPermissionGranted = true;
      if (Platform.Version >= 33) {
        notificationPermissionGranted = granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;
      }

      console.log(`Core SMS Granted: ${coreSmsGranted}, Notification Granted: ${notificationPermissionGranted}`);

      // Update state based on CORE SMS permissions only for immediate UI feedback
      setSmsPermissionGranted(coreSmsGranted);

      // If core SMS permissions were denied permanently, inform the user
      if (!coreSmsGranted) {
         const readSmsStatus = granted[PermissionsAndroid.PERMISSIONS.READ_SMS];
         const receiveSmsStatus = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];
         if (readSmsStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN || receiveSmsStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            Alert.alert(
             'Permissions Blocked',
             'To enable full protection, please grant SMS and Notification permissions in your phone settings.',
             [
               { text: 'Cancel', style: 'cancel' },
               { text: 'Open Settings', onPress: () => Linking.openSettings() }
             ]
           );
         } else {
             Alert.alert(
             "Permissions Required",
             "Please grant SMS permissions to enable SMS monitoring.",
             [{ text: "OK" }]
           );
         }
      }

      return { smsGranted: coreSmsGranted, notificationGranted: notificationPermissionGranted };

    } catch (err) {
      console.warn('Permission Request Error:', err);
      setSmsPermissionGranted(false);
      return { smsGranted: false, notificationGranted: false };
    }
  };


  // --- GMail Connect Handler ---
  // This is called to START the OAuth flow, NOT to start monitoring.
  const handleConnectGmail = async () => {
      if (isGmailLinked) {
          Alert.alert("Gmail", "Gmail is already linked.\n\nDisconnect functionality is not yet implemented.");
          // TODO: If disconnect is implemented, call BackgroundTaskHandler.disconnectGmail()
          // and update isGmailLinked state based on the result.
          return;
      }

      if (isConnectingGmail) {
         console.log("Gmail connection process already in progress.");
         return;
      }

      setIsConnectingGmail(true); // Start loading indicator for the connection process
      console.log("Initiating Gmail OAuth flow...");

      // The final redirect URI your backend or deep link handler listens to
      const finalRedirect = encodeURIComponent('swiftshield://google/auth/success');
      // Assuming your backend has an endpoint to start the OAuth flow
      const googleLoginUrl = `${config.BASE_URL}/google-login?final_redirect=${finalRedirect}`;

      console.log("Opening Google Login URL:", googleLoginUrl);

      try {
        const supported = await Linking.canOpenURL(googleLoginUrl);

        if (supported) {
          await Linking.openURL(googleLoginUrl);
          // App goes to background. isConnectingGmail remains true until user returns or timeout.
        } else {
          Alert.alert("Error", "Cannot open the Google sign-in page. Please check the URL or your device configuration.");
          console.error("Failed to open URL: Not supported", googleLoginUrl);
          setIsConnectingGmail(false); // Hide spinner if opening failed
        }
      } catch (err) {
         console.error("Failed to open URL", err);
         Alert.alert("Error", `Could not open the connection page: ${err.message}`);
         setIsConnectingGmail(false); // Hide spinner if opening failed
      }
       // The spinner should hide either when the user returns (useFocusEffect updates isConnectingGmail indirectly)
       // or after a long timeout if they abandon the flow.
       // Let's set a timeout as a fallback to hide the spinner.
       setTimeout(() => {
            if (isConnectingGmail) { // Only hide if it's still true
                console.log("Gmail connection spinner timeout.");
                setIsConnectingGmail(false);
            }
       }, 30000); // Hide after 30 seconds as a fallback
    };


  // --- Toggle Function for the main Protection Button ---
  const handleProtectionToggle = async () => {
    // Disable the button immediately and show spinner
    if(isTogglingProtection) return;
    setIsTogglingProtection(true);
    console.log('Attempting to toggle protection...');


    try {
      if (!isProtectionActive) { // User wants to ENABLE protection

        // 1. Check/Request SMS Permissions first
        console.log('Checking permissions...');
        const { smsGranted, notificationGranted } = await requestAllPermissions();

        // If SMS permissions are not granted, we cannot start SMS monitoring. Stop the enable process.
        // requestAllPermissions already shows an alert.
        if (!smsGranted) {
           console.log('SMS permissions denied. Cannot enable protection.');
           // Update UI status based on current permissions (already done by setSmsPermissionGranted in requestAllPermissions)
           // Also update overall state based on current AsyncStorage states
           const currentStatus = await BackgroundTaskHandler.getMonitoringStatus();
           setIsProtectionActive(currentStatus.isActive);
           setIsSmsMonitoringEnabled(currentStatus.sms);
           setIsGmailMonitoringEnabled(currentStatus.gmail);
           return; // Exit function
        }
        // Notification permission failure doesn't block starting monitoring, just affects alerts.


        // 2. Check Gmail Link Status from backend
        console.log('Checking Gmail link status...');
        let gmailStatusLinked = false;
        try {
            const gmailStatus = await BackgroundTaskHandler.checkGmailLinkStatus();
            gmailStatusLinked = gmailStatus.linked;
            setIsGmailLinked(gmailStatusLinked); // Update UI state based on backend
        } catch (error) {
             console.error('Error checking Gmail link status during toggle:', error);
             setIsGmailLinked(false); // Assume not linked on error
        }

        // 3. Determine which services should be ENABLED based on permissions and linking
        const shouldEnableSms = smsGranted; // Enable SMS if permissions are granted
        const shouldEnableGmail = gmailStatusLinked; // Enable Gmail ONLY if linked

        // 4. Prompt if Gmail is not linked AND user wants full protection (which is the default intention of tapping "Enable")
        if (!gmailStatusLinked) {
          Alert.alert(
            "Complete Protection",
            "To monitor emails, please link your Gmail account.\n\nWould you like to do that now, or proceed with SMS monitoring only?",
            [
              {
                text: "Link Gmail Now",
                onPress: () => {
                  console.log('User chose to link Gmail.');
                  handleConnectGmail(); // Initiate the connection flow
                   // Do NOT call enableProtection here. The user will return after linking
                   // and might tap "Enable" again or useFocusEffect will update the state.
                   // Optionally, you could save an "intent to enable after linking" flag in AsyncStorage.
                }
              },
               { text: "Continue Anyway (SMS Only)", onPress: async () => {
                    console.log("User chose to continue with SMS only. Enabling SMS...");
                     // User chose to enable SMS only. Update AsyncStorage accordingly.
                     await BackgroundTaskHandler.setMonitoringStates(true, false); // Set intended states in AsyncStorage
                     // Now start the monitoring based on the states we just set.
                    await startNativeMonitoring();
               }},
              { text: "Cancel", style: "cancel" } // Cancel the whole process
            ]
          );
          // Stop here. The user's choice in the alert determines the next action.
          console.log('Prompting user about linking Gmail...');

        } else {
           // Gmail is already linked and SMS permissions granted - Proceed to enable both
           console.log("Gmail is already linked and SMS permissions granted. Enabling both services...");
            // Set intended states in AsyncStorage accordingly.
           await BackgroundTaskHandler.setMonitoringStates(true, true);
            // Now start the monitoring based on the states we just set.
           await startNativeMonitoring();
        }

      } else { // User wants to DISABLE protection
        console.log('Attempting to disable protection...');
        // User wants to disable all monitoring. Update AsyncStorage first.
        await BackgroundTaskHandler.setMonitoringStates(false, false);
        // Now stop the native services based on the states we just set (all false).
        await stopNativeMonitoring();
      }

    } catch (error) {
      console.error('Error toggling protection:', error);
      Alert.alert(
        "Error",
        "Failed to toggle protection. Please try again."
      );
       // Attempt to sync UI state based on what's currently in AsyncStorage after the error
       try {
         const status = await BackgroundTaskHandler.getMonitoringStatus();
         setIsProtectionActive(status.isActive);
         setIsSmsMonitoringEnabled(status.sms);
         setIsGmailMonitoringEnabled(status.gmail);
       } catch(e) { console.error("Failed to get status after toggle error", e); }
    } finally {
      // Hide the toggle button loading indicator
      setIsTogglingProtection(false);
       console.log('Protection toggle process finished.');
    }
  };

  // Renamed from enableProtection to be clearer it starts the native side
  const startNativeMonitoring = async () => {
    console.log('Calling BackgroundTaskHandler.startMonitoring to launch native services...');
    try {
      // BackgroundTaskHandler.startMonitoring reads AsyncStorage to decide which services to start
      const finalStatus = await BackgroundTaskHandler.startMonitoring(); // Returns the final status from AsyncStorage

      console.log('BackgroundTaskHandler.startMonitoring finished. Final state:', finalStatus);

      // Sync UI state with the handler's current state (which reads AsyncStorage)
      setIsProtectionActive(finalStatus.isActive);
      setIsSmsMonitoringEnabled(finalStatus.sms);
      setIsGmailMonitoringEnabled(finalStatus.gmail);

      if (finalStatus.isActive) {
         let enabledServices = [];
         if(finalStatus.sms) enabledServices.push("SMS");
         if(finalStatus.gmail) enabledServices.push("Gmail");
         const serviceList = enabledServices.length > 0 ? enabledServices.join(" and ") : "no services";

         Alert.alert(
           "Protection Enabled",
           `SwiftShield is now actively monitoring ${serviceList}.`
         );
      } else {
          // If handler reported not active after attempting start (meaning neither service could start)
          Alert.alert("Enable Failed", "Could not start monitoring. Please check permissions, Gmail linking, and try again.");
      }

    } catch (error) {
      console.error('Error starting native monitoring:', error);
       // Sync state based on AsyncStorage even on error
       try {
         const status = await BackgroundTaskHandler.getMonitoringStatus();
         setIsProtectionActive(status.isActive);
         setIsSmsMonitoringEnabled(status.sms);
         setIsGmailMonitoringEnabled(status.gmail);
       } catch(e) { console.error("Failed to get status after start error", e); }

      throw error; // Re-throw so handleProtectionToggle can catch it
    }
  };

  // Renamed from disableProtection
  const stopNativeMonitoring = async () => {
    console.log('Calling BackgroundTaskHandler.stopMonitoring to stop native services...');
    try {
      // BackgroundTaskHandler.stopMonitoring sets AsyncStorage to false and then attempts to stop native services
      const finalStatus = await BackgroundTaskHandler.stopMonitoring(); // Returns the final status from AsyncStorage
      console.log('BackgroundTaskHandler.stopMonitoring finished. Final state:', finalStatus);

      // Sync UI state with the handler's current state (which reads AsyncStorage)
      setIsProtectionActive(finalStatus.isActive); // Should be false
      setIsSmsMonitoringEnabled(finalStatus.sms); // Should be false
      setIsGmailMonitoringEnabled(finalStatus.gmail); // Should be false


      Alert.alert(
        "Protection Disabled",
        "SwiftShield monitoring has been stopped."
      );
    } catch (error) {
      console.error('Error stopping native monitoring:', error);
      Alert.alert("Error", "Failed to stop monitoring.");
       // Sync state based on AsyncStorage even on error
       try {
         const status = await BackgroundTaskHandler.getMonitoringStatus();
         setIsProtectionActive(status.isActive);
         setIsSmsMonitoringEnabled(status.sms);
         setIsGmailMonitoringEnabled(status.gmail);
       } catch(e) { console.error("Failed to get status after stop error", e); }
      throw error; // Re-throw so handleProtectionToggle can catch it
    }
  };


  // --- Backend Interaction Functions (Keep handleUrlScan and unifiedScan) ---

  // Function for manual URL scan input (Keep as is)
  const handleUrlScan = async () => {
    setInputError("");
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setInputError("Please enter a URL to scan.");
      return;
    }
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s]*)?$/i;
    if (!urlPattern.test(trimmedUrl)) {
      setInputError("Please enter a valid URL format (e.g., example.com or https://example.com).");
      return;
    }

    setIsLoadingScan(true);

    try {
      console.log(`Scanning explicit URL: ${trimmedUrl}`);
      // Call unifiedScan for manual input
      await unifiedScan({ url: trimmedUrl });
      setUrl("");
      setInputError("");

    } catch (error) {
       console.error("Manual URL Scan Failed:", error.message);
       setInputError(`Scan failed: ${error.message}`);
    } finally {
       setIsLoadingScan(false);
    }
  };


  // --- Unified Scan Function (Called by handleUrlScan) ---
  // This version is specifically for triggering a scan and showing a modal.
  // Background scanning logic in BackgroundTaskHandler should NOT use this; they call backend directly.
  const unifiedScan = async (payload) => {
    // 'payload' for manual scan: { url: "..." }
    const endpoint = `${config.BASE_URL}/scan`; // Endpoint for scanning a URL

    const backendPayload = {
        url: payload.url,
        // No sender or emailId needed for manual URL scan payload
    };

    console.log(`Sending manual URL scan to ${endpoint}:`, JSON.stringify(backendPayload));

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendPayload),
            credentials: 'include', // Include user auth credentials if required by backend
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Backend Scan HTTP Error (${response.status}):`, errorText);
             let errorJson = { error: `Backend HTTP error: ${response.status}` };
             try { errorJson = JSON.parse(errorText); } catch (e) {
                errorJson.error = `Backend HTTP error: ${response.status}. Response: ${errorText.substring(0, Math.min(errorText.length, 100))}...`;
             }
            throw new Error(errorJson.error || `Backend HTTP error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Manual Scan Result Data:", data);

        if (data && data.error) {
             console.error("Backend Scan Logic Error:", data.error);
             throw new Error(data.error);
        }

        // Success: Backend returned a result. Assume data structure includes log_details
        if (data && data.log_details) {
           // Add the result to the notification context log list
           // The notification context handles displaying the log entry on the logs screen
           handleNewScanResult(data.log_details); // Notify context

           // Show the modal with the log details for manual scans
           showModal(data.log_details);

        } else {
            console.warn("Backend returned success but missing expected data structure for manual scan:", data);
             Alert.alert("Scan Result", data.message || "Scan complete, no specific threat details found.");
        }


    } catch (error) {
        console.error("Error during manual unified scan:", error.message);
        throw error;
    }
  };


  // --- Modal Functions (Keep as is) ---
  const showModal = (log) => {
    setScanResultForModal(log);
    setSelectedLog(log);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
    setScanResultForModal(null);
  };

  const handleClearInput = () => {
    setUrl("");
    setInputError("");
  };


  // Delete Handler (Keep as is, used by Modal)
  const handleDeleteLog = async (logId) => {
    if (!logId) {
      console.error("Delete failed: No log ID provided.");
      Alert.alert("Error", "Cannot delete log without an ID.");
      return;
    }
    console.log("Attempting to delete log:", logId);
    setIsLoadingScan(true); // Reuse loading state, maybe rename?
    try {
      const deleteUrl = `${config.BASE_URL}/logs/${logId}`;
      const response = await fetch(deleteUrl, {
          method: "DELETE",
          credentials: 'include', // Include user auth credentials
      });
      const result = await response.json();

      if (!response.ok || (result && result.error)) {
          const errorMessage = (result && result.error) || `Failed to delete (Status: ${response.status})`;
          throw new Error(errorMessage);
      }

      Alert.alert("Success", "Log deleted successfully.");
      closeModal();
      // Optionally: Trigger a refresh of the logs list in NotificationContext or other relevant screen
    } catch (err) {
      console.error("Delete failed:", err);
      Alert.alert("Error", `Could not delete log: ${err.message}`);
    } finally {
      setIsLoadingScan(false);
    }
  };

  // --- Render Logic ---
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#31EE9A" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading...</Text>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
       <StatusBar barStyle="light-content" />

      {/* Power Icon and Protection Status */}
      <View style={styles.iconContainer}>
         <TouchableOpacity
           onPress={handleProtectionToggle}
           style={styles.powerIconTouchableArea}
           disabled={isTogglingProtection} // Disable while the toggle process is running
         >
            {isTogglingProtection ? ( // Show spinner ONLY for the protection toggle button area
               <View style={styles.powerIconSpinnerPlaceholder}>
                  <ActivityIndicator
                    size="large"
                    color="#3AED97"
                    style={{ transform: [{ scale: 2.5 }] }}
                  />
                </View>
            ) : (
               <Image
                 source={
                   isProtectionActive // Use isProtectionActive state for the icon
                     ? require("../../assets/images/enableButton.png")
                     : require("../../assets/images/disableButton.png")
                 }
                 style={styles.powerIcon}
               />
            )}

           <Text style={styles.protectionText}>Automatic Protection</Text>
           {isTogglingProtection ? (
               <Text style={styles.statusTextLoading}>Toggling...</Text>
           ) : (
              <Text
                 style={[
                   styles.statusText,
                   { color: isProtectionActive ? "#31EE9A" : "#AAAAAA" },
                 ]}
              >
                 {isProtectionActive ? "Enabled" : "Disabled"}
              </Text>
           )}

           {/* Display status of individual services */}
           <View style={styles.serviceStatusContainer}>
                <Text style={styles.serviceStatusText}>
                    SMS Monitoring: <Text style={{ color: isSmsMonitoringEnabled ? "#31EE9A" : "#AAAAAA" }}>{isSmsMonitoringEnabled ? "Enabled" : "Disabled"}</Text>
                </Text>
                 <Text style={styles.serviceStatusText}>
                    Gmail Monitoring: <Text style={{ color: isGmailMonitoringEnabled ? "#31EE9A" : (isGmailLinked ? "#AAAAAA" : "#AAAAAA") }}>
                      {isGmailMonitoringEnabled ? "Enabled" : (isGmailLinked ? "Disabled" : "Not Linked")}
                    </Text>
                </Text>
           </View>


           {/* Warning/Call to action below status */}
           {!smsPermissionGranted && Platform.OS === "android" && (
             <Text style={styles.warningText}>SMS permissions required. Tap above to grant.</Text>
           )}
           {/* Optionally, add a warning if protection is active but some services are not enabled */}
            {isProtectionActive && (!isSmsMonitoringEnabled || (isGmailLinked && !isGmailMonitoringEnabled)) && (
                 <Text style={styles.warningText}>Protection active, but some services are not fully enabled. Check statuses above.</Text>
            )}
         </TouchableOpacity>
      </View>


      {/* GMail Connect Section */}
      <View style={styles.gmailConnectContainer}>
          <Text style={styles.gmailConnectLabel}>Gmail Status:</Text>
          <View style={styles.gmailStatusRow}>
               {/* Optional: Add Gmail icon */}
               {/* <Image source={DUMMY_ICON_GMAIL} style={styles.gmailIcon} /> */}
              <Text style={[styles.gmailStatusText, { color: isGmailLinked ? "#31EE9A" : "#AAAAAA" }]}>
                 {isGmailLinked ? "Connected" : "Not Linked"}
              </Text>

              {/* Button to connect/disconnect */}
              {!isGmailLinked && !isConnectingGmail && (
                 <TouchableOpacity style={styles.gmailConnectButton} onPress={handleConnectGmail}>
                    <Text style={styles.gmailConnectButtonText}>Link Gmail</Text>
                 </TouchableOpacity>
              )}
               {isConnectingGmail && (
                   <View style={styles.gmailConnectButton}>
                       <ActivityIndicator size="small" color="#000000" />
                   </View>
               )}
              {/* Disconnect button - Placeholder */}
              {isGmailLinked && (
                   <TouchableOpacity style={styles.gmailDisconnectButton} onPress={() => Alert.alert("Disconnect", "Disconnect functionality not yet implemented.")}>
                       <Text style={styles.gmailDisconnectButtonText}>Disconnect</Text>
                   </TouchableOpacity>
              )}
          </View>
           {!isGmailLinked && (
             <Text style={styles.gmailHintText}>Link Gmail for email protection.</Text>
           )}
            {isGmailLinked && (
                <Text style={styles.gmailHintText}>Monitoring is active when Automatic Protection is Enabled.</Text>
            )}
      </View>


      {/* Input and Scan Button */}
      <View style={styles.inputContainer}>
        <Text style={styles.scanLabel}>Manual URL Scan:</Text>
        <TextInput
          style={[
            styles.textInput,
            inputError ? styles.inputErrorBorder : null,
            inputError ? styles.inputTextError : null
          ]}
          placeholder="www.malicious.link"
          placeholderTextColor="#6c757d"
          onChangeText={(text) => {
            setUrl(text);
            if (inputError) {
              setInputError("");
            }
          }}
          value={url}
          autoCapitalize="none"
          keyboardType="url"
        />

         {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}

        {isLoadingScan ? (
          <View style={styles.manualScanLoadingContainer}>
            <ActivityIndicator size="small" color="#3AED97" />
            <Text style={styles.manualScanLoadingText}>Scanning...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.scanButton} onPress={handleUrlScan}>
            <LinearGradient
              colors={["#3AED97", "#BCE26E", "#FCDE58"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <Text style={styles.scanButtonText}>SCAN</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.clearButton} onPress={handleClearInput}>
            <LinearGradient
              colors={["#3AED97", "#BCE26E", "#FCDE58"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <Text style={styles.clearButtonText}>Clear Input</Text>
            </LinearGradient>
        </TouchableOpacity>
      </View>

      <DetailsModal
        navigation={navigation}
        visible={modalVisible}
        onClose={closeModal}
        scanResult={scanResultForModal}
        onDeletePress={handleDeleteLog}
      />
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: "#000000",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 30,
    width: '100%',
  },
   powerIconTouchableArea: {
      alignItems: 'center',
      padding: 10,
   },
  powerIcon: {
    width: 130,
    height: 140,
    resizeMode: "contain",
  },
  powerIconSpinnerPlaceholder: {
    width: 130,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  protectionText: {
    color: "#31EE9A",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 10,
  },
  statusText: {
    color: "#31EE9A",
    fontSize: 16,
    fontWeight: "400",
    marginTop: 5,
  },
   statusTextLoading: {
     fontSize: 16,
     fontWeight: "400",
     marginTop: 5,
     color: '#BCE26E',
   },
   serviceStatusContainer: {
     marginTop: 10,
     alignSelf: 'stretch',
     paddingHorizontal: 10,
   },
   serviceStatusText: {
      color: "#AAAAAA",
      fontSize: 14,
      marginBottom: 3,
   },
  inputContainer: {
    width: "100%",
    alignItems: "flex-start",
    marginTop: 30,
  },
  scanLabel: {
    color: "#31EE9A",
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 5,
    fontWeight: 'semibold',
  },
  textInput: {
    width: "100%",
    height: 50,
    borderColor: "#BCE26E",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#ffffff",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 10,
    fontSize: 16,
  },
  inputErrorBorder: {
    borderColor: '#FF0000',
  },
  inputTextError: {
    color: '#FF0000',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  scanButton: {
    width: "100%",
    height: 45,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 5,
    marginBottom: 15,
  },
  gradientButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
  },
  clearButton: {
    width: "100%",
    height: 45,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 20,
  },
  clearButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
  },
  manualScanLoadingContainer: {
    width: "100%",
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 15,
  },
  manualScanLoadingText: {
      color: "#BCE26E",
      marginTop: 5,
      fontSize: 14,
  },
   warningText: {
     marginTop: 10,
     color: 'orange',
     fontSize: 12,
     textAlign: 'center',
     paddingHorizontal: 10,
   },
   gmailConnectContainer: {
     width: '100%',
     marginTop: 20,
     paddingTop: 15,
     paddingBottom: 10,
     borderTopWidth: 1,
     borderTopColor: '#222',
     borderBottomWidth: 1,
     borderBottomColor: '#222',
     paddingHorizontal: 10,
   },
   gmailConnectLabel: {
     color: '#31EE9A',
     fontSize: 14,
     fontWeight: 'semibold',
     marginBottom: 10,
     marginLeft: 5,
   },
    gmailStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
   gmailIcon: {
       width: 24,
       height: 24,
       resizeMode: 'contain',
       marginRight: 10,
   },
   gmailStatusText: {
     fontSize: 16,
     flex: 1,
     marginLeft: 5,
     color: '#AAAAAA',
   },
   gmailConnectButton: {
     backgroundColor: '#BCE26E',
     paddingVertical: 8,
     paddingHorizontal: 15,
     borderRadius: 20,
     alignItems: 'center',
     justifyContent: 'center',
     minWidth: 100,
   },
   gmailConnectButtonText: {
     color: '#000000',
     fontSize: 14,
     fontWeight: 'bold',
   },
   gmailDisconnectButton: {
     backgroundColor: '#FF6347',
     paddingVertical: 8,
     paddingHorizontal: 15,
     borderRadius: 20,
      alignItems: 'center',
     justifyContent: 'center',
      minWidth: 100,
   },
   gmailDisconnectButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
   },
   gmailHintText: {
       color: '#AAAAAA',
       fontSize: 12,
       marginTop: 5,
       marginLeft: 5,
   }
});