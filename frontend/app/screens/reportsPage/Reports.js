import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import GradientScreen from "../components/GradientScreen";
import CarouselFilter from "../components/CarouselFilter";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import config from "../../config";


// Report Item Component
const ReportItem = ({ item, navigation, refreshReports, onSearch }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleDropdown = () => {
    setIsExpanded(!isExpanded);
  };

  const formattedDate = new Date(item.created_at).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const cardBackgroundColor =
    item.status?.toLowerCase() === "pending"
      ? "#FFFF00" // Yellow for Pending
      : item.status?.toLowerCase() === "in progress"
      ? "#FFA500" // Orange for In Progress
      : item.status?.toLowerCase() === "resolved"
      ? "#3AED97" // Orange for In Progress
      : "#D3D3D3"; // Green for other statuses

  const archiveReport = async (reportId) => {
    try {
      const response = await fetch(`${config.BASE_URL}/reports/${reportId}/archive`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ remarks: "Report archived" }),
      });

      const result = await response.json();
      if (response.ok) {
        alert("Report archived successfully!");
        refreshReports();
      } else {
        alert(result.message || "Failed to archive report.");
      }
    } catch (error) {
      console.error("Error archiving report:", error);
      alert("Error archiving report. Please try again.");
    }
};

  return (
    <View style={styles.itemContainer}>
      {/* Report Card */}
      <TouchableOpacity onPress={toggleDropdown}>
        <View style={[styles.reportCard, { backgroundColor: cardBackgroundColor }]}>
          <View>
            <Text style={styles.reportTitle}>{item.title}</Text>
            <Text style={styles.reportStatus}>{item.status}</Text>
          </View>
          <Text style={styles.reportDate}>{formattedDate}</Text>
        </View>
      </TouchableOpacity>

      {/* Dropdown - Only shown when isExpanded is true */}
      {isExpanded && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setIsExpanded(false);
              navigation.navigate("EditReport", { report: item, refreshReports });
            }}
          >
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownText}>Edit</Text>
            </View>
          </TouchableOpacity>
        
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setIsExpanded(false);
              archiveReport(item.id);
            }}
          >
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownText}>Archive</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Main Reports Component
export default function Reports({ navigation, route, onSearch }) {
  const { isDarkMode = false, onToggleDarkMode = () => {} } = route.params || {};
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("recent");
  const [searchText, setSearchText] = useState(""); // Define state correctly

  const handleScan = () => {
    console.log("Searching for:", searchText);
  
    if (typeof onSearch === "function") {
      onSearch(searchText); // Call the function to filter reports
    } else {
      console.warn("onSearch function is not provided.");
    }
  };

  const filters = [
    { id: "recent", label: "Recent" },
    { id: "pending", label: "Pending" },
    { id: "in progress", label: "In Progress" },
    { id: "resolved", label: "Resolved" },
    { id: "archived", label: "Archived" },
  ];

  const fetchReports = async () => {
    try {
      console.log("Fetching reports with filter:", activeFilter);
      setLoading(true);

      // Send filter parameter when fetching reports
      const response = await fetch(`${config.BASE_URL}/reports?filter=${activeFilter}`);

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      let data = await response.json();
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      Alert.alert("Error", `Failed to fetch reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
};

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [])
  );

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    console.log("Active Filter:", filter);
    fetchReports();  // Re-fetch reports whenever filter changes
};

  const filteredReports = reports.filter((report) => {
    if (activeFilter === "recent") return true; // Show all for "Recent"
    return report.status && report.status.toLowerCase() === activeFilter;
  });

  return (
    <View style={{ flex: 1 }}>
      <GradientScreen onToggleDarkMode={onToggleDarkMode} isDarkMode={isDarkMode}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialIcons name="keyboard-arrow-left" size={28} color="#3AED97" />
            </TouchableOpacity>
              <Text style={styles.headerTitle}>Reports</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateReport", {
                  isDarkMode,
                  onToggleDarkMode,
                  refreshReports: fetchReports,
                })
              }
            >
              <MaterialIcons name="add" size={28} color="#3AED97" />
            </TouchableOpacity>
          </View>

           {/* Search Section */}
           <View>
              <Text style={styles.label}>Search:</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Search report"
                  placeholderTextColor="#6c757d"
                  onChangeText={(text) => setSearchText(text)}
                  value={searchText}
                />
                <TouchableOpacity onPress={handleScan} style={styles.iconWrapper}>
                  <Icon name="search" size={24} color="#585757" />
                </TouchableOpacity>
              </View>
            </View>

          {/* Filter Section */}
          <CarouselFilter filters={filters} onFilterChange={handleFilterChange} />

          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <FlatList
              data={filteredReports}
              renderItem={({ item }) => (
                <ReportItem
                  item={item}
                  navigation={navigation}
                  refreshReports={fetchReports}
                />
              )}
              keyExtractor={(item, index) => (item._id ? item._id.toString() : `report-${index}`)}
              contentContainerStyle={styles.reportList}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No reports found</Text>
                </View>
              )}
            />
          )}
        </View>
      </GradientScreen>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16,
    paddingTop: 10, 
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 10

  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#3AED97", // Ensures it's visible
    paddingVertical: 5,
  },
  itemContainer: { 
    marginBottom: 10
  },
  reportCard: { 
    padding: 15, 
    borderRadius: 10, 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
  reportTitle: { 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  reportStatus: { 
    fontSize: 14, color: "gray" 
  },
  reportDate: { 
    fontSize: 14, 
    color: "gray" 
  },
  dropdown: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 15,
    marginBottom: 10,
    marginTop: 5,
  },
  dropdownItem: {
    paddingVertical: 2,
  },
  dropdownContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  dropdownText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "bold",
  },
  emptyText: { 
    fontSize: 16, 
    color: "gray" 
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  textInput: {
    fontSize: 14,
    height: 45,
    borderRadius: 12,
    color: "#000000",
    backgroundColor: "#3AED97",
    paddingRight: 45,
    paddingLeft: 15,
  },
  iconWrapper: {
    position: "absolute",
    right: 15,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  searchContainer: {
    marginBottom: 10, // Adjust spacing as needed
  },
  text: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 5,
  },
});
