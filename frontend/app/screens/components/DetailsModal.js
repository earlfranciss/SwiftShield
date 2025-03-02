import React, { useEffect, useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image
} from 'react-native';

const iconMap = {
  "suspicious": require("../../../assets/images/suspicious-icon.png"),
  "safe": require("../../../assets/images/safe-icon.png"),
};

const severityColors = {
  "low": "#31EE9A", // Green
  "medium": "#FFC107", // Darker Yellow
  "high": "#FF8C00", // Darker Orange
  "critical": "#FF0000" // Red
};

const DetailsModal = ({ visible, onClose, logDetails, loading }) => {
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const updateDimensions = () => {
      setScreenDimensions(Dimensions.get('window'));
    };

    Dimensions.addEventListener('change', updateDimensions);
    
    return () => {
      if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener('change', updateDimensions);
      }
    };
  }, []);

  const modalWidth = Math.min(screenDimensions.width * 0.85, 350);
  const modalLeft = (screenDimensions.width - modalWidth) / 2;

  if (!visible) return null;

  const handleClosePress = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleBackdropPress = () => {
    if (onClose) {
      onClose();
    }
  };

  // Determine the icon based on verdict (Safe/Phishing)
  const isSafe = logDetails?.recommended_action === "Allow URL";
  const iconSource = isSafe ? iconMap.safe : iconMap.suspicious;

  // Ensure probability percentage is a whole number
  const probability = logDetails?.probability ? Math.round(logDetails.probability) : "N/A";

  // Get severity level and color
  const severity = logDetails?.severity ? logDetails.severity.toLowerCase() : "unknown";
  const severityColor = severityColors[severity] || "#FFFFFF"; // Default white if not recognized

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleBackdropPress}
      >
        <View 
          style={[
            styles.modalContainer, 
            { width: modalWidth, left: modalLeft, top: screenDimensions.height / 2 - 200 }
          ]}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#31EE9A" />
          ) : logDetails ? (
            <>
              {/* Dynamic Icon */}
              <View style={styles.iconContainer}>
                <Image source={iconSource} style={styles.icon} />
              </View>

              {/* URL Display */}
              <Text style={styles.urlText}>{logDetails.url || "Unknown URL"}</Text>
              <Text style={styles.urlLabel}>URL</Text>

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

              {/* Close Button */}
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleClosePress}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.errorText}>Error loading details.</Text>
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
  iconContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  icon: {
    width: 70,
    height: 70,
  },
  urlText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  urlLabel: {
    fontSize: 14,
    color: '#AAAAAA',
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
  actionButton: {
    backgroundColor: '#31EE9A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DetailsModal;
