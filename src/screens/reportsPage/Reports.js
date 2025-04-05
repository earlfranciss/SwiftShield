import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import { MaterialIcons } from "react-native-vector-icons/MaterialIcons";
import GradientScreen from "../../components/GradientScreen";
import CarouselFilter from "../../components/CarouselFilter";
import ReportDetails from "./ReportDetails"; // Import modal component
import config from "../../config/config";

// Report Item Component
const ReportItem = ({ item, openReportModal }) => {
  const formattedDate = new Date(item.created_at).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const iconMap = {
    "pending": require("../../assets/images/pending.png"),
    "in progress": require("../../assets/images/in progress.png"),
    "resolved": require("../../assets/images/resolved.png"),
    "archived": require("../../assets/images/resolved.png"),
  };

  const cardBackgroundColor =
    item.status?.toLowerCase() === "pending"
      ? "#F2F5A1" // Yellow for Pending
      : item.status?.toLowerCase() === "in progress"
      ? "#FAB47E" // Orange for In Progress
      : item.status?.toLowerCase() === "resolved"
      ? "#3AED97" // Green for Resolved
      : "#D3D3D3"; // Gray for Other Statuses

  return (
    <TouchableOpacity onPress={() => openReportModal(item)}>
      <View style={[styles.reportCard, { backgroundColor: cardBackgroundColor }]}>
        <Image source={iconMap[item.status?.toLowerCase()]} style={styles.statusIcon} />
        <View>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <Text style={styles.reportStatus}>{item.status}</Text>
        </View>
        <Text style={styles.reportDate}>{formattedDate}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Main Reports Component
export default function Reports({ navigation, route }) {
  const { isDarkMode = false, onToggleDarkMode = () => {} } = route.params || {};
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("recent");
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("active"); // Default to active reports

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // filter 
  const filters = [
    { id: "recent", label: "Recent" },
    { id: "pending", label: "Pending" },
    { id: "in progress", label: "In Progress" },
    { id: "resolved", label: "Resolved" },
    { id: "archived", label: "Archived" },
  ];

  const handleFilterChange = (filter) => {
    if (activeFilter !== filter) {
      setActiveFilter(filter); // Update active filter
      fetchReports(filter); // Fetch reports immediately
    }
  };

  useEffect(() => {
    fetchReports(activeFilter);
  }, [activeFilter]);

  const fetchReports = async (filter, searchText = "") => {
    try {
        console.log("Fetching reports with filter:", filter, "and search:", searchText); // Debugging log
        setLoading(true);

        // Construct query parameters
        let queryParams = `filter=${encodeURIComponent(filter)}`;
        if (searchText.trim() !== "") {
            queryParams += `&search=${encodeURIComponent(searchText)}`;
        }

        const response = await fetch(`${config.BASE_URL}/reports/display-reports?${queryParams}`);

        if (!response.ok) {
            throw new Error(`HTTP status ${response.status}`);
        }

        let data = await response.json();
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setReports(data); // Update reports list based on filter and search
    } catch (error) {
        console.error("Error fetching reports:", error);
        Alert.alert("Error", `Failed to fetch reports: ${error.message}`);
    } finally {
        setLoading(false);
    }
};

  // Open modal with selected report
  const openReportModal = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
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
              <TouchableOpacity onPress={() => fetchReports(selectedFilter, searchText)} style={styles.iconWrapper}>
                  <MaterialIcons name="search" size={24} color="#585757" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Section */}
          <CarouselFilter filters={filters} onFilterChange={handleFilterChange} />

          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <FlatList
              data={filteredReports} // Use updated reports list
              renderItem={({ item }) => (
                <ReportItem item={item} openReportModal={() => openReportModal(item)} />
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

        {/* 🔹 Report Details Modal */}
        <ReportDetails
          visible={modalVisible}
          report={selectedReport}
          onClose={() => setModalVisible(false)}
          navigation={navigation}
          refreshReports={() => fetchReports(activeFilter)}
        />
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
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportTitle: { 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  reportStatus: { 
    fontSize: 14, 
    color: "gray" 
  },
  reportDate: { 
    fontSize: 12,
    color: "#444",
    marginLeft: "auto", 
  },
  statusIcon: {
    width: 40, // Updated width
    height: 40, // Updated height
    marginRight: 10,
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
