import React, { useState } from "react";
import { useFonts } from "expo-font"; // Import the font hook
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image, // <-- Import Image component
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import GradientScreen from "./components/GradientScreen";
import { LinearGradient } from "expo-linear-gradient";
import config from "../config";

// --- IMPORTANT ---
// Make sure you have saved the logo image in your project.
// Adjust the path in require() below if your image is located elsewhere.
// For example, if Login.js is in 'src/screens' and your image is in 'assets/images':
// const logoPath = require('../../assets/images/logo.png');
// If Login.js is at the root and image is in 'assets/images':
// const logoPath = require('./assets/images/logo.png');

const logoPath = require("../../assets/images/logo.png"); // <-- ADJUST THIS PATH

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Load the font (Keep this if other components use Poppins or if you might add it back)
  const [fontsLoaded] = useFonts({
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return null; // Wait until the font is loaded (or remove if no custom fonts are used)
  }

  const handleLogin = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/Login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text(); // Log raw response
      console.log("Raw response:", text);

      // Basic check if response looks like JSON before parsing
      let data;
      if (text && text.startsWith('{') && text.endsWith('}')) {
         data = JSON.parse(text); // Try parsing JSON
      } else {
        // Handle non-JSON response or log appropriately
        console.log("Login response is not valid JSON.");
        throw new Error("Server returned an invalid response.");
      }


      if (response.ok) {
        console.log("Login successful:", data);
        navigation.replace("Tabs");
      } else {
        console.log("Login failed:", data ? data.error : 'Unknown error'); // Use data if available
        alert(data?.error || "Login failed"); // Use optional chaining
      }
    } catch (error) {
      console.error("Error during login:", error);
      // Check if the error message is about JSON parsing specifically
      if (error instanceof SyntaxError) {
        alert("Received an unexpected response from the server. Please try again later.");
      } else {
        alert("Network error or server issue. Please try again.");
      }
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <GradientScreen>
      <View style={styles.container}>
        {/* Logo Image */}
        <Image
          source={logoPath} // <-- Use the required image path
          style={styles.logo} // <-- Apply the new logo style
          resizeMode="contain" // Ensures the logo scales nicely
        />

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#3AED97" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            value={email}
            onChangeText={(text) => setEmail(text)}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock-outline" size={20} color="#3AED97" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={(text) => setPassword(text)}
          />
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#3AED97"
            />
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <LinearGradient
            colors={["#3AED97", "#BCE26E", "#FCDE58"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Options Row */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberMe}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxSelected]}
            />
            <Text style={styles.optionText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={styles.optionText}>Forgot Password</Text>
          </TouchableOpacity>
        </View>

        {/* Register Row */}
        <View style={styles.registerRow}>
          <Text style={styles.optionText1}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.registerText}>Register</Text>
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
    alignItems: "center",
    paddingHorizontal: 30,
  },
  // New style for the logo
  logo: {
    width: 280, // Adjust width as needed
    height: 200, // Adjust height as needed
    marginBottom: 25, // Space below the logo (adjust as needed)
    // No need for alignItems: 'center' here as the container already does that
  },
  // title style is removed
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
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    width: "100%",
    height: 40,
    borderRadius: 8,
    overflow: "hidden", // Ensures gradient stays rounded
    marginTop: 10,
    marginBottom: 20,
  },
  gradientButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    fontSize: 16,
    // fontFamily: "Inter", // Make sure 'Inter' font is loaded if you use it, otherwise remove or use a default
    fontWeight: "800",
    color: "#000",
    textAlign: "center",
    letterSpacing: 5,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 150, // Adjust spacing as needed after adding logo
  },
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: "#3AED97",
    marginRight: 8,
    borderRadius: 5,
  },
  checkboxSelected: {
    backgroundColor: "#3AED97",
    borderColor: "#3AED97",
  },
  optionText: {
    color: "#3AED97",
    fontSize: 14,
    fontWeight: "500",
  },
  optionText1: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  registerText: {
    color: "#3AED97",
    fontSize: 14,
    fontWeight: "bold",
  },
});