import React, { useState, useEffect } from "react";
import { useFonts } from "expo-font";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GradientScreen from "../screens/components/GradientScreen";
import { LinearGradient } from "expo-linear-gradient";
import config from "../config";

export default function ResetPassword({ navigation, route }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if token was passed through route params (from deep link)
  useEffect(() => {
    if (route.params?.token) {
      setToken(route.params.token);
    }
  }, [route.params]);

  // Load the font
  const [fontsLoaded] = useFonts({
    Inter: require("../../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf"),
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleResetPassword = async () => {
    // Validate inputs
    if (!token) {
      Alert.alert("Error", "Please enter the reset token from your email");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${config.BASE_URL}/ResetPassword`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const text = await response.text();
      console.log("Raw response:", text);

      try {
        const data = JSON.parse(text);
        if (response.ok) {
          Alert.alert(
            "Success",
            "Your password has been reset successfully!",
            [
              {
                text: "Go to Login",
                onPress: () => navigation.navigate("Login"),
              },
            ]
          );
        } else {
          Alert.alert("Error", data.error || "Failed to reset password");
        }
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        Alert.alert("Error", "Unexpected response from server. Please try again.");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", "Network error. Please try again.");
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
          <Text style={styles.subtitle}>Reset Your Password</Text>
          <Text style={styles.instruction}>
            Enter a new password.
          </Text>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#3AED97"
              style={styles.genIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="rgba(49, 238, 154, 0.66)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={toggleShowPassword}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#3AED97"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#3AED97"
              style={styles.genIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="rgba(49, 238, 154, 0.66)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={toggleShowConfirmPassword}>
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#3AED97"
              />
            </TouchableOpacity>
          </View>

          {/* Reset Password Button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetPassword}
          >
            <LinearGradient
              colors={["#3AED97", "#BCE26E", "#FCDE58"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <Text style={styles.resetButtonText}>Reset Password</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginLinkText}>Back to Login</Text>
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