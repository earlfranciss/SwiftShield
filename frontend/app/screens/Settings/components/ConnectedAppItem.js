import React from 'react';
import { View, Text, Image, Switch, StyleSheet, Pressable } from 'react-native';

// Define your green color constant
const APP_GREEN_COLOR = '#31EE9A'; // Example green, adjust as needed

const PRESS_FEEDBACK_COLOR = 'rgba(255, 255, 255, 0.1)'; // Subtle white overlay

const ConnectedAppItem = ({ iconSource, appName, isEnabled, onToggle }) => {
    return (
      // Modify the style prop of Pressable
      <Pressable
        onPress={onToggle}
        // Use the function form for the style prop
        style={({ pressed }) => [
          styles.pressableContainer, // Apply the base styles first
          pressed // Check if the component is currently being pressed
            ? { backgroundColor: PRESS_FEEDBACK_COLOR } // Apply feedback color if pressed
            : null, // Otherwise, apply no additional background color
        ]}
      >
        {/* Keep the inner content wrapper - it should not have the feedback background */}
        <View style={styles.contentWrapper}>
          {/* Left side: Icon and Text */}
          <View style={styles.leftContent}>
            <Image source={iconSource} style={styles.icon} />
            <Text style={styles.appNameText}>{appName}</Text>
          </View>
  
          {/* Right side: Switch */}
          <Switch
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isEnabled ? '#f4f3f4' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={onToggle}
            value={isEnabled}
            onTouchStart={(e) => e.stopPropagation()}
          />
        </View>
      </Pressable>
    );
  };

const styles = StyleSheet.create({
  pressableContainer: {
    marginHorizontal: 15, // Add horizontal margin to the container
    marginVertical: 10,    // Add vertical margin between items
    borderRadius: 15,     // Rounded corners for the container
    backgroundColor: 'transparent', // Explicitly transparent background
    // Add padding inside the Pressable if you want more clickable area around content
    // paddingVertical: 5,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,   // Padding inside the content area
    paddingHorizontal: 5, // Padding inside the content area
    // If you wanted a visible border for the transparent rectangle:
    // borderWidth: 1,
    // borderColor: '#555', // Example border color
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, // Allow text to shrink if needed, prevent pushing switch off-screen
  },
  icon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginRight: 15,
    marginLeft: 10,
  },
  appNameText: {
    color: APP_GREEN_COLOR,
    fontSize: 17,
    fontWeight: '500',
  },
});

export default ConnectedAppItem;