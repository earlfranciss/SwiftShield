import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import GradientScreen from "../components/GradientScreen";
import { RadioButton } from "react-native-paper";
import config from "../../config";

export default function EditReport({ navigation, route }) {
  const { report } = route.params;
  const { isDarkMode = false, onToggleDarkMode = () => {} } = route.params || {};

  // State for updating the status
  const [status, setStatus] = useState(report.status || "Pending");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to handle update
  const handleUpdate = async () => {
    if (!remarks.trim()) {
      Alert.alert("Error", "Please provide remarks before updating.");
      return;
    }

    // Show confirmation prompt before updating
    Alert.alert(
      "Confirm Update",
      "Are you sure you want to update this report?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Update",
          onPress: async () => {
            setIsSubmitting(true);
            
            // Determine which ID field to use (some APIs return _id, others return id)
            const reportId = report._id || report.id;
            
            if (!reportId) {
              Alert.alert("Error", "Report ID not found");
              setIsSubmitting(false);
              return;
            }
            
            console.log("Report object:", report);
            console.log("Updating report:", { reportId, status, remarks });

            try {
              const response = await fetch(`${config.BASE_URL}/reports/${reportId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status, remarks }),
              });

              const responseData = await response.json();
              
              if (response.ok) {
                Alert.alert("Success", "Report updated successfully", [
                  { 
                    text: "OK", 
                    onPress: () => {
                      // Call refreshReports() to update the Reports list if available
                      if (route.params?.refreshReports) {
                        route.params.refreshReports(); 
                      }
                      navigation.goBack();
                    }
                  },
                ]);
              } else {
                Alert.alert("Error", responseData.message || "Failed to update report");
              }
            } catch (error) {
              console.error("Error updating report:", error);
              Alert.alert("Error", `Failed to connect to server: ${error.message}`);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <GradientScreen
        onToggleDarkMode={onToggleDarkMode}
        isDarkMode={isDarkMode}
      >
        <View style={styles.container}>
          {/* Header with Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons
              name="keyboard-arrow-left"
              size={28}
              color="#3AED97"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Edit Report</Text>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Display Report Title */}
            <Text style={styles.label}>Report Title</Text>
            <TextInput
              style={styles.input}
              value={report.title}
              editable={false}
              placeholderTextColor="#218555"
            />

            {/* Display Report Description */}
            <Text style={styles.label}>Report Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={report.description}
              editable={false}
              placeholderTextColor="#218555"
              multiline
            />

            {/* Update Report Status */}
            <Text style={styles.label}>Update Status</Text>
            <View style={styles.radioWrapper}>
              <TouchableOpacity 
                style={styles.radioContainer}
                onPress={() => setStatus("Pending")}
              >
                <RadioButton.Android
                  value="Pending"
                  status={status === "Pending" ? "checked" : "unchecked"}
                  onPress={() => setStatus("Pending")}
                  color="#218555"
                />
                <Text style={styles.radioLabel}>Pending</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.radioContainer}
                onPress={() => setStatus("In Progress")}
              >
                <RadioButton.Android
                  value="In Progress"
                  status={status === "In Progress" ? "checked" : "unchecked"}
                  onPress={() => setStatus("In Progress")}
                  color="#218555"
                />
                <Text style={styles.radioLabel}>In Progress</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.radioContainer}
                onPress={() => setStatus("Resolved")}
              >
                <RadioButton.Android
                  value="Resolved"
                  status={status === "Resolved" ? "checked" : "unchecked"}
                  onPress={() => setStatus("Resolved")}
                  color="#218555"
                />
                <Text style={styles.radioLabel}>Resolved</Text>
              </TouchableOpacity>
            </View>

            {/* Remarks Textbox */}
            <Text style={styles.label}>Admin Remarks (Required)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Enter remarks here..."
              placeholderTextColor="#218555"
              multiline
            />

            {/* Update Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                isSubmitting && styles.disabledButton
              ]} 
              onPress={handleUpdate}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? "Updating..." : "Update"}
              </Text>
            </TouchableOpacity>
            
            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            {/* Add some padding at the bottom for scrolling */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </GradientScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  scrollContent: {
    paddingTop: 20,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    color: "#3AED97",
    fontWeight: "bold",
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  label: {
    color: "#3AED97",
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#3AED97",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    color: "#000000",
  },
  textArea: {
    height: 150,
    textAlignVertical: "top",
  },
  radioWrapper: {
    backgroundColor: "#3AED97",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
    color: "#000000",
  },
  submitButton: {
    backgroundColor: "#FF0000",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: "#999999",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#3AED97",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  cancelText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
});