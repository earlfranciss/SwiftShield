import React, { useCallback, useState } from "react"; // <-- Import useCallback
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"; // <-- Import Share, Alert
import { useRoute } from "@react-navigation/native"; // <-- Import useRoute
import Ionicons from "react-native-vector-icons/Ionicons";
import config from "../config/config"; // <-- Adjust path if needed
import RNFS from "react-native-fs"; // <--- Import react-native-fs
import Share from "react-native-share"; // Ensure it's exactly this

// Helper function to convert Blob to Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      // Result includes the data URL prefix (e.g., "data:mime/type;base64,"),
      // so we need to remove it to get only the base64 part.
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.readAsDataURL(blob);
  });
};

function TopBar({
  onToggleDarkMode,
  isDarkMode,
  navigation,
  hasUnreadNotifications,
  onNotificationRead,
}) {
  const route = useRoute();
  const [isExporting, setIsExporting] = useState(false); // <-- ADD THIS LINE

  const handleThemeTogglePress = () => {
    console.log("<<< TopBar.js: Theme toggle icon pressed!"); // <<< THE LOG
    if (onToggleDarkMode) {
      // Good practice to check if prop exists
      onToggleDarkMode(); // Call the function passed via props
    }
  };

  // --- MODIFIED: Report Handler using RNFS ---
  const handleGenerateReport = useCallback(async () => {
    setIsExporting(true);
    let tempFilePath = ""; // To store path for potential cleanup
    console.log("Starting XLSX report generation and export...");

    try {
      // 1. Fetch report data (URL is the same)
      console.log(
        "Fetching XLSX report from:",
        `${config.BASE_URL}/api/export/report`
      );
      const response = await fetch(`${config.BASE_URL}/api/export/report`);
      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        // ... (existing error handling for fetch) ...
        let errorMsg = `Server error: ${response.status}`;
        try {
          const errorText = await response.text();
          errorMsg += ` - ${errorText.substring(0, 100)}`;
        } catch (e) {
          errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      // --- Get response as Blob (for binary data like XLSX) ---
      const reportBlob = await response.blob();
      console.log(`DEBUG: Received report blob size: ${reportBlob.size}`);

      if (!reportBlob || reportBlob.size === 0) {
        Alert.alert("Report Empty", "The generated report contains no data.");
        setIsExporting(false);
        return;
      }

      // --- Convert Blob to Base64 string ---
      const base64Data = await blobToBase64(reportBlob);
      console.log(`DEBUG Frontend: Base64 data length: ${base64Data.length}`);
      console.log(`DEBUG: Base64 start: ${base64Data.substring(0, 100)}`); // <-- Add this log
      if (!base64Data) {
        throw new Error("Failed to convert report data to Base64");
      }
      console.log(
        "Converted blob to base64 (first 100 chars):",
        base64Data.substring(0, 100)
      );

      // 2. Define TEMPORARY File Path and Name
      const fileName = "SwiftShield_Analytics_Report.xlsx"; // <-- Changed extension
      tempFilePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      const mimeType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; // <-- XLSX MIME type

      console.log("Temporary file path:", tempFilePath);

      // 3. Write the Base64 data to the temporary location
      await RNFS.writeFile(tempFilePath, base64Data, "base64"); // <-- Use 'base64' encoding
      console.log("Report temporarily written to cache.");

      // *** ADD THIS CHECKING CODE ***
      try {
        const fileInfo = await RNFS.stat(tempFilePath);
        console.log(
          `------------------------------------------------------------`
        );
        console.log(
          `DEBUG Frontend: Original Blob Size   : ${reportBlob.size} bytes`
        );
        console.log(
          `DEBUG Frontend: Temporary File Size  : ${fileInfo.size} bytes`
        );
        console.log(
          `------------------------------------------------------------`
        );

        if (fileInfo.size !== reportBlob.size) {
          console.error(
            `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`
          );
          console.error(
            `ERROR: SIZE MISMATCH! Temp file (${fileInfo.size}) vs Blob (${reportBlob.size})`
          );
          console.error(
            `       This strongly suggests RNFS.writeFile corrupted the file.`
          );
          console.error(
            `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`
          );
          Alert.alert(
            "Debug Info",
            `Size mismatch detected! Blob: ${reportBlob.size}, Temp File: ${fileInfo.size}. RNFS write likely failed.`
          );
        } else {
          console.log(
            "DEBUG Frontend: Temporary file size matches original blob size. RNFS write seems OK."
          );
        }
      } catch (statError) {
        console.error("ERROR: Could not get temporary file stats:", statError);
        Alert.alert("Debug Info", "Could not check temporary file stats.");
      }
      // *** END CHECKING CODE ***

      // 4. Prepare Share options
      const options = {
        title: "Save Report",
        message: "Save SwiftShield Analytics Report As:",
        url: `file://${tempFilePath}`, // URI for the local file
        type: mimeType, // <-- Set correct XLSX MIME type
        failOnCancel: false,
        saveToFiles: true, // Important hint for saving
        filename: fileName, // You can try adding filename, might help some apps
      };

      // 5. Use react-native-share
      await Share.open(options);
      console.log("Sharing dialog prompted.");
    } catch (error) {
      if (error.message.includes("User did not share")) {
        console.log("User cancelled the share action.");
      } else {
        console.error("🔥 Error generating or sharing XLSX report:", error);
        Alert.alert(
          "Export Failed",
          `Could not generate or share the report: ${error.message}`
        );
      }
    } finally {
      setIsExporting(false);
      console.log("XLSX Report generation and export process finished.");
      // Optional: Clean up temp file if it was created
      if (tempFilePath) {
        RNFS.unlink(tempFilePath)
          .then(() => console.log("Temporary XLSX file deleted."))
          .catch((err) => console.log("Error deleting temp XLSX file:", err));
      }
    }
  }, [config.BASE_URL]); // Removed requestStoragePermission dependency

  const topBarElementColor = "#3AED97"; // Always use green

  // --- Rest of your TopBar component (JSX) remains the same ---
  return (
    <View style={styles.topBar}>
      {/* App Name */}
      <Text style={[styles.logoText, { color: topBarElementColor }]}>
        SwiftShield
      </Text>
      <View style={styles.topBarIcons}>
        {/* Toggle Dark Mode */}
        <TouchableOpacity onPress={handleThemeTogglePress}>
          <Ionicons
            name={isDarkMode ? "sunny-outline" : "moon-outline"}
            size={24}
            color={topBarElementColor}
          />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => {
            navigation.navigate("Notifications", {
              isDarkMode,
              onToggleDarkMode,
            });
            if (onNotificationRead) onNotificationRead();
          }}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={topBarElementColor}
          />
          {hasUnreadNotifications && (
            <View
              style={[
                styles.notificationDot,
                { borderColor: isDarkMode ? "black" : "#000" },
              ]}
            />
          )}
        </TouchableOpacity>

        {/* --- Generate Report Button (Conditionally Rendered) --- */}
        {route.name === "Analytics" && (
          <TouchableOpacity
            onPress={handleGenerateReport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator
                size="small"
                color={isDarkMode ? "black" : "#3AED97"}
              />
            ) : (
              <Ionicons
                name="download-outline"
                size={24}
                color={topBarElementColor}
              />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 60,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  logoText: {
    fontSize: 18, // Adjusted font size slightly
    fontWeight: "bold",
  },
  topBarIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15, // Adjusted gap for potentially more icons
  },
  notificationButton: {
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red",
    borderWidth: 1,
  },
});

export default TopBar;
