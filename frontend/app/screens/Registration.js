import React, { useState } from "react";
import { useFonts } from "expo-font"; // Import the font hook
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import GradientScreen from "../screens/components/GradientScreen"; // Custom component for gradient background
import { LinearGradient } from "expo-linear-gradient";

export default function Registration({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  // Load the font
  const [fontsLoaded] = useFonts({
    Inter: require("../../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf"),
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return null; // Wait until the font is loaded
  }

  const handleRegister = () => {
    console.log(
      `First Name: ${firstName}, Last Name: ${lastName}, Email: ${email}, Contact: ${contactNumber}, Password: ${password}, Confirm Password: ${confirmPassword}`
    );
    navigation.replace("Tabs");
  };

  return (
    <GradientScreen>
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>SWIFTSHIELD</Text>

        <Text style={styles.textLabel}>First Name</Text>
        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <FontAwesome5
            name="user"
            size={20}
            color="#3AED97"
            style={styles.genIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Stephen Hans"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            value={firstName}
            onChangeText={(text) => setFirstName(text)}
          />
        </View>
        <Text style={styles.textLabel}>Last Name</Text>
        <View style={styles.inputContainer}>
          <FontAwesome5
            name="user"
            size={20}
            color="#3AED97"
            style={styles.genIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Amistoso"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            value={lastName}
            onChangeText={(text) => setLastName(text)}
          />
        </View>
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
        <Text style={styles.textLabel}>Phone Number</Text>
        <View style={styles.inputContainer}>
          <FontAwesome5
            name="phone-alt"
            size={20}
            color="#3AED97"
            style={styles.genIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="+63 900 0000 000"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            value={contactNumber}
            onChangeText={(text) => setContactNumber(text)}
            keyboardType="phone-pad"
          />
        </View>
        <Text style={styles.textLabel}>Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#3AED97"
            style={styles.genIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="*****"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            value={password}
            onChangeText={(text) => setPassword(text)}
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color="#3AED97"
              style={styles.genIcon}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.textLabel}>Confrim Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#3AED97"
            style={styles.genIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="*****"
            placeholderTextColor="rgba(49, 238, 154, 0.66)"
            value={confirmPassword}
            onChangeText={(text) => setConfirmPassword(text)}
            secureTextEntry={!isConfirmPasswordVisible}
          />
          <TouchableOpacity
            onPress={() =>
              setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
            }
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isConfirmPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color="#3AED97"
            />
          </TouchableOpacity>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
        >
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
    marginLeft: 75,
    alignItems: "top",
  },
  textLabel: {
    color: "#31EE9A",
    fontSize: 15,
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
  eyeIcon: {
    position: "absolute",
    right: 20,
    top: 12,
  },
  registerButton: {
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
  registerButtonText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "800",
    letterSpacing: 5,
    color: "#000", // Text color for the button
  },
  loginLink: {
    flexDirection: "row",
    marginTop: 20,
  },
  optionText: {
    color: "#000000",
    fontSize: 14,
    marginLeft: 75,
  },
  loginLinkText: {
    color: "#3AED97",
    fontSize: 14,
    fontWeight: "bold",
  },
});
