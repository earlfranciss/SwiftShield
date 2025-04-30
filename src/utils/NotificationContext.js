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

    const { type, severity, source, preview, detectionId, urls } = scanResultData;
    
    // Determine notification content based on type
    let title, body, icon;
    
    switch (type) {
      case 'sms':
        title = "SMS Phishing Alert";
        body = `Suspicious SMS from ${source}${preview ? `: ${preview}` : ''}`;
        icon = "sms-warning-icon";
        break;
        
      case 'gmail':
        title = "Email Phishing Alert";
        body = `Suspicious email${source ? ` from ${source}` : ''}${preview ? `: ${preview}` : ''}`;
        icon = "email-warning-icon";
        break;
        
      case 'url':
        title = "URL Scan Result";
        body = `${severity === 'high' ? 'Dangerous' : 'Suspicious'} URL detected${source ? ` from ${source}` : ''}`;
        icon = "url-warning-icon";
        break;
        
      default:
        title = "Security Alert";
        body = `Potential threat detected${severity ? ` (${severity})` : ''}`;
        icon = "warning-icon";
    }

    const notification = {
      id: detectionId || Math.random().toString(),
      type,
      severity,
      source,
      preview,
      icon,
      title,
      body,
      urls,
      rawData: scanResultData
    };

    console.log("Processing new scan result:", notification);
    setHasUnreadNotifications(true);

    if (appState.current === 'active') {
      console.log("App active, showing in-app notification");
      setInAppNotification(notification);
      
      // Auto-clear after 5 seconds if not interacted with
      setTimeout(() => {
        setInAppNotification((current) => 
          current?.id === notification.id ? null : current
        );
      }, 5000);
    } else {
      console.log("App inactive/background, scheduling system notification");
      scheduleNotification(notification.title, notification.body, {
        type,
        detectionId,
        source,
        preview,
        severity
      });
    }
  };

  const clearNotification = (notificationId) => {
    setInAppNotification((current) => 
      current?.id === notificationId ? null : current
    );
  };

  // Value provided by the context
  const value = {
    hasUnreadNotifications,
    setHasUnreadNotifications,
    inAppNotification,
    setInAppNotification,
    handleNewScanResult,
    clearNotification
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

