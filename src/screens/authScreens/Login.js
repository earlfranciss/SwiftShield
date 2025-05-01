import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
// Replace Expo vector icons with React Native vector icons
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import GradientScreen from "../../components/GradientScreen";
// Replace expo-linear-gradient with react-native-linear-gradient
import LinearGradient from "react-native-linear-gradient";
import config from "../../config/config";
import AsyncStorage from '@react-native-async-storage/async-storage';
const logoPath = require("../../assets/images/logo.png");

export default function Login({ navigation }) {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // Default to true for persistence
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing login session when component mounts
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        
        if (userData) {
          // User data exists, auto login
          const parsedUserData = JSON.parse(userData);
          console.log('Existing session found, auto-login');
          navigation.replace('Tabs');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingSession();
  }, [navigation]);

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
   
  if (!fontsLoaded || isLoading) {
    return (
      <GradientScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3AED97" />
        </View>
      </GradientScreen>
    );
  }
  
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${config.BASE_URL}/Login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Login successful
        console.log('Login successful:', data);
        
        // Store user information for persistence if rememberMe is checked
        if (rememberMe) {
          const userDataToStore = {
            userId: data.userId,
            email: data.email,
            firstName: data.firstName,
            role: data.role,
            // Include a timestamp for token expiry if needed
            timestamp: new Date().getTime(),
          };
          
          await AsyncStorage.setItem('userData', JSON.stringify(userDataToStore));
        }
        
        navigation.replace('Tabs');
      } else {
        // Login failed
        console.log('Login failed:', data.error);
        // Show error message to user
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <GradientScreen>
      <View style={styles.container}>
        {/* Title */}
        <Image
          source={logoPath}
          style={styles.logo} 
          resizeMode="contain" 
        />

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#3AED97" />
          <TextInput
            ref={emailRef}
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
            ref={passwordRef}
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
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          <LinearGradient
            colors={["#3AED97", "#BCE26E", "#FCDE58"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.loginButtonText}>LOGIN</Text>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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