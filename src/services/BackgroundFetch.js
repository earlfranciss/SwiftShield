// Example using react-native-background-fetch (in App.js or a similar entry point)

import BackgroundFetch from 'react-native-background-fetch';
import { scanGmail } from './GmailScanner';  // Import your Gmail scanning function

const configureBackgroundFetch = () => {
  BackgroundFetch.configure({
    minimumFetchInterval: 300, // 5 minutes (300 seconds)
    stopOnTerminate: false, // Allow background fetch to run even when the app is terminated
    startOnBoot: true,        // Start background fetch on device boot
    requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY, //Fetch regardless of network connection
    requiresCharging: false,      //Optional:  Only run on battery power
  }, async (taskId) => {
    console.log("[BackgroundFetch] taskId:", taskId);
    await scanGmail(); // Call your Gmail scanning function
    BackgroundFetch.finish(taskId); // REQUIRED, to signal completion of the task.
  }, (error) => {
    console.log("[BackgroundFetch] failed: ", error);
  });

  // Optional:  Start immediately.
  BackgroundFetch.start();
};


useEffect(() => {
  configureBackgroundFetch();

  //Permissions setup - SMS and notifications
  requestSMSPermission();
  createNotificationChannel();
}, []);