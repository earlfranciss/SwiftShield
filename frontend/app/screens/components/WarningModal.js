// frontend/app/screens/components/WarningModal.js
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
// Using Ionicons for the warning triangle. You can use MaterialIcons etc. if preferred
import { Ionicons } from '@expo/vector-icons';

// Placeholder require for the top fishing hook icon - replace with your actual asset path
const emailIcon = require('../../../assets/images/icon.png'); // CHANGE THIS PATH

const WarningModal = ({ visible, onClose, onProceed, url }) => {
  if (!visible) return null;

  // Function to safely shorten the URL for display if it's too long
  const formatUrl = (urlToFormat) => {
      if (!urlToFormat) return 'this site';
      const maxLength = 30; // Adjust max length as needed
      if (urlToFormat.length > maxLength) {
          // Remove http(s):// first for better shortening
          const noSchemeUrl = urlToFormat.replace(/^https?:\/\//, '');
          return noSchemeUrl.substring(0, maxLength - 3) + '...';
      }
      return urlToFormat.replace(/^https?:\/\//, ''); // Remove scheme for shorter display
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose} // Android back button
    >
      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
         {/* Prevent touches inside the modal closing it via the overlay */}
         <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            {/* White Content Box */}
            <View style={styles.modalView}>
                {/* Red Header */}
                <View style={styles.header}>
                    <Image source={emailIcon} style={styles.headerIcon} resizeMode="contain"/>
                </View>

                {/* Warning Content */}
                <View style={styles.content}>
                    <View style={styles.warningRow}>
                        <Ionicons name="warning" size={30} color="#FF0000" style={styles.warningIcon} />
                        <Text style={styles.title}>Warning!</Text>
                    </View>
                    <Text style={styles.subtitle}>
                        SwiftShield has detected this URL as phishing!
                    </Text>
                    <Text style={styles.bodyText}>
                        Attackers on <Text style={styles.boldUrl}>{formatUrl(url)}</Text> might try to trick you to steal your information (for example: passwords, emails, messages, and/or payment information)
                    </Text>

                    {/* Buttons */}
                    <TouchableOpacity onPress={onProceed} style={styles.proceedButton}>
                        <Text style={styles.proceedText}>Proceed to site</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
         </TouchableOpacity>
         {/* End Content Wrapper */}
      </View>
      {/* End Overlay */}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20, // Add padding to prevent modal touching edges
  },
  modalView: {
    width: '100%', // Use full width within padding
    maxWidth: 380, // Max width for larger screens
    backgroundColor: '#FFFFFF', // White background for the main box
    borderRadius: 15,
    overflow: 'hidden', // Clip the header's corners
    // Add shadows (optional)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    backgroundColor: '#FF4D4D', // Red header background
    paddingVertical: 15, // Adjust padding as needed
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 15, // Match container border radius
    borderTopRightRadius: 15,
  },
  headerIcon: {
    width: 45, // Adjust size
    height: 45,
    tintColor: '#FFFFFF', // Make the icon white
  },
  content: {
    padding: 25, // Padding for the white content area
    alignItems: 'center',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  warningIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 24, // Larger title
    fontWeight: 'bold',
    color: '#FF0000', // Red title text
  },
  subtitle: {
    fontSize: 14,
    color: '#333333', // Dark grey subtitle
    textAlign: 'center',
    marginBottom: 15,
  },
  bodyText: {
    fontSize: 14,
    color: '#444444', // Slightly lighter grey body text
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  boldUrl: {
    fontWeight: 'bold',
    color: '#FF0000', // Make URL red and bold
  },
  proceedButton: {
    paddingVertical: 10, // Just padding, no background
    marginBottom: 10, // Space between buttons
  },
  proceedText: {
    fontSize: 14,
    color: '#AAAAAA', // Faded grey color
    textDecorationLine: 'underline', // Underline
  },
  closeButton: {
    backgroundColor: '#FF0000', // Bright red background
    borderRadius: 10, // Rounded corners
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%', // Make button full width
    alignItems: 'center',
    elevation: 2, // Slight shadow effect
  },
  closeText: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WarningModal;