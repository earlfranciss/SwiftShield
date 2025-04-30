import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import DetailsModal from './DetailsModal'; 

// Import icons from your assets
const iconMap = {
  "sms-warning-icon": require("../assets/images/suspicious-icon.png"),
  "email-warning-icon": require("../assets/images/suspicious-icon.png"),
  "url-warning-icon": require("../assets/images/suspicious-icon.png"),
  "warning-icon": require("../assets/images/suspicious-icon.png"),
  "safe-icon": require("../assets/images/safe-icon.png"),
};

// Helper function to format time (same as in Notifications.js)
const formatTimeAgo = (timestamp) => {
  try {
    // Check if timestamp is valid
    if (!timestamp) {
      return "Unknown time";
    }
    
    // Convert to Date object if it's not already
    const scanTime = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(scanTime.getTime())) {
      return "Unknown time";
    }
    
    const now = new Date();
    const diffMs = now - scanTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} mins. ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error("Error formatting time:", error); 
    return "Unknown time";
  }
};


const getBackgroundColor = (type, severity) => {
  if (severity === 'high') {
    return '#FF4D4D'; // Red for high severity
  }
  
  switch (type) {
    case 'sms':
      return '#FFB74D'; // Orange for SMS
    case 'gmail':
      return '#4285F4'; // Google Blue for Gmail
    case 'url':
      return '#FF8F00'; // Dark Orange for URLs
    default:
      return '#757575'; // Grey for unknown types
  }
};

const NotificationToast = ({ notification, onPress, onDismiss, navigation }) => {
  const slideAnim = new Animated.Value(-100);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    // Slide in
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (onDismiss) onDismiss();
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const backgroundColor = getBackgroundColor(notification.type, notification.severity);
  
  // Handle notification press to open the modal
  const handleNotificationPress = () => {
    // Stop auto-dismiss timer when the notification is pressed
    clearTimeout(slideAnim._startTime);
    
    // Convert notification to format expected by DetailsModal
    const scanResult = {
      log_id: notification.id,
      url: notification.url || notification.link,
      date_scanned: notification.timestamp ? new Date(notification.timestamp).toISOString() : null,
      severity: notification.severity || (notification.icon === "safe-icon" ? "safe" : "critical"),
      phishing_percentage: notification.phishing_percentage || (notification.icon === "safe-icon" ? 5 : 95),
      recommended_action: notification.recommended_action || 
                      (notification.icon === "safe-icon" ? "Safe to visit" : "Do not visit this site"),
      platform: notification.platform || notification.title || "Unknown"
    };
    
    setSelectedNotification({ ...notification, ...scanResult, read: true });
    setModalVisible(true);
    
    // Call the original onPress if needed (you can disable this if you only want the modal)
    if (onPress) onPress(notification);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedNotification(null);
    
    // Dismiss the toast after modal is closed
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) onDismiss();
    });
  };
  
  // Handle delete from modal
  const handleDeleteNotification = () => {
    // Close modal first
    setModalVisible(false);
    
    // Then dismiss the toast
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) onDismiss();
    });
  };
  
  return (
    <>
      <Animated.View 
        style={[
          styles.toastContainer, 
          isMalicious ? styles.toastContainerWarning : styles.toastContainerInfo,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.toastContent} 
          onPress={handleNotificationPress}
        >
          <Image 
            source={iconMap[notification.icon || "safe-icon"]} 
            style={[
              styles.toastIcon,
              notification.icon === "safe-icon" && { tintColor: "black" }
            ]} 
            resizeMode="contain"
          />
          <View style={styles.toastTextContainer}>
            <Text style={styles.toastTitle}>{title}</Text>
            <Text style={styles.toastMessage} numberOfLines={1}>{body}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.dismissButton} 
          onPress={() => {
            Animated.timing(slideAnim, {
              toValue: -100,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              if (onDismiss) onDismiss();
            });
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>×</Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Details Modal */}
      <DetailsModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onDeletePress={handleDeleteNotification}
        scanResult={selectedNotification}
        navigation={navigation}
        loading={false}
      />
    </>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',

    top: 15, // Adjust this value to move it higher (was likely 60 or more)
    left: 0,
    right: 0,
    backgroundColor: '#3AED97',
// =======
//     top: 15,
//     left: 16,
//     right: 16,
//     borderRadius: 12,
// >>>>>>> Stashed changes
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  toastContainerWarning: {
    backgroundColor: '#FFF8E1',
  },
  toastContainerInfo: {
    backgroundColor: '#3AED97',
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIcon: {
    width: 28,
    height: 28,
    marginRight: 12,
    tintColor: '#FFFFFF',
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toastMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  urlCount: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
    fontStyle: 'italic',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 24,
  },
});

export default NotificationToast;