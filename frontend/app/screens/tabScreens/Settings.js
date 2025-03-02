import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function Settings({ navigation, isDarkMode }) {
  const handleSignOut = () => {
    // Navigate to the Login screen when the user clicks "Sign-out"
    navigation.replace("Login"); // navigation will be passed correctly now
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}></View>
        <View>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>johndoe@email.com</Text>
        </View>
      </View>

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

       {/* Help & Support to Reports */} 
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() =>
            navigation.navigate("Reports", {
              isDarkMode: isDarkMode,
              onToggleDarkMode: handleSignOut, // Pass any function if needed
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

  profileSection: {
    backgroundColor: "#3AED97",
    width: "90%",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
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
    marginTop: 120,
    paddingVertical: 20,
    alignItems: "center",
    width: "100%",
  },

  signOutButton: {
    backgroundColor: "#FF0000",
    width: "90%",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
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
