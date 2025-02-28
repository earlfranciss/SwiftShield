import React, { useState } from "react";
import { useFonts } from "expo-font"; 
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import config from "../../config";

export default function Home() {
  const [url, setUrl] = useState("");

  // Load the font
  const [fontsLoaded] = useFonts({
    Inter: require("../../../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf"),
    "Poppins-ExtraBold": require("../../../assets/fonts/Poppins-ExtraBold.ttf"),
  });


  if (!fontsLoaded) {
    return null; // Wait until the font is loaded
  }

  const handleScan = async () => {
    try {

      const response = await fetch(`${config.BASE_URL}`, {
        method: 'POST',

        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });


      if (!response.ok) {
        throw new Error(
          `Backend error: ${response.status} ${response.statusText}`
        );
      }

      // Check if the response is in JSON format before attempting to parse
      if (
        response.ok &&
        response.headers.get("Content-Type").includes("application/json")
      ) {
        const result = await response.json();
        console.log("Scan Result:", result);
        // Pass the result to Analytics and Logs as needed
      } else {
        // Handle  n-JSON responses (e.g., HTML error page)
        console.error("Expected JSON, but got a non-JSON response");
      }
    } catch (error) {
      console.error("Error scanning URL:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Power Icon and Protection Status */}
      <View style={styles.iconContainer}>
        <Image
          source={require("../../../assets/images/enableButton.png")} // Replace with actual icon image URL
          style={styles.powerIcon}
        />
        <Text style={styles.protectionText}>Web Protection</Text>
        <Text style={styles.statusText}>Enabled</Text>
      </View>

      {/* Input and Scan Button */}
      <View style={styles.inputContainer}>
        <Text style={styles.scanLabel}>Scan URL:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="www.malicious.link"
          placeholderTextColor="#6c757d"
          onChangeText={(text) => setUrl(text)}
          value={url}
        />
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
