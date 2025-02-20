import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import GradientScreen from "../components/GradientScreen";
import config from "../../config";

export default function Reports({ navigation, route }) {
  const { isDarkMode = false, onToggleDarkMode = () => {} } = route.params || {};
  const [reports, setReports] = useState([]);

  const fetchReports = async () => {
    try {
      console.log("Fetching reports from:", `${config.BASE_URL}/reports`);
      
      const response = await fetch(`${config.BASE_URL}/reports`);
      
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
  
      let data = await response.json();

        // Sort reports in descending order based on date
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      Alert.alert("Error", `Failed to fetch reports: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const renderReportCard = ({ item }) => {
    // Convert `created_at` to a readable format (Philippine Time)
  const formattedDate = new Date(item.created_at).toLocaleString("en-US", {
    timeZone: "Asia/Manila", // Ensure it displays in Philippine Time
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // 12-hour format with AM/PM
  });

  // Change background color based on status
  const cardBackgroundColor =
    item.status.toLowerCase() === "pending"
      ? "#FFFF00" // Yellow for pending reports
      : "#3AED97"; // Green for completed/safe reports

    return (
      <View style={[styles.reportCard, { backgroundColor: cardBackgroundColor }]}>
        <View>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <Text style={styles.reportStatus}>{item.status}</Text> 
        </View>
        <Text style={styles.reportDate}>{formattedDate}</Text>
      </View>
    );
  };;


  return (
    <View style={{ flex: 1 }}>
      <GradientScreen
        onToggleDarkMode={onToggleDarkMode}
        isDarkMode={isDarkMode}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialIcons
                name="keyboard-arrow-left"
                size={28}
                color="#3AED97"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reports</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateReport", {
                  isDarkMode: isDarkMode,
                  onToggleDarkMode: onToggleDarkMode,
                  refreshReports: fetchReports,
                })
              }
            >
              <MaterialIcons name="add" size={28} color="#3AED97" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Recent Reports</Text>

          <FlatList
            data={reports}
            renderItem={renderReportCard}
            keyExtractor={(item) => item.title}
            contentContainerStyle={styles.reportList}
          />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    color: "#3AED97",
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#3AED97",
    fontSize: 16,
    marginBottom: 10,
  },
  reportList: {
    paddingBottom: 20,
  },
  reportCard: {
    backgroundColor: "#3AED97",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  reportStatus: {
    fontSize: 14,
    color: "#000000",
    opacity: 0.8,
  },
  reportDate: {
    fontSize: 14,
    color: "#000000",
  },
});
