// frontend/app/screens/components/WarningModal.js
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";

// --- IMPORTANT: Update these paths to your actual image assets ---
const headerPhishingIcon = require("../../../../frontend/assets/images/email-phishing-hook.png"); // Replace with your email/hook icon path
const warningTriangleIcon = require("../../../../frontend/assets/images/warning-triangle-icon.png"); // Replace with your warning triangle path
// --- End Asset Paths ---

const WarningModal = ({ visible, onClose, onProceed, url }) => {
  // Don't render anything if not visible
  if (!visible) return null;

  // Function to format the URL (just removes scheme for display)
  const formatUrlForDisplay = (urlToFormat) => {
    if (!urlToFormat) return "this site";
    // Remove http(s):// for cleaner display in the warning message
    return urlToFormat.replace(/^https?:\/\//, "");
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose} // Handle Android back button
    >
      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
        {/* Prevent touches inside the modal closing it via the overlay */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Main Modal Box */}
          <View style={styles.modalView}>
            {/* Red Header Section */}
            <View style={styles.header}>
              <Image
                source={headerPhishingIcon}
                style={styles.headerIcon}
                resizeMode="contain"
              />
            </View>

            {/* White Content Section */}
            <View style={styles.content}>
              {/* Warning Triangle Icon */}
              <Image
                source={warningTriangleIcon}
                style={styles.warningIcon}
                resizeMode="contain"
              />

              {/* Warning Title */}
              <Text style={styles.title}>Warning!</Text>

              {/* Subtitle */}
              <Text style={styles.subtitle}>
                SwiftShield has detected this URL as phishing!
              </Text>

              {/* Body Description */}
              <Text style={styles.bodyText}>
                Attackers on{" "}
                <Text style={styles.boldUrl}>{formatUrlForDisplay(url)}</Text>{" "}
                might try to trick you to steal your information (for example:
                passwords, emails, messages, and/or payment information)
              </Text>

              {/* --- Add Proceed Button --- */}
              <TouchableOpacity
                onPress={onProceed} // <-- Use onProceed prop
                style={styles.proceedButton}
                activeOpacity={0.7} // Add feedback on press
              >
                <Text style={styles.proceedText}>Proceed to site</Text>
              </TouchableOpacity>
              {/* --- End Proceed Button --- */}

              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            {/* End Content Section */}
          </View>
          {/* End Main Modal Box */}
        </TouchableOpacity>
        {/* End Content Wrapper */}
      </View>
      {/* End Overlay */}
    </Modal>
  );
};

// --- Styles matching the image ---
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Semi-transparent dark overlay
    justifyContent: "center",
    alignItems: "center",
    padding: 20, // Provides margin around the modal
  },
  modalView: {
    width: "100%",
    maxWidth: 360, // Max width for the modal box
    backgroundColor: "#FFFFFF", // White background
    borderRadius: 16, // Rounded corners for the whole box
    overflow: "hidden", // Important to clip the header corners
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    backgroundColor: "#D9534F", // Red header background (#d9534f is a common bootstrap danger red)
    paddingVertical: 5, // Vertical padding in the header
    alignItems: "center", // Center the icon horizontally
  },
  headerIcon: {
    width: 100, // Adjust size as needed
    height: 100,
    // Removed tintColor if your icon is already yellow/colored correctly
  },
  content: {
    paddingTop: 20, // Padding above the warning icon
    paddingBottom: 25, // Padding below the close button
    paddingHorizontal: 25, // Horizontal padding for text content
    alignItems: "center", // Center all content items horizontally
  },
  warningIcon: {
    width: 60, // Adjust size
    height: 60,
    marginBottom: 15, // Space below the icon
  },
  title: {
    fontSize: 26, // Larger title
    fontWeight: "bold",
    color: "#D9534F", // Red title text
    textAlign: "center", // Center align
    marginBottom: 8, // Space below title
  },
  subtitle: {
    fontSize: 15, // Slightly larger subtitle
    fontWeight: "600", // Bolder subtitle
    color: "#333333", // Dark text
    textAlign: "center",
    marginBottom: 15, // Space below subtitle
  },
  bodyText: {
    fontSize: 14,
    color: "#555555", // Medium grey text
    textAlign: "center",
    lineHeight: 21, // Improve readability
    marginBottom: 30, // More space below description
  },
  boldUrl: {
    fontWeight: "bold",
    color: "#D9534F", // Red, bold URL
  },
  proceedButton: {
    paddingVertical: 8, // Add some padding for easier tapping
    marginBottom: 15, // Space between proceed and close buttons
  },
  proceedText: {
    fontSize: 14,
    color: "#F17878", // <-- Specific color requested
  },
  // Removed proceedButton styles
  closeButton: {
    backgroundColor: "#D9534F", // Matching red button
    borderRadius: 8, // Slightly less rounded corners for button
    paddingVertical: 13, // Vertical padding inside button
    paddingHorizontal: 20, // Horizontal padding
    width: "90%", // Make button slightly less than full width
    alignItems: "center", // Center text inside button
    elevation: 2,
  },
  closeText: {
    color: "#FFFFFF", // White button text
    fontSize: 16,
    fontWeight: "bold", // Bold button text
  },
});

export default WarningModal;
