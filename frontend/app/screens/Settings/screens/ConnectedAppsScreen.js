import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar, // Import StatusBar
  Pressable, // For back button
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Using Ionicons for the back arrow

import ConnectedAppItem from '../components/ConnectedAppItem'; // Adjust path if needed

// Define your green color constant (can be shared)
const APP_GREEN_COLOR = '#31EE9A'; // Example green, adjust as needed
const BACKGROUND_COLOR = '#000000'; // Black background for the screen

// --- IMPORTANT: Replace these with your actual icon paths ---
const DUMMY_ICON_MSG = require('../../../../assets/images/messages_icon.png'); // Replace with actual path
const DUMMY_ICON_GMAIL = require('../../../../assets/images/gmail_icon.png'); // Replace with actual path
// ---

const ConnectedAppsScreen = ({ navigation }) => { // Assuming you use react-navigation
  const [apps, setApps] = useState([
    { id: 'msg', name: 'Messages', icon: DUMMY_ICON_MSG, enabled: true },
    { id: 'gmail', name: 'Gmail', icon: DUMMY_ICON_GMAIL, enabled: true },
    // Add more apps here if needed
  ]);

  const handleToggle = (appId) => {
    setApps(currentApps =>
      currentApps.map(app =>
        app.id === appId ? { ...app, enabled: !app.enabled } : app
      )
    );
    // Optional: Add API call or local storage logic here
    const toggledApp = apps.find(app => app.id === appId);
    if (toggledApp) {
        console.log(`Toggled ${toggledApp.name} to ${!toggledApp.enabled}`);
    }
  };

  // Function to handle back navigation
  const handleGoBack = () => {
    // Use navigation prop if available (from React Navigation)
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback or specific action if navigation is not available/cannot go back
      console.log("Cannot go back or navigation prop not provided.");
    }
  };


  return (
    <View style={styles.screenContainer}>

      <StatusBar barStyle="light-content" />

      <View style={styles.headerContainer}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={APP_GREEN_COLOR} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Connected Apps</Text>
        </View>

        <View style={styles.backButton} /> 
      </View>

      {/* List of Apps */}
      <FlatList
        data={apps}
        renderItem={({ item }) => (
          <ConnectedAppItem
            iconSource={item.icon}
            appName={item.name}
            isEnabled={item.enabled}
            onToggle={() => handleToggle(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        // Optional: Add space at the bottom
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
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
    justifyContent: 'space-between', // Distribute space
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1, // Optional separator line
    borderBottomColor: '#222', // Optional separator line color
  },
   backButton: {
    padding: 5, // Increase touch area for the back button
    minWidth: 40, // Ensure minimum width for balance/spacer
    alignItems: 'flex-start', // Align icon left for button, keep space for spacer
  },
  headerTitleContainer: {
      // flex: 1, // Allow title container to take up space if needed for centering text
      alignItems: 'center', // Center text within its container
  },
  headerTitle: {
    color: APP_GREEN_COLOR,
    fontSize: 18,
    fontWeight: '600',
  },
  // ConnectedAppItem styles are now in its own file
});

export default ConnectedAppsScreen;