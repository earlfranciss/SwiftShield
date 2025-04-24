import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import DetailsModal from './DetailsModal'; 

// Import icons from your assets
const iconMap = {
  "suspicious-icon": require("../assets/images/suspicious-icon.png"),
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

  const isMalicious = notification.icon === "suspicious-icon";
  const title = isMalicious ? "Warning: Malicious Link Detected" : "Safe Link Verified";
  const body = notification.url || notification.link || "";
  
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
    width: 24,
    height: 24,
    marginRight: 12,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  toastMessage: {
    fontSize: 14, 
    color: '#000',
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NotificationToast;