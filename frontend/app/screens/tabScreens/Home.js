import React, { useState } from "react";
import { useFonts } from "expo-font"; 
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import config from "../../config";
import DetailsModal from '../components/DetailsModal';


export default function Home() {
  const [url, setUrl] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [inputError, setInputError] = useState(""); // <-- Add state for error messages

  const [isProtectionEnabled, setIsProtectionEnabled] = useState(true); // Assume starts enabled
  const [isTogglingProtection, setIsTogglingProtection] = useState(false);

  // Load the font
  const [fontsLoaded] = useFonts({
    Inter: require("../../../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf"),
    "Poppins-ExtraBold": require("../../../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return null; // Wait until the font is loaded
  }

  
  const handleScan = async () => {
    setInputError(""); // Clear previous errors
    const trimmedUrl = url.trim();

    // --- 1. Frontend Validation ---
    if (!trimmedUrl) {
      setInputError("Please enter a URL to scan.");
      return;
    }
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
    if (!urlPattern.test(trimmedUrl)) {
      setInputError("Please enter a valid URL format (e.g., example.com or https://example.com).");
      return;
    }
    // --- End Frontend Validation ---


    // --- 2. Proceed with Fetch ---
    try {
      const response = await fetch(`${config.BASE_URL}`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      // --- 3. Check Backend Response Status ---
      if (!response.ok) {
        let backendErrorMsg = `Backend error: ${response.status}`; // Simpler default
        try {
           const errorData = await response.json();
           if (errorData && errorData.error) {
               backendErrorMsg = errorData.error;
           }
        } catch (jsonError) {
           // JSON parsing failed, use the simpler default message
        }
        setInputError(backendErrorMsg);
        // console.error("Backend validation/request failed:", backendErrorMsg); // REMOVED CONSOLE LOG
        return;
      }
      // --- End Backend Status Check ---


      // --- 4. Process Successful Response ---
      const data = await response.json();

      // Check for error field even in success response (less likely now)
      if (data.error) {
        // console.error("Backend returned success status but contained an error:", data.error); // REMOVED CONSOLE LOG
        setInputError(`Scan failed: ${data.error}`);
        return;
      }

      // Success!
      console.log("Scan Result:", data); // Keep success log if desired
      // setUrl(""); // Optional: Clear input on success
      showModal(data.log_details);

    } catch (error) { // Catch network errors etc.
      // console.error("Error scanning URL (Network or other error):", error); // REMOVED CONSOLE LOG
      setInputError(error.message || "An error occurred. Check connection or URL.");
    }
  };
  


  const showModal = (log) => {
    setSelectedLog(log);
    setModalVisible(true);
  };
  
  const closeModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
  };

  const handleToggleProtection = async () => {
    if (isTogglingProtection) return; // Prevent multiple clicks while loading

    setIsTogglingProtection(true); // Start loading indicator

    // ** TODO: Replace this with your actual backend API call **
    // Simulate a delay (like a network request)
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate 1.5 seconds

    try {
      // In a real app, you'd do:
      // const response = await fetch(`${config.BASE_URL}/toggle-protection`, { method: 'POST' });
      // if (!response.ok) throw new Error('Failed to toggle protection');
      // const result = await response.json();
      // setIsProtectionEnabled(result.isEnabled); // Update based on backend response

      // For now, just toggle the state locally
      setIsProtectionEnabled(prevState => !prevState);

    } catch (error) {
      console.error("Error toggling protection:", error);
      // Optionally show an error message to the user
      // setInputError("Failed to toggle protection state."); // Example using existing error state
    } finally {
      setIsTogglingProtection(false); // Stop loading indicator regardless of success/error
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.iconContainer}>

      {isTogglingProtection ? (
        <View style={styles.imagePlaceholder}> 
          <ActivityIndicator
            size="large" // Use the largest standard size
            color="#3AED97"
            // --- Add transform style ---
            style={{ transform: [{ scale: 2.5 }] }} // Adjust scale factor (e.g., 3, 3.5, 4) as needed
            // --- End transform style ---
          />
        </View>
      ) : (
        // ... TouchableOpacity with Image remains the same ...
        <TouchableOpacity onPress={handleToggleProtection} disabled={isTogglingProtection}>
          <Image
            source={
              isProtectionEnabled
                ? require("../../../assets/images/enableButton.png")
                : require("../../../assets/images/disableButton.png")
            }
            style={styles.powerIcon}
          />
        </TouchableOpacity>
      )}


      {/* ... (Protection Text, Status Text, Input Container, Modal remain the same) ... */}
      <Text style={styles.protectionText}>Web Protection</Text>
      <Text style={styles.statusText}>
        {isProtectionEnabled ? "Enabled" : "Disabled"}
      </Text>
      </View>

      {/* Input and Scan Button */}
      <View style={styles.inputContainer}>
        <Text style={styles.scanLabel}>Scan URL:</Text>
        <TextInput
          style={[
              styles.textInput, // Base style (includes default text color)
              inputError ? styles.inputErrorBorder : null, // Conditional error border style
              inputError ? styles.inputTextError : null // <<< ADDED: Conditional error text color style
          ]}
          placeholder="www.malicious.link"
          placeholderTextColor="#6c757d" // Placeholder color remains grey
          onChangeText={(text) => {
              setUrl(text);
              if (inputError) { // Clear error when user types
                  setInputError("");
              }
          }}
          value={url}
          autoCapitalize="none"
          keyboardType="url"
        />
        {/* --- Display Error Message Below Input --- */}
        {inputError ? (
          <Text style={styles.errorText}>{inputError}</Text>
        ) : null}


        <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
          <LinearGradient
            colors={["#3AED97", "#BCE26E", "#FCDE58"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Text style={styles.scanButtonText}>SCAN</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <DetailsModal 
        visible={modalVisible}
        onClose={closeModal}
        logDetails={selectedLog} // Pass the selected log details to the modal
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",
  },

  iconContainer: {
    alignItems: "center",
    marginBottom: 50,
  },

  powerIcon: {
    width: 130, 
    height: 140,
    resizeMode: "contain",
  },

  imagePlaceholder: {
    width: 130, // Match image width
    height: 140, // Match image height
    justifyContent: 'center',
    alignItems: 'center',
  },

  protectionText: {
    color: "#31EE9A",
    fontFamily: "Poppins-ExtraBold",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 10,
  },

  statusText: {
    color: "#31EE9A",
    fontFamily: "Poppins-ExtraBold",
    fontSize: 16,
    fontWeight: "400",
    marginTop: 5,
  },

  inputContainer: {
    width: "80%",
    alignItems: "flex-start",
  },

  scanLabel: {
    color: "#31EE9A",
    fontSize: 16,
    marginBottom: 10,
    marginLeft: 5,
  },

  textInput: {
    width: "100%",
    height: 50,
    borderColor: "#BCE26E",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#ffffff",
    backgroundColor: "#002b36",
    marginBottom: 20,
  },

  inputErrorBorder: {
    borderColor: '#FF0000', // Red border
  },
  // Style for the RED TEXT COLOR INSIDE input on error
  inputTextError: {
    color: '#FF0000', // <<< Red text color
  },
  // Style for the RED TEXT BELOW input on error
  errorText: {
    color: '#FF0000', // Red color for message below
    fontSize: 12,
    marginBottom: 15,
    marginLeft: 5,
  },
  scanButton: {
    width: "100%",
    height: 40,
    borderRadius: 8,
    overflow: "hidden", 
    marginTop: 10,
    marginBottom: 20,
  },
  gradientButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scanButtonText: {
    color: "#000000",
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 5,
  },
});
