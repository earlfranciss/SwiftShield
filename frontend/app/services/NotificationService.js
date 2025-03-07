import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Function to schedule a notification
export async function scheduleNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      badge: 1,
    },
    trigger: null, // null means show immediately
  });
}

// Function to handle notification response
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  // Handle received notifications
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    notification => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Handle notification responses (when user taps notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    response => {
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    }
  );

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// Request permission
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}