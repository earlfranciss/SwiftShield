import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import config from "../../config";

const ReportDetails = ({ visible, report, onClose, navigation, refreshReports }) => {
  if (!report) return null; // Prevent errors when report is null

  // Format created date
  const formattedDate = new Date(report.created_at).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{report.title}</Text>
          <Text style={styles.modalLabel}>Description:</Text>
          <Text style={styles.modalText}>{report.description}</Text>

          <Text style={styles.modalLabel}>Status:</Text>
          <Text style={styles.modalText}>{report.status}</Text>

          <Text style={styles.modalLabel}>Created At:</Text>
          <Text style={styles.modalText}>{formattedDate}</Text>

          {/* Buttons at the Bottom */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                onClose(); // Close modal before navigating
                navigation.navigate("EditReport", { report, refreshReports });
              }}
            >
              <Text style={styles.buttonText}>Edit Report</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#1E1E1E",
    borderWidth: 2, // Thickness of the border
    borderColor: "#29A86B",
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 10, color: "#FFFFFF", },
  modalLabel: { fontSize: 16, fontWeight: "bold", marginTop: 10, color: "#FFFFFF", },
  modalText: { fontSize: 16, marginBottom: 5, color: "#FFFFFF", },
  buttonContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  button: { backgroundColor: "#3AED97", padding: 10, borderRadius: 5, flex: 1, marginRight: 5 },
  buttonText: { color: "#fff", fontSize: 16, textAlign: "center", fontWeight: "bold" },
  closeButton: { marginTop: 20, alignItems: "center" },
  closeButtonText: { fontSize: 16, color: "#FF5733", fontWeight: "bold" },
});

export default ReportDetails;
