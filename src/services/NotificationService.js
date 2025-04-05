import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

// Configure notification channel for Android
const createChannel = () => {
  PushNotification.createChannel(
    {
      channelId: "default-channel-id", // (required)
      channelName: "Default channel", // (required)
      channelDescription: "A default channel", // (optional) default: undefined.
      playSound: true, // (optional) default: true
      soundName: "default", // (optional) See `soundName` parameter of `localNotification` function
      importance: 4, // (optional) default: 4. Int value of the Android notification importance
      vibrate: true, // (optional) default: true. Creates the default vibration pattern if true.
    },
    (created) => console.log(`Channel created: ${created}`) // (optional) callback returns whether the channel was created, false means it already existed.
  );
};

// Initialize notifications
export function initNotifications() {
  PushNotification.configure({
    // (optional) Called when Token is generated (iOS and Android)
    onRegister: function (token) {
      console.log("TOKEN:", token);
    },

    // (required) Called when a remote is received or opened, or local notification is opened
    onNotification: function (notification) {
      console.log("NOTIFICATION:", notification);
      // Required on iOS only
      if (Platform.OS === 'ios') {
        notification.finish();
      }
    },

    // (optional) Called when the user fails to register for remote notifications. 
    // Typically occurs when APNS is having issues, or the device is a simulator.
    onRegistrationError: function(err) {
      console.error(err.message, err);
    },

    // IOS ONLY (optional): default: all - Permissions to register.
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // Should the initial notification be popped automatically
    popInitialNotification: true,

    // If true, the notification will be displayed automatically (Android only)
    requestPermissions: Platform.OS === 'ios',
  });

  // Create the notification channel for Android
  if (Platform.OS === 'android') {
    createChannel();
  }
}

// Function to schedule a notification
export function scheduleNotification(title, body, data = {}) {
  PushNotification.localNotification({
    channelId: "default-channel-id", // (required) for Android
    title: title, 
    message: body,
    userInfo: data,
    playSound: true,
    soundName: "default",
    badge: 1,
  });
}

// Request permission (mainly for iOS)
export async function requestNotificationPermissions() {
  if (Platform.OS === 'ios') {
    try {
      const permissions = await PushNotification.requestPermissions(['alert', 'badge', 'sound']);
      return permissions.alert;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }
  return true; // Android permissions are requested on initialization
}

// Function to handle notification response (similar functionality)
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  // Initialize notifications first
  initNotifications();
  
  // Store the callbacks for later use
  if (onNotificationReceived) {
    global._onNotificationReceived = onNotificationReceived;
  }
  if (onNotificationResponse) {
    global._onNotificationResponse = onNotificationResponse;
  }
  
  // We return an empty cleanup function to maintain API compatibility
  return () => {
    global._onNotificationReceived = null;
    global._onNotificationResponse = null;
  };
}

// Clear all notifications
export function clearAllNotifications() {
  PushNotification.cancelAllLocalNotifications();
}

// Set badge number (mainly for iOS)
export function setBadgeCount(count) {
  PushNotification.setApplicationIconBadgeNumber(count);
}