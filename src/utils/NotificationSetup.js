   // utils/NotificationSetup.js
   import { PermissionsAndroid, Platform } from 'react-native';
   import PushNotification from 'react-native-push-notification';

   // Function to request SMS permissions
   export const requestSMSPermission = async () => {
     if (Platform.OS === 'android') {
       try {
         const granted = await PermissionsAndroid.request(
           PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
           {
             title: 'SMS Permission',
             message:
               'App needs access to your SMS to detect potential phishing messages.',
             buttonNeutral: 'Ask Me Later',
             buttonNegative: 'Cancel',
             buttonPositive: 'OK',
           },
         );
         if (granted === PermissionsAndroid.RESULTS.GRANTED) {
           console.log('SMS permission granted');
         } else {
           console.log('SMS permission denied');
         }
       } catch (err) {
         console.warn(err);
       }
     }
   };

   // Function to create a notification channel (Android 8.0+)
   export const createNotificationChannel = () => {
     PushNotification.createChannel(
       {
         channelId: "spam-detection", // (required)
         channelName: "Spam Detection Channel", // (required)
         channelDescription: "A channel to categorize spam detection notifications", // (optional)
         importance: 4, // (optional) default: 4. Int value of the Android notification importance
         vibrate: true, // (optional) default: true. Creates the default vibration patten if true.
       },
       (created) => console.log(`createChannel returned '${created}'`) // (optional) callback returns whether the channel was created, false means it already existed.
     );
   };