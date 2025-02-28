import React, { useState } from "react";
import { useFonts } from "expo-font";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GradientScreen from "../screens/components/GradientScreen";
import { LinearGradient } from "expo-linear-gradient";

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState("");

  // Load the font
  const [fontsLoaded] = useFonts({
    Inter: require("../../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf"),
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleResetLink = async () => {
    if (!email) {
      alert("Please enter your email address");
      return;
    }
    
    try {
      // Here you would add the API call to your backend
      // For now, we'll simulate it
      console.log(`Reset password email sent to: ${email}`);
      alert("Password reset link has been sent to your email");
      // Navigate back to login after successful submission
      navigation.navigate("Login");
    } catch (error) {
      console.error("Reset password error:", error);
      alert("Failed to send reset link. Please try again.");
    }
  };

  return (
    <GradientScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>SWIFTSHIELD</Text>

          {/* Instructional Text */}
          <Text style={styles.subtitle}>Send Reset Password Link</Text>
          <Text style={styles.instruction}>
            Enter your registered email below to receive password reset
            instructions.
          </Text>

          {/* Email Input */}
          <Text style={styles.textLabel}></Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#3AED97"
              style={styles.genIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(49, 238, 154, 0.66)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
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
          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginLinkText}>Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 40,
    fontFamily: "Poppins-ExtraBold",
    color: "#3AED97",
    marginBottom: 40,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#3AED97",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  instruction: {
    fontSize: 14,
    color: "#3AED97",
    marginBottom: 30,
    textAlign: "center",
  },
  textLabel: {
    color: "#3AED97",
    fontSize: 15,
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#3AED97",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    marginLeft: 5,
  },
  resetButton: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    marginTop: 15,
    marginBottom: 20,
  },
  gradientButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#000",
  },
  loginLink: {
    marginTop: 20,
  },
  loginLinkText: {
    color: "#3AED97",
    fontSize: 16,
    fontWeight: "bold",
  },
});