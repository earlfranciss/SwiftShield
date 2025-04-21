import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialIcons } from "react-native-vector-icons/MaterialIcons";
import GradientScreen from "../../components/GradientScreen";
import config from "../../config/config";

export default function CreateReport({ navigation, route }) {
  const { isDarkMode = false, onToggleDarkMode = () => {} } = route.params || {};

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Show confirmation prompt before submission
    Alert.alert(
      "Confirm Submission",
      "This report will now be submitted.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Submit",
          onPress: async () => {
            try {
              console.log("Submitting report to:", `${config.BASE_URL}/reports`);
              console.log("Payload:", { title: trimmedTitle, description: trimmedDescription });

              const response = await fetch(`${config.BASE_URL}/reports`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: trimmedTitle, description: trimmedDescription }),
              });

              let responseData;
              try {
                responseData = await response.json();
              } catch (jsonError) {
                throw new Error("Invalid JSON response from server");
              }

              if (response.ok) {
                Alert.alert("Submitted", "Report created successfully");
                setTitle("");
                setDescription("");

                // Call refreshReports() to update the Reports list
                if (route.params?.refreshReports) {
                  route.params.refreshReports(); 
                }

                navigation.goBack();
              } else {
                Alert.alert("Error", responseData.message || "Failed to create report");
              }
            } catch (error) {
              console.error("Error creating report:", error);
              Alert.alert("Error", `Failed to connect to server: ${error.message}`);
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

          <Text style={styles.headerTitle}>Create Report</Text>

          {/* Title Input */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Issue"
            placeholderTextColor="#218555"
            value={title}
            onChangeText={setTitle}
          />

          {/* Description Input */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="I have problems with..."
            placeholderTextColor="#218555"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
          </TouchableOpacity>
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
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
  },
  headerTitle: {
    fontSize: 20,
    color: "#3AED97",
    fontWeight: "bold",
    alignSelf: "center",
    marginBottom: 20,
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
  submitButton: {
    backgroundColor: "#FF0000",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
