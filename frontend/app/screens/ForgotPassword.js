import React, { useState } from "react";
import { useFonts } from "expo-font";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GradientScreen from "../screens/components/GradientScreen"; // Custom component for gradient background
import { LinearGradient } from "expo-linear-gradient";

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState("");

  // Load the font
  const [fontsLoaded] = useFonts({
    Inter: require("../../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf"),
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return null; // Wait until the font is loaded
  }

  const handleResetLink = () => {
    console.log(`Reset password email sent to: ${email}`);
    // Add logic for handling the reset password link
  };

  return (
    <GradientScreen>
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>SWIFTSHIELD</Text>

        {/* Instructional Text */}
        <Text style={styles.subtitle}>Send Reset Password</Text>
        <Text style={styles.instruction}>
          Enter your registered email below to receive password reset
          instructions.
        </Text>

        {/* Email Input */}
        <Text style={styles.textLabel}>Email</Text>
        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#3AED97"
            style={styles.genIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="name@email.com"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            value={email}
            onChangeText={(text) => setEmail(text)}
            keyboardType="email-address"
          />
        </View>

        {/* Reset Link Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleResetLink}>
          <LinearGradient
            colors={["#3AED97", "#BCE26E", "#FCDE58"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Text style={styles.resetButtonText}>Send Reset Link</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginLink}>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLinkText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "left",
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: "Poppins-ExtraBold", // Apply the Poppins ExtraBold font
    color: "#3AED97",
    marginBottom: 50,
    marginLeft: 60,
    alignItems: "top",
  },
  subtitle: {
    fontSize: 18,
    color: "#31EE9A",
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 75,
  },
  instruction: {
    fontSize: 14,
    color: "#31EE9A",
    marginBottom: 30,
  },
  textLabel: {
    color: "#31EE9A",
    fontSize: 15,
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#3AED97",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    width: "100%",
    height: 50,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#fff",
    fontSize: 16,
  },
  genIcon: {
    marginLeft: 10,
  },
  resetButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    overflow: "hidden", // Ensures gradient stays rounded
    marginTop: 20,
    marginBottom: 20,
  },
  gradientButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "800",
    letterSpacing: 5,
    color: "#000", // Text color for the button
  },
  loginLink: {
    marginTop: 20,
    alignItems: "center",
  },
  loginLinkText: {
    color: "#3AED97",
    fontSize: 14,
    fontWeight: "bold",
  },
});
