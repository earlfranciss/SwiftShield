import React, { useState } from "react";
import { useFonts } from "expo-font";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  // *** 1. Import Alert and ActivityIndicator ***
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import GradientScreen from "./components/GradientScreen";
import { LinearGradient } from "expo-linear-gradient";
import config from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const logoPath = require("../../assets/images/logo.png"); // Ensure path is correct

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // *** 2. Add isLoading state back ***
  const [isLoading, setIsLoading] = useState(false);

  // Load the font
  const [fontsLoaded] = useFonts({
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"), // Ensure path is correct
  });

  if (!fontsLoaded) {
    // Show basic loading while fonts load
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3AED97" />
      </View>
    );
  }

  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter both email and password."
      );
      return;
    }

    console.log(`LOGIN: Attempting login for email: ${email}`);
    setIsLoading(true); // Start loading indicator

    try {
      // *** 3. CRITICAL: Verify this URL path '/Login' matches your backend route EXACTLY ***
      const response = await fetch(`${config.BASE_URL}/Login`, {
        // Case-sensitive! Is it /login or /Login? Or /api/login?
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const responseBodyText = await response.text();
      console.log(
        `LOGIN API Response: Status=${response.status}, Body=${responseBodyText}`
      );

      let responseData;
      try {
        responseData = JSON.parse(responseBodyText);
      } catch (parseError) {
        console.error(
          "LOGIN PARSE ERROR: Failed to parse API response JSON.",
          parseError
        );
        console.error(
          "LOGIN PARSE ERROR: Raw response text was:",
          responseBodyText
        );
        if (response.ok) {
          Alert.alert(
            "API Error",
            "Received an unexpected response format from the server."
          );
        } else {
          Alert.alert(
            "Login Failed",
            `Server returned an error: ${
              responseBodyText || response.statusText
            }`
          );
        }
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        console.log(
          "LOGIN API SUCCESS: Parsed data:",
          JSON.stringify(responseData, null, 2)
        );

        // Use responseData directly, not responseData.user
        const userObject = responseData; // The response IS the user object data

        // Validation: Check if the main response object exists and has the role property
        if (!userObject || typeof userObject.role === "undefined") {
          console.error(
            "LOGIN ERROR: 'role' property not found directly in the successful API response.",
            responseData
          );
          Alert.alert(
            "Login Error",
            "User role information was not found in the server response."
          );
          setIsLoading(false);
          return; // Stop the process
        }

        // Store the validated user data in AsyncStorage
        try {
          // Make sure we're storing the role properly
          const userDataToStore = {
            _id: userObject.userId || userObject._id, // Use whatever ID field your backend provides
            email: userObject.email,
            firstName: userObject.firstName,
            lastName: userObject.lastName,
            role: userObject.role, // This is crucial - make sure it's stored
          };

          console.log(
            "LOGIN STORAGE: Attempting to store this in AsyncStorage:",
            JSON.stringify(userDataToStore, null, 2)
          );
          await AsyncStorage.setItem(
            "userData",
            JSON.stringify(userDataToStore)
          );
          console.log("LOGIN STORAGE: Successfully stored data.");

          const storedDataCheck = await AsyncStorage.getItem("userData");
          console.log(
            "LOGIN STORAGE CHECK: Read back immediately after storing:",
            storedDataCheck
          );

          setIsLoading(false); // Stop loading *before* navigating
          navigation.replace("Tabs"); // Go to the main app screen
        } catch (storageError) {
          console.error(
            "LOGIN ASYNC STORAGE ERROR: Failed during storage process:",
            storageError
          );
          Alert.alert(
            "Storage Error",
            "Failed to save login information. Please try again."
          );
          setIsLoading(false);
        }
      }
    } catch (networkError) {
      console.error("LOGIN FETCH ERROR:", networkError);
      Alert.alert(
        "Network Error",
        "Could not connect to the server. Please check your connection and try again."
      );
      setIsLoading(false);
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
          {/* Original person icon */}
          <Ionicons
            name="person-outline"
            size={20}
            color="#3AED97"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(58, 237, 151, 0.7)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading} // Disable while loading
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="lock-outline"
            size={20}
            color="#3AED97"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(58, 237, 151, 0.7)"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading} // Disable while loading
          />
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.eyeIcon}
            disabled={isLoading}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
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
            onPress={() => !isLoading && setRememberMe(!rememberMe)} // Disable interaction while loading
            disabled={isLoading}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxSelected]}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={12} color="#000" />
              )}
            </View>
            <Text style={styles.optionText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => !isLoading && navigation.navigate("ForgotPassword")} // Disable interaction while loading
            disabled={isLoading}
          >
            <Text style={[styles.optionText, isLoading && styles.disabledText]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register Row */}
        <View style={styles.registerRow}>
          <Text style={styles.optionText1}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => !isLoading && navigation.navigate("Register")} // Disable interaction while loading
            disabled={isLoading}
          >
            <Text
              style={[styles.registerText, isLoading && styles.disabledText]}
            >
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientScreen>
  );
}

// --- Styles (Combined and slightly refined) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logo: {
    width: 280, // Adjust width as needed
    height: 200, // Adjust height as needed
    marginBottom: 25, // Space below the logo (adjust as needed)
    // No need for alignItems: 'center' here as the container already does that
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#3AED97",
    borderWidth: 1,
    borderRadius: 12, // More rounded
    paddingHorizontal: 15, // More padding
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Slightly darker background
    width: "100%",
    height: 55, // Slightly taller
    marginBottom: 25, // Increased spacing
  },
  icon: {
    marginRight: 10, // Add space between icon and text input
  },
  input: {
    flex: 1,
    color: "#ffffff", // White text
    fontSize: 16,
    // fontFamily: 'Inter', // Use Inter font if loaded and desired
  },
  eyeIcon: {
    paddingLeft: 10, // Space before the eye icon
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
    borderRadius: 12, // Ensure gradient also has radius
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "800",
    color: "#000", // Adjust this for the text color as per your preference
    textAlign: "center", // Ensures the text is centered inside the button
    letterSpacing: 5,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 100, // Adjusted spacing, might need further tweaking
  },
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: "#3AED97",
    borderRadius: 5,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#3AED97",
    borderColor: "#3AED97",
  },
  optionText: {
    // Style for "Remember me" and "Forgot Password"
    color: "#3AED97",
    fontSize: 14,
    // fontFamily: 'Inter',
    fontWeight: "500",
  },
  optionText1: {
    // Style for "Don't have an account?"
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginRight: 5,
  },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  registerText: {
    // Style for "Register" link
    color: "#3AED97",
    fontSize: 14,
    fontWeight: "bold",
  },
  disabledText: {
    opacity: 0.5, // Style for disabled text links
  },
});
