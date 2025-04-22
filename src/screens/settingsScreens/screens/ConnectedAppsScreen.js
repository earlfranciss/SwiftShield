import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar, 
  Pressable, 
  Alert,
  Linking,
} from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import config from '../../../config/config';
import ConnectedAppItem from '../components/ConnectedAppItem';
 
// Color constant 
const APP_GREEN_COLOR = '#31EE9A'; 
const BACKGROUND_COLOR = '#000000'; 

// --- IMPORTANT: Replace these with your actual icon paths ---
const DUMMY_ICON_MSG = require('../../../assets/images/messages_icon.png'); 
const DUMMY_ICON_GMAIL = require('../../../assets/images/gmail_icon.png'); 
// ---

const ConnectedAppsScreen = ({ navigation }) => { 
  const [isSmsEnabled, setIsSmsEnabled] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false); 
  const [apps, setApps] = useState([
    { id: 'msg', name: 'Messages', icon: DUMMY_ICON_MSG, enabled: isSmsEnabled },
    { id: 'gmail', name: 'Gmail', icon: DUMMY_ICON_GMAIL, enabled: isGmailConnected },
  ]);


  const handleToggle = (appId, newValue) => {
    setApps(currentApps =>
      currentApps.map(app =>
        app.id === appId ? { ...app, enabled: !app.enabled } : app
      )
    );
    // Optional: Add API call or local storage logic here
    const toggledApp = apps.find(app => app.id === appId);
    if (toggledApp) {
        console.log(`Toggled ${toggledApp.name} to ${!toggledApp.enabled}`);
    }
    if (appId === 'msg') {
      handleToggleSms(newValue); // Call the specific SMS handler
    } else if (appId === 'gmail') {
      // If the Gmail switch is toggled ON, initiate connection
      // If toggled OFF, initiate disconnection (if implemented)
      if (newValue === true && !isGmailConnected) {
         handleConnectGmail();
      } else if (newValue === false && isGmailConnected) {
         // Trigger disconnect logic if you have it
         handleConnectGmail(); // Currently shows 'Disconnect not implemented'
      }
      // Note: The visual state of the Gmail switch (isGmailConnected)
      // should ideally be updated based on the actual connection status
      // fetched from backend or after successful OAuth flow / disconnect.
      // For now, toggling it directly might be confusing if connection fails.
      // Consider making the Gmail item just a button instead of a switch.
    }
  };

  const handleItemPress = (appId, newValue) => {
    //console.log(`Row pressed for ${item.name}`);
    if (appId === 'msg') {
      handleToggleSms(newValue); // Call the specific SMS handler
    } else if (appId === 'gmail') {
      // If the Gmail switch is toggled ON, initiate connection
      // If toggled OFF, initiate disconnection (if implemented)
      if (newValue === true && !isGmailConnected) {
         handleConnectGmail();
      } else if (newValue === false && isGmailConnected) {
         // Trigger disconnect logic if you have it
         handleConnectGmail(); // Currently shows 'Disconnect not implemented'
      }
      // Note: The visual state of the Gmail switch (isGmailConnected)
      // should ideally be updated based on the actual connection status
      // fetched from backend or after successful OAuth flow / disconnect.
      // For now, toggling it directly might be confusing if connection fails.
      // Consider making the Gmail item just a button instead of a switch.
    }
  }

  // Function to handle back navigation
  const handleGoBack = () => {
    // Use navigation prop if available (from React Navigation)
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback or specific action if navigation is not available/cannot go back
      console.log("Cannot go back or navigation prop not provided.");
    }
  };


  const handleConnectGmail = () => {
      if (isGmailConnected) {
        Alert.alert("Gmail", "Disconnect functionality not yet implemented.");
        return;
      }
      const finalRedirect = encodeURIComponent('swiftshield://google/auth/success'); 
      const googleLoginUrl = `${config.BASE_URL}/google-login?final_redirect=${finalRedirect}`;
  
      console.log("Opening Google Login URL:", googleLoginUrl);
  
      // Open the URL in the system browser or an in-app browser
      Linking.openURL(googleLoginUrl).catch(err => {
         console.error("Failed to open URL", err);
         Alert.alert("Error", "Could not open the connection page.");
      });
    };

     // --- SMS Listener Handler ---
  const handleToggleSms = async (newValue) => {
    if (newValue === true) { // User wants to ENABLE SMS listening
       console.log("Attempting to enable SMS listener...");
        // 1. Check/Request Permissions
        let permissionsOk = await checkOrRequestSmsPermissions(); // Implement this helper
        if (!permissionsOk) {
            Alert.alert('Permissions Required', 'Cannot enable SMS protection without SMS read/receive permissions.');
            return; // Don't change switch state if permissions fail
        }
        // 2. Start the Listener (Import or get from context)
        console.log("TODO: Call startSmsListening()");
        // startSmsListening(); // Replace with actual call
        setIsSmsEnabled(true); // Update state only after starting successfully
    } else { // User wants to DISABLE SMS listening
        console.log("Attempting to disable SMS listener...");
        // 1. Stop the Listener (Import or get from context)
        console.log("TODO: Call stopSmsListening()");
         // stopSmsListening(); // Replace with actual call
        setIsSmsEnabled(false); // Update state
    }
 };

   // --- Permission Helper (Example) ---
   const checkOrRequestSmsPermissions = async () => {
    // Re-use the permission logic from Home.js or move it to a shared util
     if (Platform.OS !== 'android') return false;
     try {
         const granted = await PermissionsAndroid.requestMultiple([
             PermissionsAndroid.PERMISSIONS.READ_SMS,
             PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
             // PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, // Only if needed right now
         ]);
         const smsReadGranted = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
         const smsReceiveGranted = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
         return smsReadGranted && smsReceiveGranted;
     } catch (err) {
         console.warn("SMS Permission check/request failed:", err);
         return false;
     }
 };


  return (
    <View style={styles.screenContainer}>

      <StatusBar barStyle="light-content" />

      <View style={styles.headerContainer}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={APP_GREEN_COLOR} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Connected Apps</Text>
        </View>

        <View style={styles.backButton} /> 
      </View>

      {/* List of Apps */}
      <FlatList
        data={apps}
        renderItem={({ item }) => (
          <ConnectedAppItem
            iconSource={item.icon}
            appName={item.name}
            isEnabled={item.enabled}
            onItemPress={() => handleItemPress(item)}
            onToggle={(newValue) => handleToggle(item.id, newValue)}
            isConnectType={item.type === 'connect'}
          />
        )}
        keyExtractor={item => item.id}
        // Optional: Add space at the bottom
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Distribute space
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1, // Optional separator line
    borderBottomColor: '#222', // Optional separator line color
  },
   backButton: {
    padding: 5, // Increase touch area for the back button
    minWidth: 40, // Ensure minimum width for balance/spacer
    alignItems: 'flex-start', // Align icon left for button, keep space for spacer
  },
  headerTitleContainer: {
      // flex: 1, // Allow title container to take up space if needed for centering text
      alignItems: 'center', // Center text within its container
  },
  headerTitle: {
    color: APP_GREEN_COLOR,
    fontSize: 18,
    fontWeight: '600',
  },
  // ConnectedAppItem styles are now in its own file
});

export default ConnectedAppsScreen;