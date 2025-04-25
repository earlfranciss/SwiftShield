import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';

// Removed the external handleDelete and handleUpdate as we'll integrate the logic
// const handleUpdate = async (logDetails, onClose, config) => { ... };
// const handleDelete = async (logDetails, onClose, config, onDelete) => { ... };


const severityColors = {
  "low": "#31EE9A",
  "medium": "#FFC107",
  "high": "#FF8C00",
  "critical": "#FF0000"
};

// Renamed onDelete prop to onLogDeleted for clarity
const DetailsModal = ({ visible, onClose, logDetails, loading, config, onLogDeleted }) => {
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const [editedLog, setEditedLog] = useState({});
  const [isDeleting, setIsDeleting] = useState(false); // State to track deletion in progress
  const [deleteError, setDeleteError] = useState(null); // State for deletion error messages

  useEffect(() => {
    if (logDetails) {
      setEditedLog(logDetails);
      // Reset delete states when new log details are loaded
      setIsDeleting(false);
      setDeleteError(null);
    }
  }, [logDetails]);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenDimensions(Dimensions.get('window'));
    };
    const dimensionChangeSubscription = Dimensions.addEventListener('change', updateDimensions);

    return () => {
      // Clean up the event listener subscription
      dimensionChangeSubscription.remove();
    };
  }, []);

  const modalWidth = Math.min(screenDimensions.width * 0.85, 350);
  const modalLeft = (screenDimensions.width - modalWidth) / 2;

  if (!visible) return null;

  // Handle Close Press
  const handleClosePress = () => {
    if (onClose) {
      onClose();
    }
  };

  // Function to execute the actual delete API call
  const executeDelete = async () => {
    if (!logDetails?.log_id) {
      setDeleteError("Cannot delete: Log ID is missing.");
      Alert.alert("Deletion Failed", "Log ID is missing."); // Also show alert for critical error
      return;
    }

    setIsDeleting(true); // Start loading state
    setDeleteError(null); // Clear any previous error

    try {
      // Your backend delete endpoint structure
      const response = await fetch(`${config.BASE_URL}/logs/${logDetails.log_id}`, {
        method: "DELETE",
        // Add any necessary headers here (e.g., authorization)
      });

      if (!response.ok) {
        // Attempt to read error message from the response body
         let errorData = "Failed to delete log.";
         try {
             const jsonResponse = await response.json();
             errorData = jsonResponse.error || jsonResponse.message || errorData;
         } catch (e) {
             // If parsing fails, use a generic message
             console.warn("Could not parse error response body:", e);
         }
        throw new Error(errorData);
      }

      console.log("Log deleted successfully:", logDetails.log_id);

      // Notify the parent component that this log was deleted
      if (onLogDeleted) {
         // Pass the ID of the log that was deleted back to the parent
         onLogDeleted(logDetails.log_id);
      }

      // Close the modal ONLY after successful deletion
      onClose();

    } catch (error) {
      console.error("Error deleting log:", error);
      setDeleteError(error.message || "Failed to delete log."); // Set state for UI display
      Alert.alert("Deletion Failed", error.message || "Failed to delete log."); // Also show an alert for immediate user feedback
    } finally {
      setIsDeleting(false); // End loading state
    }
  };


  // Handle Delete Press with confirmation
  const handleDeletePress = () => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: executeDelete, // Call the function that performs the delete
      },
    ]);
  };

  const probability = editedLog?.probability ? Math.round(editedLog.probability) : "N/A";
  const severity = editedLog?.severity ? editedLog.severity.toLowerCase() : "unknown";
  const severityColor = severityColors[severity] || "#FFFFFF";


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={isDeleting ? null : handleClosePress} // Prevent closing overlay while deleting
      >
        <View
          style={[
            styles.modalContainer,
            { width: modalWidth, left: modalLeft, top: screenDimensions.height / 2 - 200 }
          ]}
          // Prevent closing modal when tapping inside
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => {}}
        >
          {/* Initial Loading state (e.g., fetching details) */}
          {loading && (
              <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#31EE9A" />
                  <Text style={styles.loadingText}>Loading Details...</Text>
              </View>
          )}

          {/* Deletion Loading state */}
          {isDeleting && (
               <View style={styles.deletingContainer}>
                   <ActivityIndicator size="small" color="#FFFFFF" />
                   <Text style={styles.deletingText}>Deleting...</Text>
               </View>
          )}

          {/* Error Display for initial load */}
          {!loading && !logDetails && (
              <Text style={styles.errorText}>Error loading details.</Text>
          )}

          {/* Main Content (show if not loading and logDetails exist) */}
          {!loading && logDetails && (
            <>
              {/* URL Display */}
              <TouchableOpacity
                onPress={() => {
                  if (logDetails.url) {
                    Linking.canOpenURL(logDetails.url).then((supported) => {
                      if (supported) {
                        Linking.openURL(logDetails.url);
                      } else {
                        Alert.alert("Invalid URL", "Cannot open the provided URL.");
                      }
                    });
                  }
                }}
                disabled={isDeleting} // Disable link while deleting
              >
                <Text style={[styles.urlText, { color: '#31EE9A', textDecorationLine: 'underline' }]}>
                  {logDetails.url || "Unknown URL"}
                </Text>
              </TouchableOpacity>

              {/* Analysis Details Container */}
              <View style={styles.analysisContainer}>
                <View style={styles.analysisRow}>
                  <Text style={styles.labelText}>Platform:</Text>
                  <Text style={styles.valueText}>{logDetails.platform || "Unknown"}</Text>
                </View>

                <View style={styles.analysisRow}>
                  <Text style={styles.labelText}>Date Scanned:</Text>
                  <Text style={styles.valueText}>
                    {logDetails.date_scanned ? new Date(logDetails.date_scanned).toDateString() : "Unknown"}
                  </Text>
                </View>

                <View style={styles.analysisRow}>
                  <Text style={styles.labelText}>Severity Level:</Text>
                  <Text style={[styles.valueText, { color: severityColor, fontWeight: "bold" }]}>
                    {logDetails.severity || "Unknown"}
                  </Text>
                </View>

                <View style={styles.analysisRow}>
                  <Text style={styles.labelText}>Probability Percentage:</Text>
                  <Text style={styles.valueText}>{probability}%</Text>
                </View>

                <View style={styles.analysisRow}>
                  <Text style={styles.labelText}>Recommended Action:</Text>
                  <Text style={styles.valueText}>{logDetails.recommended_action || "Unknown"}</Text>
                </View>
              </View>

               {/* Display Deletion Error Message */}
               {deleteError && (
                  <Text style={styles.deleteErrorText}>{deleteError}</Text>
               )}


              {/* Buttons Row (Delete before Close) */}
              <View style={styles.buttonRow}>
                {/* Delete Button */}
                <TouchableOpacity
                  style={[styles.sideButton, { backgroundColor: '#FF4C4C' }]}
                  onPress={handleDeletePress}  // Trigger the delete confirmation
                  disabled={isDeleting || loading} // Disable button while deleting or initial loading
                  activeOpacity={isDeleting || loading ? 1 : 0.7}
                >
                  <Text style={styles.actionButtonText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.sideButton}
                  onPress={handleClosePress}
                  disabled={isDeleting || loading} // Disable button while deleting or initial loading
                  activeOpacity={isDeleting || loading ? 1 : 0.7}
                >
                  <Text style={styles.actionButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    position: 'absolute',
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
   loadingText: {
      marginTop: 10,
      color: '#31EE9A',
      fontSize: 16,
   },
    deletingContainer: {
      position: 'absolute', // Position over content
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', // Semi-transparent overlay
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1, // Ensure it's on top
   },
   deletingText: {
      marginTop: 10,
      color: '#FFFFFF',
      fontSize: 16,
   },
  urlText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  analysisContainer: {
    width: '100%',
    backgroundColor: '#31EE9A',
    borderRadius: 15,
    padding: 15,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  labelText: {
    fontSize: 14,
    color: '#121212',
    fontWeight: '500',
  },
  valueText: {
    fontSize: 14,
    color: '#121212',
    fontWeight: '500',
    textAlign: 'right',
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: { // Style for initial loading error
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
   deleteErrorText: { // Style specifically for deletion error
      color: '#FF4C4C', // Use a red color
      fontSize: 14,
      marginTop: 10,
      textAlign: 'center',
      fontWeight: 'bold',
   },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  sideButton: {
    flex: 1,
    backgroundColor: '#31EE9A',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 15,
    alignItems: 'center',
  },
});

export default DetailsModal;