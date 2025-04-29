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
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import config from "../../config/config";
import DetailsModal from '../../components/DetailsModal';
import SmsListener from 'react-native-android-sms-listener';
import { useNotifications } from "../../utils/NotificationContext"; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native"; 

// Instead of importing RNFS directly, create a wrapper with safety checks
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
  }
};

// --- Component ---
export default function Home({ navigation }) {
  const [url, setUrl] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [inputError, setInputError] = useState(""); 
  const [inputValue, setInputValue] = useState(''); 
  const [scanResultForModal, setScanResultForModal] = useState(null);
  const [isLoadingScan, setIsLoadingScan] = useState(false); 
  const [isProtectionEnabled, setIsProtectionEnabled] = useState(false); 
  const [isTogglingProtection, setIsTogglingProtection] = useState(false);
  const {handleNewScanResult } = useNotifications(); 
  const [isProtectionActive, setIsProtectionActive] = useState(false);
  const [isSmsListening, setIsSmsListening] = useState(false);
  // This state tracks if CORE SMS permissions are granted
  const [smsPermissionGranted, setSmsPermissionGranted] = useState(false);
  const smsSubscriptionRef = useRef(null);


  // Initialize SafeRNFS
  useEffect(() => {
    SafeRNFS.initialize();
  }, []);

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      setTimeout(() => {
        setFontsLoaded(true);
      }, 100);
    };
    loadFonts();
  }, []);

  useEffect(() => {
    checkPermissions(); 
  }, []);




  const checkPermissions = async () => {
    try {
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      ]);
  
      console.log('Permission Request Result:', permissions);
  
      const readSmsStatus = permissions[PermissionsAndroid.PERMISSIONS.READ_SMS];
      const receiveSmsStatus = permissions[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];
      const notificationStatus = permissions[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS];
  
      const coreSmsGranted = readSmsStatus === PermissionsAndroid.RESULTS.GRANTED;
      const notificationsGranted = notificationStatus === PermissionsAndroid.RESULTS.GRANTED;
  
      console.log('Core SMS Granted:', coreSmsGranted, 'Notification Granted:', notificationsGranted);
  
      if (readSmsStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'SMS Permission Blocked',
          'To enable SMS reading, go to Settings > Apps > YourApp > Permissions and allow SMS access.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ],
          { cancelable: true }
        );
      }

      setSmsPermissionGranted(coreSmsGranted);
  
    } catch (err) {
      console.warn('Permission check failed:', err);
    }
  };
  

  
  // --- Combined Permission Request Logic ---
  const requestAllPermissions = async () => {
    if (Platform.OS !== 'android') {
      return { smsGranted: false, notificationGranted: true }; // Assume non-android doesn't need special permission
    }

    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ];

      if (Platform.Version >= 33) { // Android 13+ requires notification permission
        console.log("Requesting POST_NOTIFICATIONS permission (Android 13+)")
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
      let notificationPermissionGranted = true; // Default true for older Android
      if (Platform.Version >= 33) {
        notificationPermissionGranted = granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;
      }

      console.log(`Core SMS Granted: ${coreSmsGranted}, Notification Granted: ${notificationPermissionGranted}`);

      // Update state based on CORE SMS permissions only
      setSmsPermissionGranted(coreSmsGranted);

      // Log if notification permission was denied (doesn't affect listener start)
      if (!notificationPermissionGranted && Platform.Version >= 33) {
          console.log("Notification permission denied. Background alerts may not show.");
      }

      // Check if user permanently denied permission
      if (!coreSmsGranted) {
        Alert.alert(
          "Permissions Required",
          "Please enable SMS and Notification permissions from Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
      }


      return { smsGranted: coreSmsGranted, notificationGranted: notificationPermissionGranted };

    } catch (err) {
      console.warn('Permission Request Error:', err);
      setSmsPermissionGranted(false); // Ensure state reflects failure
      return { smsGranted: false, notificationGranted: false };
    }
  };

  // --- Run Permission Request on Mount ---
  useEffect(() => {
    requestAllPermissions(); // Request permissions when screen loads

    // Cleanup listener on unmount
    return () => {
      stopSmsListening();
    };
  }, []); // Run only once on mount


  // --- SMS Listener Control Functions ---
  const startSmsListening = () => {
    // This function should ONLY be called if smsPermissionGranted is true
    if (!smsPermissionGranted) {
       // This situation indicates a logic error in handleProtectionToggle
       console.error("Attempted to start listener without SMS permissions!");
       Alert.alert('Permissions Error', 'Cannot start listener, SMS permissions are missing.');
       return;
    }

    if (!isSmsListening && !smsSubscriptionRef.current) {
      console.log('Starting SMS listener (Permissions OK)...');
      try {
        smsSubscriptionRef.current = SmsListener.addListener(message => {
          console.log('(Home Screen) SMS Received:', JSON.stringify(message));
          // Alert(`New SMS from ${message.originatingAddress || 'Unknown'}`, `Body: ${message.body || 'No body'}`, [{ text: 'OK' }]); // Keep commented for prod
          console.log(`Potential SMS from ${message.originatingAddress}`);
          // Call the correct function to handle incoming SMS
          sendSmsToBackendForProcessing({ // Renamed for clarity
             sender: message.originatingAddress,
             body: message.body,
             timestamp: message.timestamp
          });
        });
        setIsSmsListening(true);
        console.log('SMS Listener Started.');
        Alert.alert('Protection Enabled', 'Actively monitoring incoming SMS.');
      } catch (error) {
         console.error('Error starting SMS listener:', error);
         Alert.alert('Error', 'Could not start SMS protection.');
      }
    } else {
      console.log('SMS listener is already active.');
    }
  };

  const stopSmsListening = () => {
     if (isSmsListening && smsSubscriptionRef.current) {
      console.log('Stopping SMS listener...');
      try {
        smsSubscriptionRef.current.remove();
        smsSubscriptionRef.current = null;
        setIsSmsListening(false);
        console.log('SMS Listener Stopped.');
        Alert.alert('Protection Disabled', 'No longer monitoring incoming SMS.');
      } catch (error) {
         console.error('Error stopping SMS listener:', error);
         Alert.alert('Error', 'Could not stop SMS protection.');
      }
    }
  };

  // --- Toggle Function for the Button ---
  const handleProtectionToggle = async () => { 
    if (isTogglingProtection) return;
    setIsTogglingProtection(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      if (isSmsListening) {
        stopSmsListening();
      } else {
        let permissionsOk = smsPermissionGranted; 
        if (!permissionsOk) {
          console.log("SMS permissions not granted, requesting via button...");

          const result = await requestAllPermissions(); 
          permissionsOk = result.smsGranted;
        }

        // Proceed if Permission are now OK
        if (permissionsOk) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          startSmsListening(); 
        } else {
          Alert.alert('Permissions Required', 'SMS read/receive permissions are needed to enable protection. Please grant them when prompted or check App Settings.');
        }
      }

      setIsProtectionEnabled(prevState => !prevState);

    } catch (error) {
      console.error("Error toggling protection:", error);
      // Optionally show an error message to the user
      // setInputError("Failed to toggle protection state."); // Example using existing error state
    } finally {
      setIsTogglingProtection(false); // Stop loading indicator regardless of success/error
    }
  };


  // --- Backend Interaction Functions ---

  // Function for manual URL scan input
  const handleUrlScan = async () => {
    setInputError(""); 
    const trimmedUrl = url.trim();
     
    // --- Frontend Validation ---
    if (!trimmedUrl) {
      setInputError("Please enter a URL to scan.");
      return;
    }
    const urlPattern = /^(https?:\/\/)?(?!localhost)(?!.*:\d{2,5})([\w.-]+\.[a-zA-Z]{2,})(\/[^\s#]*)?$/;
    if (!urlPattern.test(trimmedUrl)) {
      setInputError("Please enter a valid URL format (e.g., example.com or https://example.com).");
      return;
    }

    // --- Proceed with Fetch ---
    try {
      console.log(`Scanning explicit URL: ${trimmedUrl}`);
      const response = await fetch(`${config.BASE_URL}/scan`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      // --- Check Backend Response Status ---
      if (!response.ok) {
        let backendErrorMsg = `Backend error: ${response.status}`; 
        try {
           const errorData = await response.json();
           if (errorData && errorData.error) {
               backendErrorMsg = errorData.error;
           }
        } catch (jsonError) {
          //setInputError(jsonError.message || "An error occurred while scanning for phishing.");
        }
        //setInputError(backendErrorMsg);
        return;
      }

      // --- Process Successful Response ---
      const data = await response.json();

      // Check for error field even in success response (less likely now)
      if (data.error) {
        setInputError(`Scan failed: ${data.error}`);
        return;
      }

      // Success
      console.log("Scan Result:", data);
      // Add sender info back if it came from an SMS payload for notification context
      // const resultDataForNotification = { ...data };
      // if (payload.sender) {
      //     resultDataForNotification.sender = payload.sender;
      // }

      // Call the context handler with the backend result (and added sender if applicable)
      // handleNewScanResult(resultDataForNotification);
      // setUrl("");
      showModal(data);

    } catch (error) { 
      setInputError(error.message || "An error occurred. Check connection or URL.");
    }
  };

  // Handler function to clear the input
 /* const handleClearInput = () => {
    setUrl(''); // Clear the state variable tied to the TextInput
    setInputError(''); // Also clear any existing input error message
  };*/
  
  // Function called ONLY by the SMS listener callback
  const sendSmsToBackendForProcessing = async (smsData) => {
    const extractionEndpoint = `${config.BASE_URL}/classify-sms`;
    const payload = { 
      body: smsData.body,
      sender: smsData.sender
    };

    console.log(`Requesting URL extraction from ${extractionEndpoint}`);
    // await unifiedScan({ url: smsData.body }); 

    try {
      const textResponse = await fetch(extractionEndpoint, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(payload)
      });
      if (!textResponse.ok) {
           const errorText = await textResponse.text();
           console.error(`SMS Text Classification Error (${textResponse.status}):`, errorText);
           let errorJson = { error: `Backend error: ${response.status}` };
           try { errorJson = JSON.parse(errorText); } catch (e) {}
           throw new Error(errorJson.error || `Backend error: ${response.status}`);
      } 
      
      const data = await textResponse.json();
      console.log("SMS Text Classification Result:", data);

      const resultDataForNotification = { ...data };
      if (payload.sender) {
        resultDataForNotification.sender = payload.sender;
      }

      //handleNewScanResult(resultDataForNotification);

      showModal(data);


  } catch(textError) {
      console.error("Error calling SMS text classification endpoint:", textError);
  }
  };


  // --- Unified Scan Function (Called by handleUrlScan and sendSmsToBackendForProcessing) ---
  const unifiedScan = async (payload) => {
    // 'payload' will be either { url: "..." }
    // OR { url: "...", sender: "..." } <- from extracted SMS URL
    const endpoint = `${config.BASE_URL}/scan`;
    console.log(`Sending to ${endpoint} for scanning:`, JSON.stringify({ url: payload.url }));

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: payload.url }), // Send ONLY {url: ...}
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Backend Scan Error (${response.status}):`, errorText);
             let errorJson = { error: `Backend error: ${response.status}` };
             try { errorJson = JSON.parse(errorText); } catch (e) {}
            throw new Error(errorJson.error || `Backend error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Unified Scan Result:", data);

        // Add sender info back if it came from an SMS payload for notification context
        const resultDataForNotification = { ...data };
        if (payload.sender) {
            resultDataForNotification.sender = payload.sender;
        }

        // Call the context handler with the backend result (and added sender if applicable)
        handleNewScanResult(resultDataForNotification);

        // Show modal only for direct URL scans (when sender is NOT in original payload)
        // if (payload.url && !payload.sender && data.log_details) {
        //     showModal(data.log_details);
        // }

    } catch (error) {
        console.error("Error during unified scan:", error.message);
        if (payload.url && !payload.sender) { // Only show alert for manual URL scans
           Alert.alert('Scan Error', `Scan failed: ${error.message}`);
        }
    }
  };

  // --- Modal Functions ---
  const showModal = (log) => {
    setScanResultForModal(log); 
    setSelectedLog(log);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
  };

  // Delete Handler 
  const handleDeleteLog = async (logId) => {
    if (!logId) {
      console.error("Delete failed: No log ID provided.");
      Alert.alert("Error", "Cannot delete log without an ID.");
      return;
    }
    console.log("Attempting to delete log:", logId);
    setIsLoadingScan(true); 
    try {
      const deleteUrl = `${config.BASE_URL}/logs/${logId}`;
      const response = await fetch(deleteUrl, { method: "DELETE" });
      const result = await response.json(); 

      if (!response.ok || result.error) {
        throw new Error(
          result.error || `Failed to delete (Status: ${response.status})`
        );
      }

      Alert.alert("Success", "Log deleted successfully.");
      closeModal(); 
      // Optionally: Refresh any log lists displayed elsewhere in the app
    } catch (err) {
      console.error("Delete failed:", err);
      Alert.alert("Error", `Could not delete log: ${err.message}`);
    } finally {
      setIsLoadingScan(false);
    }
  };

  // --- Render Logic ---
  if (!fontsLoaded) {
    return <SafeAreaView style={styles.container}><Text>Loading...</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Power Icon and Protection Status - Make Icon Touchable */}
      <View style={styles.iconContainer}>
        {isTogglingProtection ? (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator
              size="large"
              color="#3AED97"
              style={{ transform: [{ scale: 2.5 }] }}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleProtectionToggle}
            style={styles.iconContainer}
            disabled={isTogglingProtection}
          >
            <Image
              source={
                isProtectionEnabled
                  ? require("../../assets/images/enableButton.png")
                  : require("../../assets/images/disableButton.png")
              }
              style={styles.powerIcon}
            />
            <Text style={styles.protectionText}>SMS Protection</Text>
            <Text
              style={[
                styles.statusText,
                { color: isSmsListening ? "#31EE9A" : "#AAAAAA" },
              ]}
            >
              {isSmsListening ? "Enabled" : "Disabled"}
            </Text>

            {!smsPermissionGranted && Platform.OS === "android" && (
              <Text style={styles.warningText}>Tap to grant SMS permissions</Text>
            )}
          </TouchableOpacity>
        )}
      </View>


      {/* Input and Scan Button */}
      <View style={styles.inputContainer}>
        <Text style={styles.scanLabel}>Scan URL:</Text>
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
              if (inputValue) {
                setInputValue("");
              }
          }}
          value={url}
          autoCapitalize="none"
          keyboardType="url"
        />
        {/* --- Display Error Message Below Input --- */}
         {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}

        {/* Show ActivityIndicator instead of button while loading */}
        {isLoadingScan ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3AED97" />
            <Text style={styles.loadingText}>Scanning...</Text>
          </View>
        ) : (
          <><TouchableOpacity style={styles.scanButton} onPress={handleUrlScan}>
              <LinearGradient
                colors={["#3AED97", "#BCE26E", "#FCDE58"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.scanButtonText}>SCAN</Text>
              </LinearGradient>
            </TouchableOpacity></>   
        )}
      </View>

      <DetailsModal
        navigation={navigation}
        visible={modalVisible}
        onClose={closeModal}
        scanResult={scanResultForModal}
        //onDeletePress={handleDeleteLog}
      />
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  powerIcon: {
    width: 130,
    height: 140,
    resizeMode: "contain",
  },
  imagePlaceholder: {
    width: 130,
    height: 140, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  protectionText: {                         
    color: "#31EE9A",
    // fontFamily: "Poppins-ExtraBold", 
    fontSize: 20,
    fontWeight: "600",
    marginTop: 10,
  },
  statusText: {
    color: "#31EE9A",
    // fontFamily: "Poppins-ExtraBold", 
    fontSize: 16,
    fontWeight: "400",
    marginTop: 5,
  },
  inputContainer: {
    width: "80%",
    alignItems: "flex-start",
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
    //backgroundColor: "rgba(0, 43, 54, 0.8)", 
    marginBottom: 20,
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
    marginBottom: 15,
    marginLeft: 5,
  },
  scanButton: {
    width: "100%",
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 20,
  },
  gradientButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButtonText: {
    color: "#000000",
    // fontFamily: "Inter", // Make sure font is linked
    fontSize: 16, // Slightly smaller
    fontWeight: "800",
    letterSpacing: 3, // Less spacing
  },
  loadingContainer: {
    // Applied additionally to container when loading
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 0, // Override padding when only showing loader
  },
   warningText: { // Added style
     marginTop: 10,
     color: 'orange',
     fontSize: 12,
   }
});

  // --- Backend Interaction Functions ---
  // const handleUrlScan = async () => { 
  //   if (!url) {
  //       Alert.alert('Input Needed', 'Please enter a URL to scan.');
  //       return;
  //   }
  //   try {
  //     const response = await fetch(`${config.BASE_URL}/predict/scan`, {
  //       method: 'POST',
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ url }),
  //     });

  //     if (!response.ok) throw new Error(`Backend error: ${response.status}`);
  //     const data = await response.json();
  //     if (data.error) throw new Error(data.error);
  //     console.log("URL Scan Result:", data);
      
  //     // Show Result
  //     handleNewScanResult(data)

  //   } catch (error) {
  //     console.error("Error scanning URL:", error);
  //     Alert.alert('Scan Error', `Failed to scan URL: ${error.message}`);
  //   }
  // };

  // const sendSmsToBackendForScan = async (smsData) => {
  //   console.log('Sending SMS to backend for scan:', smsData);
  //   if (!smsData || !smsData.body) return; 

  //   const endpoint = `${config.BASE_URL}/sms/classify_content`;
  //   //NEED TO CHANGE
  //   const payload = { 
  //     body: smsData.body,
  //     sender: smsData.sender 
  //   };


  //   try {
  //     setLoading(true);
      
  //     console.log("SMS Data:", smsData.body);
  //     const response = await fetch(`${config.BASE_URL}/predict/scan`, { 
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     });

  //     if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      
  //     const data = await response.json();
  //     console.log("SMS Scan Result:", data);
  //     // Show result
  //     handleNewScanResult(data)

  //   } catch (error) {
  //     setLoading(false);
  //     console.error("Error sending SMS to backend:", error);
  //   }
  // };