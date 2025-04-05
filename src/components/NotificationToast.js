import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';

// Import icons from your assets
const iconMap = {
  "suspicious-icon": require("../assets/images/suspicious-icon.png"),
  "safe-icon": require("../assets/images/safe-icon.png"),
};

const NotificationToast = ({ notification, onPress, onDismiss }) => {
  const slideAnim = new Animated.Value(-100);

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
  
  return (
    <Animated.View 
      style={[
        styles.toastContainer, 
        isMalicious ? styles.toastContainerWarning : styles.toastContainerInfo,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <TouchableOpacity 
        style={styles.toastContent} 
        onPress={() => onPress && onPress(notification)}
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