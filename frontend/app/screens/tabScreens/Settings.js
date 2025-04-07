import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from '@react-navigation/native'; // <-- 1. Import the hook

// Remove { navigation } from the props - it won't be passed directly anymore
export default function Settings() {
  const navigation = useNavigation(); // <-- 2. Get navigation using the hook

  // Handler for signing out
  const handleSignOut = () => {
    // Use the navigation object obtained from the hook
    navigation.replace("Login");
  };

  // Handler for navigating to the Edit Profile screen
  const goToEditProfile = () => {
    // Use the navigation object obtained from the hook
    navigation.navigate("EditProfile");
  };

  return (
    // The rest of your component code remains the same...
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Section */}
      <TouchableOpacity
        style={styles.profileSection}
        onPress={goToEditProfile} // This will now work
      >
        <View style={styles.avatar}></View>
        <View>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>johndoe@email.com</Text>
        </View>
      </TouchableOpacity>

      {/* Options Section */}
      <TouchableOpacity style={styles.optionButton}>
        <Text style={styles.optionText}>Push Notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.optionButton}>
        <Text style={styles.optionText}>Connected Apps</Text>
      </TouchableOpacity>

      {/* Options Footer Section */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.optionButton}>
          <Text style={styles.optionText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton}>
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

// --- Styles (Keep your existing styles) ---
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40, // Added padding bottom for scroll content visibility
  },
  profileSection: {
    backgroundColor: "#3AED97",
    width: "80%",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#000",
    marginRight: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: "#000",
  },
  optionButton: {
    backgroundColor: "#3AED97",
    width: "80%",
    borderRadius: 10,
    padding: 15,
    alignItems: "flex-start",
    marginVertical: 10,
    alignSelf: 'center',
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
    marginTop: 120,
    paddingVertical: 20,
    alignItems: "center",
    width: "100%",
  },
  signOutButton: {
    backgroundColor: "#FF0000",
    width: "80%",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
    alignSelf: 'center',
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