import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

const iconMap = {
  suspicious: require("../assets/images/suspicious-icon.png"),
  safe: require("../assets/images/safe-icon.png"),
  critical: "#FF0000", // Red
};

// --- Severity Colors (Text Color) ---
// Define colors based on your requirements
const severityTextColors = {
  safe: "#000000", // White for Safe text
  low: "#3AED97", // Your specified Low color
  medium: "#EED531", // Your specified Medium color
  high: "#EE8931", // Your specified High color
  critical: "#ED3A3A", // Your specified Critical color
  unknown: "#AAAAAA", // Fallback color
};

// --- Component Definition ---
// Changed prop name from logDetails to scanResult
// Added 'loading' prop in case parent wants to show loading state *within* the modal
const DetailsModal = ({
  visible,
  onClose,
  onDeletePress,
  scanResult,
  loading,
  navigation,
}) => {
  // --- Add Log to see received severity ---
  // --- ADD LOG HERE ---
  React.useEffect(() => {
    // Log only when visible and data is likely present
    if (visible && scanResult) {
      console.log(
        `>>> DetailsModal Color Check: Input Severity='${severityInput}', Lowercase Key='${severityKey}', Calculated Color='${severityColor}'`
      );
    }
  }, [visible, scanResult, severityInput, severityKey, severityColor]); // Dependencies for the effect

  // --- Data Derivation from Props ---
  // Use optional chaining (?.) for safety in case scanResult is null/undefined briefly
  const platform =
    typeof scanResult?.platform === "string" ? scanResult.platform : "Unknown";

  // Date Formatting (Month Day, Year)
  let dateScanned = "Unknown";
  if (scanResult?.date_scanned) {
    try {
      // Use toLocaleDateString with options for "Month Day, Year" format
      dateScanned = new Date(scanResult.date_scanned).toLocaleDateString(
        undefined,
        {
          // <-- Use toLocaleDateString
          year: "numeric", // e.g., 2025
          month: "long", // e.g., April
          day: "numeric", // e.g., 21
        }
      );
    } catch (e) {
      console.error("Error formatting date:", e);
      dateScanned = "Invalid Date"; // Keep error handling
    }
  }

  // Severity and Color
  console.log("Checking Severity: scanResult.severity =", scanResult?.severity);
  const severity = scanResult?.severity?.toLowerCase() || "unknown";
  // const severity = scanResult?.severity; // Ensure lowercase for matching keys
  const severityInput = scanResult?.severity; // Get the raw severity from prop
  const severityKey = String(severityInput || "unknown").toLowerCase(); // Get lowercase key, default to 'unknown'
  const severityDisplay = scanResult?.severity || "Unknown"; // Keep original case for display
  const severityColor =
    severityTextColors[severity] || severityTextColors.unknown;

  // Probability
  const probabilityPercentage =
    typeof scanResult?.phishing_percentage === "number"
      ? `${scanResult.phishing_percentage.toFixed(2)}%`
      : "N/A";

  // Recommended Action
  const recommendedAction = scanResult?.recommended_action || "N/A";

  // Determine Icon
  const isSuspicious = ["critical", "high", "medium"].includes(severity); // Adjust logic as needed
  const iconSource = isSuspicious ? iconMap.suspicious : iconMap.safe;

  // --- Handlers ---
  const handleClosePress = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleDeleteConfirmation = () => {
    if (!scanResult?.log_id || !onDeletePress) {
      console.warn("Cannot delete: Missing log_id or onDeletePress handler.");
      Alert.alert("Info", "Delete functionality requires log ID and handler.");
      return;
    }
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this scan log?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDeletePress(scanResult.log_id); // Use log_id from scanResult
            handleClosePress();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const formatUrlForDisplay = (urlToFormat) => {
    // --- STRONGER CHECK ---
    // Check if it's null, undefined, or not a string, or an empty string
    if (
      !urlToFormat ||
      typeof urlToFormat !== "string" ||
      urlToFormat.trim() === ""
    ) {
      console.log("formatUrlForDisplay: Invalid input, returning fallback."); // Optional log
      return loading ? "Loading..." : "N/A";
    }
    // --- END STRONGER CHECK ---

    // Only call replace if we have a valid string
    try {
      return urlToFormat.replace(/^https?:\/\//, "");
    } catch (e) {
      // Fallback in case replace fails for some unexpected reason
      console.error("Error in URL replace:", e, "Input was:", urlToFormat);
      return urlToFormat; // Return original string on error
    }
  };

  const normalizedUrl = scanResult?.url;
  const urlToDisplay = formatUrlForDisplay(normalizedUrl); // Call remains the same

  /// --- URL Press Handler (Navigates using the passed prop) ---
  const handleOpenUrl = () => {
    const urlForAction = normalizedUrl; // Use the URL with scheme for actions
    const displayVersion = urlToDisplay; // Use the scheme-less version for display in warning
    const severityToPass = scanResult?.severity;
    console.log(
      `>>> DetailsModal handleOpenUrl - Action URL: '${urlForAction}', Display URL: '${displayVersion}', Passing severity: '${severityToPass}'`
    );
    // --- End Log ---

    if (!urlForAction) {
      Alert.alert("No URL");
      return;
    }
    if (!navigation) {
      Alert.alert("Navigation Error");
      return;
    }

    try {
      navigation.navigate("WebViewScreen", {
        url: urlForAction, // Pass NORMALIZED URL for loading
        displayUrl: displayVersion, // Pass SCHEME-LESS URL for display in warning
        severity: String(severityToPass || "UNKNOWN"),
      });
      if (onClose) onClose();
    } catch (error) {
      /* ... error handling ... */
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClosePress}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClosePress}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalContainer}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color="#31EE9A"
                style={{ marginVertical: 50, marginHorizontal: 100 }}
              />
            ) : scanResult ? ( // Check if scanResult data is available
              <>
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <Image
                    source={iconSource}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                </View>

                {/* URL Display */}
                <TouchableOpacity onPress={handleOpenUrl}>
                  <Text style={[styles.urlText, styles.linkText]}>
                    {urlToDisplay}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.urlLabel}>Scan</Text>

                {/* Analysis Details Container */}
                <View style={styles.analysisContainer}>
                  {/* Platform Row */}
                  <View style={styles.analysisRow}>
                    <Text style={styles.labelText}>Platform:</Text>
                    <Text style={styles.valueText}>{platform}</Text>
                  </View>

                  {/* Date Scanned Row */}
                  <View style={styles.analysisRow}>
                    <Text style={styles.labelText}>Date Scanned:</Text>
                    <Text style={styles.valueText}>{dateScanned}</Text>
                  </View>

                  {/* Severity Level Row */}
                  <View style={styles.analysisRow}>
                    <Text style={styles.labelText}>Severity Level:</Text>
                    {/* Apply dynamic color based on severity */}
                    <Text
                      style={[
                        styles.valueText,
                        { color: severityColor, fontWeight: "bold" },
                      ]}
                    >
                      {severityDisplay}
                    </Text>
                  </View>

                  {/* Probability Percentage Row */}
                  <View style={styles.analysisRow}>
                    <Text style={styles.labelText}>
                      Probability Percentage:
                    </Text>
                    <Text style={styles.valueText}>
                      {probabilityPercentage}
                    </Text>
                  </View>

                  {/* Recommended Action Row */}
                  <View style={[styles.analysisRow, styles.lastRow]}>
                    <Text style={styles.labelText}>Recommended Action</Text>
                    <Text style={styles.valueText}>{recommendedAction}</Text>
                  </View>
                </View>

                {/* Buttons Row */}
                <View style={styles.buttonRow}>
                  {/* Delete Button - Conditionally render if handler exists */}
                  {onDeletePress && ( // <--- CONDITION IS HERE
                    <TouchableOpacity
                      style={[styles.buttonBase, styles.deleteButton]}
                      onPress={handleDeleteConfirmation}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.buttonText, styles.deleteButtonText]}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Close Button */}
                  <TouchableOpacity
                    style={[styles.buttonBase, styles.closeButton]}
                    onPress={handleClosePress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Fallback if not loading but scanResult is missing
              <Text style={styles.errorText}>Could not load scan details.</Text>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// --- Styles --- (Keep your existing styles, maybe add errorText style)
const styles = StyleSheet.create({
  // ... (Keep all your existing styles from the previous version) ...
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    maxWidth: 350,
  },
  iconContainer: {
    marginBottom: 10,
  },
  icon: {
    width: 70,
    height: 70,
  },
  urlText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginVertical: 10,
  },
  urlLabel: {
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
    marginBottom: 25,
  },
  analysisContainer: {
    width: "100%",
    backgroundColor: "#31EE9A",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  lastRow: {
    paddingBottom: 0,
  },
  labelText: {
    fontSize: 15,
    color: "#000000",
    fontWeight: "500",
  },
  valueText: {
    fontSize: 15,
    color: "#000000",
    fontWeight: "500",
    textAlign: "right",
    flexShrink: 1, // Allow text to wrap if needed
    paddingLeft: 5, // Add small gap
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  buttonBase: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  closeButton: {
    backgroundColor: "#31EE9A",
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#FFFFFF",
  },
  errorText: {
    // Style for error message display
    color: "#FF6B6B",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 40,
  },
});

export default DetailsModal;
