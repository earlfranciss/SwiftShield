import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert // Import Alert if you use it in handleSignOut
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Settings({ navigation, isDarkMode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkIfUserIsAdmin();
  }, []);

  const checkIfUserIsAdmin = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const userObj = JSON.parse(userData);
        setIsAdmin(userObj.role === 'admin');
        console.log(`User role: ${userObj.role}, isAdmin: ${userObj.role === 'admin'}`);
      } else {
        setIsAdmin(false);
        console.log('No user data found, setting isAdmin to false');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const handleSignOut = async () => {
    console.log("LOGOUT: handleSignOut function initiated.");
    try {
        console.log("LOGOUT: Attempting to remove 'userData' from AsyncStorage...");
        await AsyncStorage.removeItem('userData');
        console.log("LOGOUT: Successfully removed 'userData'. Navigating to Login.");
        navigation.replace("Login");
    } catch (error) {
        console.error("LOGOUT ERROR: Failed to remove 'userData' from AsyncStorage:", error);
        Alert.alert("Logout Error", "Could not clear session data. Please try again.");
        navigation.replace("Login");
    }
  };

  const handleProfilePress = () => {
    console.log("Profile section pressed!");
    navigation.navigate("EditProfile");
  };

  const handleManageUsersPress = () => {
    console.log("Manage Users section pressed!");
    navigation.navigate("ManageUsers");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Section - NOW CLICKABLE */}
      <TouchableOpacity
        style={styles.profileSection}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}></View>
        <View>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>johndoe@email.com</Text>
        </View>
      </TouchableOpacity>

      {/* Options Section */}
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate('PushNotifications')}
      >
        <Text style={styles.optionText}>Push Notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate('ConnectedApps')}
      >
        <Text style={styles.optionText}>Connected Apps</Text>
      </TouchableOpacity>

      {/* Manage Users Button - ONLY VISIBLE TO ADMINS */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleManageUsersPress}
        >
          <Text style={styles.optionText}>Manage Users</Text>
        </TouchableOpacity>
      )}

      {/* Options Footer Section */}
      <View style={styles.footer}>
        {/* *** ADDED: How to use the app Button *** */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            console.log("How to use the app pressed!");
            // Replace with navigation when ready, e.g.:
            navigation.navigate('OnboardingScreen');
          }}
        >
          <Text style={styles.optionText}>How to use the app</Text>
        </TouchableOpacity>

        {/* Help & Support */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() =>
            navigation.navigate("Reports", {
              isDarkMode: isDarkMode,
            })
          }
        >
          <Text style={styles.optionText}>Help and Support</Text>
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity
           style={styles.optionButton}
           onPress={() => {
             console.log("Privacy Policy pressed!");
             // Replace with navigation when ready, e.g.:
             // navigation.navigate('PrivacyPolicyScreen');
           }}
        >
          <Text style={styles.optionText}>Privacy Policy</Text>
        </TouchableOpacity>


        {/* Sign-out Section */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
           {/* Corrected text to match image */}
          <Text style={styles.signOutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// --- Styles (Keep your existing styles as they are) ---
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  profileSection: {
    backgroundColor: "#3AED97",
    width: "90%",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#000", // Placeholder color
    marginRight: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  email: {
    fontSize: 14,
    color: "#000",
  },
  optionButton: {
    backgroundColor: "#3AED97",
    width: "90%",
    borderRadius: 10,
    padding: 15,
    alignItems: "flex-start",
    marginVertical: 10, // Make sure vertical margin is consistent
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  optionText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 'auto', // Pushes the footer towards the bottom if space allows
    paddingTop: 15, // Add some space above the first footer item
    paddingBottom: 15, // Add space below the last footer item
    alignItems: "center",
    width: "100%",
  },
  signOutButton: {
    backgroundColor: "#FF0000",
    width: "90%",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10, // Keep margin consistent or adjust as needed
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});