import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  // Consider adding Alert for placeholder action if ProfileDetails doesn't exist yet
  // Alert
} from "react-native";

export default function Settings({ navigation, isDarkMode }) {
  const handleSignOut = () => {
    // Navigate to the Login screen when the user clicks "Sign-out"
    navigation.replace("Login");
  };

  // --- Handler for Profile Section Press ---
  const handleProfilePress = () => {
    console.log("Profile section pressed!");
    // Navigate to a new screen, e.g., 'ProfileDetails'
    // Make sure you have a 'ProfileDetails' screen defined in your navigator
    navigation.navigate("EditProfile");

  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Section - NOW CLICKABLE */}
      <TouchableOpacity
        style={styles.profileSection} // Apply the style directly to TouchableOpacity
        onPress={handleProfilePress}   // Add the onPress handler
        activeOpacity={0.7} // Optional: control the feedback intensity
      >
        {/* Inner content remains the same */}
        <View style={styles.avatar}></View>
        <View>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>johndoe@email.com</Text>
        </View>
      </TouchableOpacity>

      {/* Options Section */}
      <TouchableOpacity
        style={styles.optionButton}
        // Add the onPress handler to navigate
        onPress={() => navigation.navigate('PushNotifications')} // Use the screen name from SettingsStackNav
      >
        <Text style={styles.optionText}>Push Notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.optionButton}
        // Add the onPress handler to navigate
        onPress={() => navigation.navigate('ConnectedApps')} // Use the screen name from your navigator
      >
        <Text style={styles.optionText}>Connected Apps</Text>
      </TouchableOpacity>

      {/* Options Footer Section */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.optionButton}>
          <Text style={styles.optionText}>Privacy Policy</Text>
        </TouchableOpacity>

       {/* Help & Support to Reports */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() =>
            navigation.navigate("Reports", {
              isDarkMode: isDarkMode,
              // onToggleDarkMode: handleSignOut, // Pass only if Reports screen needs this specific function
            })
          }
        >
          <Text style={styles.optionText}>Help and Support</Text>
        </TouchableOpacity>

        {/* Sign-out Section */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign-out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 20,
  },

  // Style applied to the TouchableOpacity now
  profileSection: {
    backgroundColor: "#3AED97",
    width: "90%",
    borderRadius: 10,
    flexDirection: "row", // Keep for layout
    alignItems: "center",  // Keep for layout
    padding: 20,
    marginBottom: 20,
    // Add shadow for consistency if desired (optional)
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
    alignItems: "flex-start", // Text aligned left
    marginVertical: 10,
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
    marginTop: 120, // Adjust spacing as needed
    paddingVertical: 20,
    alignItems: "center",
    width: "100%",
  },

  signOutButton: {
    backgroundColor: "#FF0000",
    width: "90%",
    borderRadius: 10,
    padding: 15,
    alignItems: "center", // Center text inside button
    marginTop: 10,
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