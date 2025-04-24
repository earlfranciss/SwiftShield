// SimpleToast.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native"; // Import Image

// const windowHeight = Dimensions.get('window').height; // Not strictly needed anymore
const windowWidth = Dimensions.get("window").width;

const SimpleToast = ({ visible, message, iconSource }) => {
  // Add iconSource prop
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0, // Animate to 1 if visible, 0 if not
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // We need a wrapper View to handle the absolute positioning and centering
  // while the Animated.View handles the opacity and content styling.
  if (!visible && fadeAnim._value === 0) {
    return null; // Don't render if fully faded out
  }

  return (
    // Outer container handles positioning and centering the toast
    <View style={styles.outerContainer} pointerEvents="none">
      <Animated.View
        style={[
          styles.toastContainer, // Renamed style for clarity
          {
            opacity: fadeAnim, // Bind opacity to animated value
          },
        ]}
        // pointerEvents needed if you ever want to tap the toast itself
        // pointerEvents="auto"
      >
        {/* Conditionally render the icon */}
        {iconSource && <Image source={iconSource} style={styles.icon} />}
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    bottom: 60, // Adjust position from bottom
    left: 0, // Occupy full width to allow centering
    right: 0,
    alignItems: "center", // Center the toastContainer horizontally
    zIndex: 9999, // Ensure it's on top
  },
  toastContainer: {
    flexDirection: "row", // Arrange icon and text horizontally
    alignItems: "center", // Align icon and text vertically
    backgroundColor: "rgba(40, 40, 40, 0.9)",
    paddingVertical: 10,
    paddingHorizontal: 18, // Adjust padding as needed
    borderRadius: 25, // Make it more rounded pill-shape
    // Remove left/right, add alignSelf if not using outer container for centering
    // alignSelf: 'center',
    maxWidth: windowWidth * 0.8, // Max width 80% of screen
    marginHorizontal: 20, // Ensure some margin if text is very long
    elevation: 5,
  },
  icon: {
    width: 18, // Adjust icon size
    height: 18, // Adjust icon size
    marginRight: 8, // Space between icon and text
    resizeMode: "contain", // Adjust resizeMode as needed
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    flexShrink: 1, // Allow text to shrink if needed within maxWidth
  },
});

export default SimpleToast;
