import React, { useEffect, useState, useRef, useCallback } from "react";
import { NavigationContainer } from '@react-navigation/native';
import 'react-native-gesture-handler';
import Navigation from './navigation/Navigation';
import { NotificationProvider, useNotifications } from './utils/NotificationContext';
import NotificationToast from './components/NotificationToast';
import BackgroundFetch from 'react-native-background-fetch';
import { scanGmail } from './services/GmailService';
import { GmailProvider, GmailContext } from './context/GmailContext';
import PushNotification from 'react-native-push-notification';
// index.js or App.js
import 'react-native-crypto';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { useAppState } from './utils/appState'; // Import useAppState
// import { send, receive } from 'react-native-background-fetch';
import { requestSMSPermission, createNotificationChannel } from './utils/NotificationSetup';
import { GoogleSignin } from '@react-native-google-signin/google-signin';


// Add polyfills for globals
if (typeof global.self === 'undefined') {
  global.self = global;
}

if (typeof __dirname === 'undefined') {
    global.__dirname = '/';
}
if (typeof __filename === 'undefined') {
    global.__filename = '';
}

global.process = require('process');
global.Buffer = require('buffer').Buffer;

if (Platform.OS === 'android') {
    global.location = {
        protocol: 'file:'
    };
}


const AppContent = () => {
  const { inAppNotification, setInAppNotification } = useNotifications();

  return (
    <>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>

      {/* Notification Toast */}
      {inAppNotification && (
        <NotificationToast
          notification={inAppNotification}
          onPress={(notification) => {
            // Handle navigation carefully
            console.log("Toast pressed, navigate if possible");
            // globalNavigation?.navigate(...);
            setInAppNotification(null);
          }}
          onDismiss={() => setInAppNotification(null)}
        />
      )}
    </>
  );
}

const HeadlessTask = async (event) => {
  let taskId = event.taskId;
  let isTimeout = event.timeout;  // true if the task has timed out
  if (isTimeout) {
    console.log('[BackgroundFetch] HeadlessTask TIMEOUT: taskId: ', taskId);
    BackgroundFetch.finish(taskId);
    return;
  }
  console.log('[BackgroundFetch] HeadlessTask start: ', taskId);

  try {
    // Call scanGmail and await the results
    const gmailData = await scanGmail();

    // Send the results back to the main app for processing
    send(gmailData);
    console.log('[BackgroundFetch] HeadlessTask complete: ', taskId);

  } catch (e) {
    console.log('[BackgroundFetch HeadlessTask] failed: ', taskId, e);
  }
  // Required:  Signal to native code that your task is complete.
  // If you don't do this, your app will be terminated and/or
  // background-fetch will stop performing fetch events.
  BackgroundFetch.finish(taskId);
}

BackgroundFetch.registerHeadlessTask(HeadlessTask);


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
    return { smsGranted: false, notificationGranted: false };
  }
};

const createChannel = () => {
  PushNotification.createChannel(
    {
      channelId: "default-channel-id",
      channelName: "Default channel",
      channelDescription: "A default channel", 
      playSound: true, 
      soundName: "default", 
      importance: 4, 
      vibrate: true, 
    },
    (created) => console.log(`Channel created: ${created}`)
  );
};
const App = () => {
  const [smsPermissionGranted, setSmsPermissionGranted] = useState(false); // Add this
  const appState = useAppState(); // Use the hook here
  const performGmailResult = useCallback((result, message, smsPermissionGranted) => {
    const { setPhishingResult, setShowDetailsModal } = useContext(GmailContext);
    const isInForeground = appState === 'active';

    if (isInForeground) {
      // Display in DetailsModal
      setPhishingResult({ ...result, ...message });
      setShowDetailsModal(true);
    } else {
      // Display push notification
      PushNotification.localNotification({
        channelId: "default-channel-id",
        title: "Gmail Alert!",
        message: `Possible spam Gmail from ${message.sender}: ${result.label}`,
        bigText: `Possible spam Gmail from ${message.sender} with subject ${message.subject}: Classification: ${result.label}`,
        priority: "high",
        showWhen: true,
        onlyAlertOnce: true,
        showWhen: true,
      });
    }
  }, []);

  useEffect(() => {
       if(Platform.OS === 'android'){
         requestAllPermissions();
         createChannel();
       }

     configureBackgroundFetch();
     receive(gmailData => {
       console.log("Received gmail data from headless task", gmailData);

       if (gmailData && Array.isArray(gmailData)) {
            gmailData.forEach(message => {
             performGmailResult(message, smsPermissionGranted)
         });
       }
     });

   }, []);

   const configureBackgroundFetch = async () => {

     let status = await BackgroundFetch.configure({
       minimumFetchInterval: 300, // 5 minutes (300 seconds)
       stopOnTerminate: false, // Allow background fetch to run even when the app is terminated
       startOnBoot: true, // Start background fetch on device boot
       requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY, //Fetch regardless of network connection
       requiresCharging: false, //Optional:  Only run on battery power
       enableHeadless: true
     }, (taskId) => {
       console.log("[BackgroundFetch] taskId:", taskId);
       BackgroundFetch.finish(taskId);
     }, (error) => {
       console.log("[BackgroundFetch] failed: ", error);
     });

     // Optional: Start immediately.
     if (status !== BackgroundFetch.STATUS_AVAILABLE) {
       console.log("Background fetch not available");
     }
     BackgroundFetch.start();
   };

  return (
    <GmailProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </GmailProvider>
  );
};

export default App;