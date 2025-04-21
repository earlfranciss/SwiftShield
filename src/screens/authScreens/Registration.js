import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Ionicons from "react-native-vector-icons/Ionicons";
import GradientScreen from "../../components/GradientScreen";
// Replace expo-linear-gradient with react-native-linear-gradient
import LinearGradient from "react-native-linear-gradient";
import config from "../../config/config";


export default function Registration({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load fonts using useEffect instead of expo-font
  useEffect(() => {
    // In a non-Expo app, custom fonts are loaded at the native level
    // We just simulate the loading with a short timeout
    const loadFonts = async () => {
      // Simulate font loading time
      setTimeout(() => {
        setFontsLoaded(true);
      }, 100);
    };
    
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !contactNumber || !password || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }
    
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
  
    console.log("API Base URL:", config.BASE_URL);
    console.log("Sending registration data:", { firstName, lastName, email, contactNumber, password });
  
    try {
      const response = await fetch(`${config.BASE_URL}/Registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          contactNumber,
          password,
        }),
      });
  
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error("Failed to parse response:", error);
        alert("Invalid server response.");
        return;
      }
  
      if (response.ok) {
        console.log("Registration successful:", data);
        alert("Registration successful! Please log in.");
        navigation.navigate("Login");
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Network error.Please try again. ");
    }
  };
  

  return (
    <GradientScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.container}>
            {/* Title */}
            <Text style={styles.title}>SWIFTSHIELD</Text>

            {/* Input Fields */}
            <View style={styles.inputContainer}>
              <FontAwesome5 name="user" size={20} color="#3AED97" />
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="#3AED97"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={styles.inputContainer}>
              <FontAwesome5 name="user" size={20} color="#3AED97" />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="#3AED97"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#3AED97" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#3AED97"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <FontAwesome5 name="phone-alt" size={20} color="#3AED97" />
              <TextInput
                style={styles.input}
                placeholder="Contact Number"
                placeholderTextColor="#3AED97"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#3AED97" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#3AED97"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#3AED97"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#3AED97" />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#3AED97"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!isConfirmPasswordVisible}
              />
              <TouchableOpacity
                onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#3AED97"
                />
              </TouchableOpacity>
            </View>

            {/* Register Button */}
            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <LinearGradient
                colors={["#3AED97", "#BCE26E", "#FCDE58"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.registerButtonText}>REGISTER</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginLink}>
              <Text style={styles.optionText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLinkText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
    paddingVertical: 50,
  },
  title: {
    fontSize: 32,
    fontFamily: "Poppins-ExtraBold",
    color: "#3AED97",
    marginBottom: 30,
    textAlign: "center",
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
    marginBottom: 15,
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
  registerButton: {
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
  registerButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 3,
    color: "#000",
  },
  loginLink: {
    flexDirection: "row",
    marginTop: 15,
    justifyContent: "center",
  },
  optionText: {
    color: "#fff",
    fontSize: 14,
  },
  loginLinkText: {
    color: "#3AED97",
    fontSize: 14,
    fontWeight: "bold",
  },
});