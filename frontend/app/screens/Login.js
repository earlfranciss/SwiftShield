import React, { useState } from "react";
import { useFonts } from "expo-font"; // Import the font hook
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import GradientScreen from "./components/GradientScreen";
import { LinearGradient } from "expo-linear-gradient";
import config from "../config";

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Load the font
  const [fontsLoaded] = useFonts({
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });
   
  if (!fontsLoaded) {
    return null; // Wait until the font is loaded
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
  
      const data = JSON.parse(text); // Try parsing JSON
      if (response.ok) {
        console.log("Login successful:", data);
        navigation.replace("Tabs");
      } else {
        console.log("Login failed:", data.error);
        alert(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Error during login:", error);
      alert("Network error. Please try again.");
    }
  };
  
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <GradientScreen>
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>SWIFTSHIELD</Text>

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
  title: {
    fontSize: 40,
    fontFamily: "Poppins-ExtraBold", // Apply the Poppins ExtraBold font
    color: "#3AED97",
    marginBottom: 40, // Adjust spacing from top
    alignItems: "center",
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
    fontFamily: "Inter",
    fontWeight: "800",
    color: "#000", // Adjust this for the text color as per your preference
    textAlign: "center", // Ensures the text is centered inside the button
    letterSpacing: 5,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 150,
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