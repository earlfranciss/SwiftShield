import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import CarouselFilter from "../../components/CarouselFilter";
import { useFocusEffect } from "@react-navigation/native";
import ListItem from "../../components/ListItem";
import config from "../../config/config";
import DetailsModal from "../../components/DetailsModal";

const iconMap = {
  "suspicious-icon": require("../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../assets/images/safe-icon.png"),
};

export default function Logs({ route, navigation }) {
  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true); // For initial/filter fetch
  const [searching, setSearching] = useState(false); // For search input delay feedback
  const viewableItems = useSharedValue([]);
  const [activeFilter, setActiveFilter] = useState("recent");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logLoading, setLogLoading] = useState(false); // For modal details fetch

  const filterOptions = [
    { id: "recent", label: "Recent" },
    { id: "safe", label: "Safe" },
    { id: "phishing", label: "Phishing" },
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
    { id: "critical", label: "Critical" },
  ];

  // --- Modal Logic ---
  const showModal = async (logId) => {
    // logId here IS the detection_id
    console.log(`[Logs.js] showModal function started for ID: ${logId}`);
    if (!logId) {
      console.error("[Logs.js] showModal called with invalid logId:", logId);
      Alert.alert("Error", "Invalid log identifier."); // Added user alert
      return;
    }
    setLogLoading(true);
    try {
      const response = await fetch(`${config.BASE_URL}/logs/${logId}`); // Fetches using detection_id
      console.log("[Logs.js] Fetch response status:", response.status);
      const data = await response.json();
      // console.log("[Logs.js] Fetched raw data:", JSON.stringify(data, null, 2)); // Keep if needed

      if (data.error || !response.ok) {
        console.error(
          "[Logs.js] Error fetching log details from API:",
          data.error || `Status ${response.status}`
        );
        Alert.alert("Error", data.error || "Could not load log details.");
        setSelectedLog(null); // Clear selected log on error
        setModalVisible(false); // Ensure modal is hidden
      } else {
        console.log("[Logs.js] Fetch successful. Transforming data...");

        // --- START DATA TRANSFORMATION ---
        const transformedData = {
          ...data, // Copy all existing fields from the fetched data (like url, severity, platform, date_scanned, id)

          // 1. Calculate phishing_percentage (use 'probability' or 'ml_prob_phishing' from backend response)
          //    Choose the field that actually holds the 0-1 score from your backend detail endpoint
          phishing_percentage:
            typeof data.probability === "number" // ADJUST 'data.probability' if your backend uses 'data.ml_prob_phishing' here
              ? parseFloat(data.probability.toFixed(2)) // Use the backend probability directly (assuming it's 0-100)
              : 0, // Default to 0 if missing/invalid

          // 2. Ensure 'log_id' exists for the modal's delete handler, using the detection_id ('data.id')
          //    The modal internally uses scanResult.log_id to call onDeletePress
          log_id: data.id, // <-- Map the main ID ('detection_id') to 'log_id' for the modal

          // 3. Ensure other fields needed by modal exist, using defaults if necessary
          severity: data.severity || "Unknown",
          recommended_action: data.recommended_action || "Unknown",
          url: data.url || "Unknown URL",
          platform: data.platform || "Unknown",
          date_scanned: data.date_scanned, // Should be ISO string
          id: data.id, // Ensure the original detection_id is still present as 'id'
        };
        // --- END DATA TRANSFORMATION ---

        console.log(
          "[Logs.js] Transformed data for modal:",
          JSON.stringify(transformedData, null, 2)
        );
        setSelectedLog(transformedData); // <-- Set the TRANSFORMED data
        setModalVisible(true); // Make visible AFTER data is ready and transformed
      }
    } catch (error) {
      console.error("[Logs.js] Error DURING fetch/transform operation:", error);
      Alert.alert("Error", "An error occurred while fetching details.");
      setSelectedLog(null);
      setModalVisible(false);
    } finally {
      console.log("[Logs.js] Setting log loading to false.");
      setLogLoading(false);
    }
  };

  const closeModal = () => {
    // Modify the existing log to show current state BEFORE changing it
    console.log(
      `[Logs.js] closeModal function called. Current state before closing - modalVisible: ${modalVisible}, logLoading: ${logLoading}`
    ); // <-- MODIFY THIS LOG

    setModalVisible(false);
    setSelectedLog(null); // Set selected log to null too

    // Add a log IMMEDIATELY after setting state to confirm the call was made
    // Note: The state might not update *immediately* in the console here due to batching,
    // but seeing this log confirms setModalVisible(false) was executed.
    console.log(`[Logs.js] setModalVisible(false) EXECUTED.`); // <-- ADD THIS LOG
  };

  // --- Fetching and Filtering Logic --- (Keep as is)
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    console.log("Active Filter:", filter);
    fetchLogs(filter);
  };

  const fetchLogs = async (filterType = activeFilter) => {
    if (!searching) {
      setLoading(true);
    }
    try {
      const response = await fetch(
        `${config.BASE_URL}/logs?filter=${filterType}`
      );
      const data = await response.json();
      // ***** THIS IS THE CRITICAL LOG *****
      console.log(
        `\n\n--- RAW Data received from GET /logs?filter=${filterType} ---`
      );
      if (Array.isArray(data) && data.length > 0) {
        console.log(
          ">>> Structure of FIRST item in RAW data:",
          JSON.stringify(data[0], null, 2)
        );
      } else if (Array.isArray(data)) {
        console.log(">>> Received empty array from backend.");
      } else {
        console.log(">>> Received non-array data from backend:", data);
      }
      console.log("---\n\n");
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      Alert.alert("Error", "Could not fetch logs.");
    } finally {
      setLoading(false);
      // setSearching(false); // Optional reset
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs(activeFilter);
    }, [activeFilter])
  );

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.logId) {
        showModal(route.params.logId);
        // Optional: Clear the param after showing the modal to prevent re-showing on focus gain
        // navigation.setParams({ logId: undefined }); // Requires navigation prop
      }
    }, [route?.params?.logId])
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 100,
  };

  // --- Client-side filtering --- (Keep as is)
  const getFilteredLogs = () => {
    const categoryFilteredLogs = logs.filter((log) => {
      switch (activeFilter) {
        case "recent":
          return true;
        case "safe":
          return (
            log.status?.toLowerCase().includes("safe") ||
            log.status?.toLowerCase().includes("safe")
          );
        case "phishing":
          return (
            log.status?.toLowerCase().includes("phishing") ||
            log.status?.toLowerCase().includes("phishing")
          );
        case "low":
          return log.severity?.toLowerCase() === "low";
        case "medium":
          return log.severity?.toLowerCase() === "medium";
        case "high":
          return log.severity?.toLowerCase() === "high";
        case "critical":
          return log.severity?.toLowerCase() === "critical";
        default:
          return true;
      }
    });

    if (!url || url.trim() === "") {
      return categoryFilteredLogs;
    }
    const searchTerm = url.toLowerCase().trim();
    return categoryFilteredLogs.filter((log) =>
      Object.values(log).some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(searchTerm)
      )
    );
  };

  // --- Handle Search Input --- (Keep as is)
  const handleInputChange = (text) => {
    setUrl(text);
    if (text.trim() !== "") {
      setSearching(true);
      // Debounce might be better here, but basic timeout for example:
      const timer = setTimeout(() => {
        setSearching(false);
      }, 500); // Shorter delay for search feedback
      // Need useRef to clear timer properly if implementing debounce
    } else {
      setSearching(false);
    }
  };

  const displayedLogs = getFilteredLogs();

  // --- Delete Logic ---
  const handleDeleteLog = async (logId) => {
    // Make the function async
    if (!logId) {
      console.error("[Logs.js] handleDeleteLog called with invalid ID:", logId);
      Alert.alert("Error", "Cannot delete log: Invalid ID.");
      return;
    }

    console.log(`[Logs.js] Attempting to delete log with ID: ${logId}`);

    // Optional: Add a loading indicator state specifically for deletion if needed
    // setDeleting(true);

    try {
      const response = await fetch(`${config.BASE_URL}/logs/${logId}`, {
        method: "DELETE",
        headers: {
          // Add any necessary headers like Authorization if your API requires them
          "Content-Type": "application/json",
        },
      });

      console.log(
        `[Logs.js] DELETE response status for ID ${logId}:`,
        response.status
      );

      // Check if the deletion was successful (status code 200 OK)
      if (response.ok) {
        // If successful, THEN remove the log from the local state
        setLogs((prevLogs) => prevLogs.filter((log) => log.id !== logId));
        console.log(`[Logs.js] Log ${logId} successfully deleted from state.`);
        Alert.alert("Success", "Log deleted successfully."); // Optional success feedback
        // The modal closes itself via handleClosePress called in DetailsModal.js after onDelete
      } else {
        // Handle errors (e.g., log not found, server error)
        const errorData = await response.json().catch(() => ({})); // Try to parse JSON error, default to empty object
        console.error(
          `[Logs.js] Failed to delete log ${logId}. Status: ${response.status}`,
          errorData
        );
        Alert.alert(
          "Deletion Failed",
          errorData.error ||
            `Could not delete log (Status: ${response.status}). Please try again.`
        );
      }
    } catch (error) {
      // Handle network errors or other unexpected issues
      console.error(
        `[Logs.js] Error during fetch DELETE operation for ID ${logId}:`,
        error
      );
      Alert.alert(
        "Error",
        "An error occurred while trying to delete the log. Check your connection."
      );
    } finally {
      // Optional: Stop delete-specific loading indicator
      // setDeleting(false);
    }
  };

  // --- Render ---
  console.log(
    `[Logs.js] Rendering component. Current modalVisible state: ${modalVisible}, Current logLoading state: ${logLoading}`
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* --- Search Section --- */}
      <View style={styles.searchSection}>
        <Text style={styles.text}>Search:</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="www.malicious.link or keyword"
            placeholderTextColor="#6c757d"
            onChangeText={handleInputChange}
            value={url}
          />
          <TouchableOpacity style={styles.iconWrapper}>
            <Icon name="search" size={24} color="#585757" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Filter Section --- */}
      <View style={styles.filterSection}>
        <CarouselFilter
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </View>

      {/* --- Content Area (Spinner or List) --- */}
      <View style={styles.contentArea}>
        {loading ? (
          <View style={styles.centeredIndicator}>
            <ActivityIndicator size="large" color="#31EE9A" />
            <Text style={styles.loadingText}>Loading logs...</Text>
          </View>
        ) : searching ? (
          <View style={styles.centeredIndicator}>
            <ActivityIndicator size="large" color="#31EE9A" />
            {/* <Text style={styles.loadingText}>Searching...</Text> */}
          </View>
        ) : displayedLogs.length === 0 ? (
          <View style={styles.centeredIndicator}>
            <Text style={styles.noResultsText}>
              No logs found for "{activeFilter}" filter
              {url ? ` matching "${url}"` : ""}.
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedLogs}
            keyExtractor={(item) => item.detection_id?.toString()} // Use detection_id
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  console.log(
                    `[Logs.js] TouchableOpacity onPress - Calling showModal for ID: ${item.detection_id}`
                  ); // Use detection_id
                  showModal(item.detection_id); // Pass detection_id
                }}
              >
                <ListItem
                  item={{
                    ...item,
                    icon: iconMap[item.icon], // Make sure item.icon matches keys 'suspicious-icon' or 'safe-icon'
                  }}
                  viewableItems={viewableItems}
                />
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onViewableItemsChanged={({ viewableItems: vItems }) => {
              viewableItems.value = vItems.map((vItem) => vItem.item.id);
            }}
            viewabilityConfig={viewabilityConfig}
          />
        )}
      </View>

      {/* --- Modal --- */}
      {/* Add the debug log before rendering */}
      {console.log(
        `[Logs.js] Preparing to render DetailsModal. Props being passed - visible: ${
          modalVisible || logLoading
        }, logLoading: ${logLoading}`
      )}

      <DetailsModal
        navigation={navigation}
        visible={modalVisible || logLoading}
        onClose={closeModal}
        logDetails={selectedLog} // Pass transformed data
        scanResult={selectedLog} // Pass transformed data
        loading={logLoading}
        // CHANGE 'onDelete' TO 'onDeletePress'

        //onDeletePress={handleDeleteLog} // <-- CORRECT PROP NAME
      />
    </SafeAreaView>
  );
}

// --- Styles --- (Keep original Logs.js styles)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
  },
  searchSection: {
    marginBottom: 15,
  },
  filterSection: {
    marginBottom: 15,
  },
  contentArea: {
    flex: 1,
  },
  text: {
    color: "#31EE9A",
    fontSize: 12,
    marginBottom: 5,
  },
  inputWrapper: {
    position: "relative",
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
  centeredIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 10,
    color: "#31EE9A",
    fontSize: 16,
  },
  noResultsText: {
    color: "#AAAAAA", // Lighter grey
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20, // Add some padding if text is long
  },
  listContent: {
    paddingBottom: 20,
  },
});
