import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  StatusBar,
  Pressable, // Import Pressable
} from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";

// Define your green color constants
const HEADER_GREEN_COLOR = '#34D399';
const PUSH_TEXT_GREEN_COLOR = '#31EE9A';

// Define the press feedback color (same as in ConnectedAppItem)
const PRESS_FEEDBACK_COLOR = 'rgba(255, 255, 255, 0.1)'; // Subtle white overlay

const PushNotificationsScreen = ({ navigation }) => {
  const [allowPush, setAllowPush] = useState(true);

  // Handler for toggling - can be called by Pressable or Switch
  const handleTogglePush = () => {
    const newValue = !allowPush; // Calculate the new value first
    setAllowPush(newValue);
    // Optional: Add logic here
    console.log(`Push notifications toggled to: ${newValue}`);
  };

  const handleGoBack = () => {
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      console.log("Cannot go back or navigation prop not provided.");
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" />

      {/* Custom Header (remains the same) */}
      <View style={styles.headerContainer}>
         <Pressable onPress={handleGoBack} style={styles.backButton}>
           <Ionicons name="chevron-back" size={28} color={HEADER_GREEN_COLOR} />
         </Pressable>
         <View style={styles.headerTitleContainer}>
           <Text style={styles.headerTitle}>Push Notifications</Text>
         </View>
         <View style={styles.backButton} />
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        {/* --- MODIFICATION START: Use Pressable Wrapper --- */}
        <Pressable
          onPress={handleTogglePush} // Toggle when the row is pressed
          style={({ pressed }) => [
            styles.pressableRowContainer, // Apply container styles
            pressed ? { backgroundColor: PRESS_FEEDBACK_COLOR } : null, // Apply press feedback
          ]}
        >
          {/* Inner View for content layout */}
          <View style={styles.rowContentWrapper}>
            <Text style={styles.rowText}>Allow push notifications</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={allowPush ? '#f4f3f4' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={handleTogglePush} // Also toggle when switch is changed directly
              value={allowPush}
              onTouchStart={(e) => e.stopPropagation()} // Prevent event bubbling if needed
            />
          </View>
        </Pressable>
        {/* --- MODIFICATION END --- */}

        {/* Add more notification-related settings here if needed, */}
        {/* potentially wrapping them in similar Pressable components */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 5,
    minWidth: 40,
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
      alignItems: 'center',
  },
  headerTitle: {
    color: HEADER_GREEN_COLOR,
    fontSize: 18,
    fontWeight: '600',
  },
  contentSection: {
      paddingTop: 15, // Adjusted slightly
      // No horizontal padding here, Pressable handles it
  },
  // --- NEW STYLES & RENAMED STYLES ---
  pressableRowContainer: {
    // Styles for the Pressable wrapper (similar to ConnectedAppItem)
    marginHorizontal: 15, // Indent from screen edges
    marginVertical: 5,    // Space between items if more added
    borderRadius: 10,     // Rounded corners
    backgroundColor: 'transparent', // Base background
    overflow: 'hidden',   // Clip background effect to border radius
  },
  rowContentWrapper: {
    // Styles for the View INSIDE Pressable (layout and padding)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,   // Internal vertical padding
    paddingHorizontal: 12, // Internal horizontal padding
  },
  rowText: {
    color: PUSH_TEXT_GREEN_COLOR,
    fontSize: 16, // Match font size if desired
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 10,
  },
  // --- END OF NEW/RENAMED STYLES ---
});

export default PushNotificationsScreen;