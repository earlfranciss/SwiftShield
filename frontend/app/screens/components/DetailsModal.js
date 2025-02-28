import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DetailsModal = ({ visible, onClose }) => {
  const [modalType, setModalType] = useState(null);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={40} color="#FF3B30" />
          </View>
          <Text style={styles.modalTitle}>Payment unsuccessful</Text>
          <Text style={styles.modalText}>
            We encountered a problem when processing the payment, please try again.
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onClose}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


export const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    color: '#000',
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    width: '80%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  subscriptionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  yesButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  yesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  laterButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DetailsModal;