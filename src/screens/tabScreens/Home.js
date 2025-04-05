import React, { useState, useEffect } from "react";
// Import RNFS with safety check
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
// Replace expo-linear-gradient with react-native-linear-gradient
import LinearGradient from "react-native-linear-gradient";
import config from "../../config/config";
import DetailsModal from '../../components/DetailsModal';

// Instead of importing RNFS directly, create a wrapper with safety checks
const SafeRNFS = {
  isAvailable: false,
  fs: null,
  initialize: function() {
    try {
      // Dynamically import RNFS to prevent early initialization errors
      const RNFS = require('react-native-fs');
      if (RNFS && typeof RNFS.readFile === 'function') {
        this.fs = RNFS;
        this.isAvailable = true;
        console.log('RNFS initialized successfully');
      } else {
        console.warn('RNFS available but methods missing');
      }
    } catch (error) {
      console.warn('Failed to initialize RNFS:', error);
    }
  },
  readFile: async function(path, options) {
    if (!this.isAvailable) return null;
    try {
      return await this.fs.readFile(path, options);
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Initialize SafeRNFS when the component mounts
  useEffect(() => {
    SafeRNFS.initialize();
  }, []);
  
  // Load fonts using useEffect
  useEffect(() => {
    // In pure React Native, custom fonts are loaded at the native level
    // Just set fontsLoaded to true after a timeout to simulate font loading
    const loadFonts = async () => {
      setTimeout(() => {
        setFontsLoaded(true);
      }, 100);
    };
    
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>; // Show a loading indicator
  }

  
  const handleScan = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/predict/scan`, {
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
  
      const data = await response.json(); // Read JSON response ONCE
  
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }
  
      console.log("Scan Result:", data);
  
      // Show DetailsModal automatically for the new log
      showModal(data.log_details);
  
    } catch (error) {
      console.error("Error scanning URL:", error);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Power Icon and Protection Status */}
      <View style={styles.iconContainer}>
        <Image
          source={require("../../assets/images/enableButton.png")} // Replace with actual icon image URL
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