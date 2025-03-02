import React, { useEffect, useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image
} from 'react-native';

const DetailsModal = ({ visible, onClose, logDetails }) => {
  // State to store screen dimensions
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  
  // Update dimensions on screen rotation or size changes
  useEffect(() => {
    const updateDimensions = () => {
      setScreenDimensions(Dimensions.get('window'));
    };
    
    // Add event listener
    Dimensions.addEventListener('change', updateDimensions);
    
    // Clean up
    return () => {
      // For newer RN versions
      if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener('change', updateDimensions);
      }
    };
  }, []);
  
  // Calculate modal position
  const modalWidth = Math.min(screenDimensions.width * 0.85, 350);
  const modalLeft = (screenDimensions.width - modalWidth) / 2;

  if (!visible) return null;

  const handleClosePress = () => {
    console.log("Close button pressed!");
    if (onClose) {
      onClose();
    }
  };

  const handleBackdropPress = () => {
    console.log("Backdrop pressed!");
    if (onClose) {
      onClose();
    }
  };

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
          style={[styles.modalContainer, { 
            width: modalWidth,
            left: modalLeft,
            top: screenDimensions.height / 2 - 200,
          }]}
        >
          {/* Red Warning Icon */}
          <View style={styles.redCircleContainer}>
            <View style={styles.redCircle}>
              <Text style={styles.exclamationMark}>!</Text>
            </View>
          </View>
          
          {/* URL Display */}
          <Text style={styles.urlText}>www.malicious.link</Text>
          <Text style={styles.urlLabel}>URL</Text>
          
          {/* Analysis Details Container */}
          <View style={styles.analysisContainer}>
            {/* Analysis Row */}
            <View style={styles.analysisRow}>
              <Text style={styles.labelText}>Platform:</Text>
              <Text style={styles.valueText}>Text Message</Text>
            </View>
            
            {/* Analysis Row */}
            <View style={styles.analysisRow}>
              <Text style={styles.labelText}>Date Scanned:</Text>
              <Text style={styles.valueText}>November 15, 2024</Text>
            </View>
            
            {/* Analysis Row */}
            <View style={styles.analysisRow}>
              <Text style={styles.labelText}>Severity Level:</Text>
              <Text style={[styles.valueText, styles.highRiskText]}>High</Text>
            </View>
            
            {/* Analysis Row */}
            <View style={styles.analysisRow}>
              <Text style={styles.labelText}>Probability Percentage:</Text>
              <Text style={styles.valueText}>79%</Text>
            </View>
            
            {/* Analysis Row */}
            <View style={styles.analysisRow}>
              <Text style={styles.labelText}>Recommended Action:</Text>
              <Text style={styles.valueText}>Block URL</Text>
            </View>
          </View>
          
          {/* Close Button  */}
          {
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleClosePress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
          }
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
  redCircleContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  redCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  exclamationMark: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: 'bold',
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
  highRiskText: {
    color: '#FF0000',
    fontWeight: 'bold',
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
});

export default DetailsModal;