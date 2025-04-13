import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { AppState, Platform } from 'react-native'; 
import {
  initNotifications,          
  scheduleNotification,   
  requestNotificationPermissions 
} from '../services/NotificationService'; 


const NotificationContext = createContext();


export const NotificationProvider = ({ children }) => {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [inAppNotification, setInAppNotification] = useState(null);
  const appState = useRef(AppState.currentState);

  // Initialize Notifications and AppState listener on mount
  useEffect(() => {
    initNotifications(); 

    // Request iOS permissions when context loads if desired
    // if (Platform.OS === 'ios') {
    //   requestNotificationPermissions();
    // }

    // AppState listener
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
      console.log("AppState changed to:", appState.current);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // The function to handle incoming scan results
  const handleNewScanResult = (scanResultData) => {
    if (!scanResultData) {
        console.warn("handleNewScanResult called with invalid data");
        return;
    }

    const verdict = scanResultData.log_details?.verdict;
    const isMalicious = verdict?.toLowerCase() === 'phishing';
    const severity = scanResultData.severity || scanResultData.log_details?.severity || 'N/A';
    
    const notification = {
        id: scanResultData.detect_id || Math.random().toString(),
        url: scanResultData.url || scanResultData.text || 'N/A',
        icon: isMalicious ? "suspicious-icon" : "safe-icon",
        title: isMalicious ? "Warning: Malicious Content Detected" : "Scan Result: Safe",
        body: `Severity: ${severity}. ${scanResultData.url ? `(${scanResultData.url.substring(0,30)}...) ` : ''}${isMalicious ? 'Avoid interaction.' : ''}`,
        rawData: scanResultData
    };

    console.log("Handling new scan result:", notification);
    setHasUnreadNotifications(true);

    if (appState.current === 'active') {
      console.log("App active, setting in-app notification state.");
      setInAppNotification(notification);
      // Optional: Auto-clear after delay
      // setTimeout(() => setInAppNotification(null), 5000);
    } else {
      console.log("App inactive/background, scheduling system notification.");
      scheduleNotification(notification.title, notification.body, notification.rawData);
    }
  };

  // Value provided by the context
  const value = {
    hasUnreadNotifications,
    setHasUnreadNotifications,
    inAppNotification,
    setInAppNotification,
    handleNewScanResult
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook 
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

