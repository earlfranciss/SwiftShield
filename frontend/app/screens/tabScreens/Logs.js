import React, { useState, useCallback } from "react";
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
import CarouselFilter from "../components/CarouselFilter";
import { useFocusEffect } from "@react-navigation/native";
import ListItem from "../components/ListItem";
import config from "../../config";
// Import the SIMPLIFIED DetailsModal for testing
import DetailsModal from '../components/DetailsModal';

const iconMap = {
"suspicious-icon": require("../../../assets/images/suspicious-icon.png"),
"safe-icon": require("../../../assets/images/safe-icon.png"),
};

export default function Logs({ route }) {
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
{ id: 'recent', label: 'Recent' },
{ id: 'safe', label: 'Safe' },
{ id: 'phishing', label: 'Phishing' },
{ id: 'low', label: 'Low' },
{ id: 'medium', label: 'Medium' },
{ id: 'high', label: 'High' },
{ id: 'critical', label: 'Critical' }
];

// --- Modal Logic ---
const showModal = async (logId) => {
console.log(`[Logs.js] showModal function started for ID: ${logId}`);
if (!logId) {
  console.error("[Logs.js] showModal called with invalid logId:", logId);
  return;
}
setLogLoading(true);

try {
  const response = await fetch(`${config.BASE_URL}/logs/${logId}`);
  console.log('[Logs.js] Fetch response status:', response.status);
  const data = await response.json();
  console.log('[Logs.js] Fetched data:', JSON.stringify(data, null, 2));
  
  if (data.error || !response.ok) {
    console.error("[Logs.js] Error fetching log details from API:", data.error || `Status ${response.status}`);
    Alert.alert("Error", "Could not load log details."); // Show error to user
    setModalVisible(false); // Hide modal on error
    setSelectedLog(null);
  } else {
    console.log("[Logs.js] Fetch successful. Setting selected log and making modal visible.");
    setSelectedLog(data);
    console.log("[Logs.js] Calling setModalVisible(true)");
    setModalVisible(true); // Make visible *after* data is ready
  }
} catch (error) {
  console.error("[Logs.js] Error DURING fetch operation:", error);
  Alert.alert("Error", "An error occurred while fetching details."); // Show error to user
  setModalVisible(false); // Hide modal on error
  setSelectedLog(null);
} finally {
  console.log("[Logs.js] Setting log loading to false.");
  setLogLoading(false);
}
};

const closeModal = () => {
// Modify the existing log to show current state BEFORE changing it
console.log(`[Logs.js] closeModal function called. Current state before closing - modalVisible: ${modalVisible}, logLoading: ${logLoading}`); 
setModalVisible(false);
setSelectedLog(null); // Set selected log to null too

// Add a log IMMEDIATELY after setting state to confirm the call was made
console.log(`[Logs.js] setModalVisible(false) EXECUTED.`); 
};

// --- Updated Fetching and Filtering Logic --- 
const handleFilterChange = (filter) => {
  if (activeFilter !== filter) {
    console.log("Active Filter changing to:", filter);
    setActiveFilter(filter); // Update active filter
    fetchLogs(filter, url); // Fetch logs immediately with the new filter
  }
};

const fetchLogs = async (filterType = activeFilter, searchQuery = "") => {
  console.log(`[Logs.js] Fetching logs with filter: ${filterType}, search: "${searchQuery}"`);
  
  if (!searching) {
    setLoading(true);
  }
  
  try {
    // Construct query parameters
    let queryParams = `filter=${encodeURIComponent(filterType)}`;
    if (searchQuery && searchQuery.trim() !== "") {
      queryParams += `&search=${encodeURIComponent(searchQuery)}`;
    }
    
    const response = await fetch(`${config.BASE_URL}/logs?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[Logs.js] Fetched ${data.length} logs for filter "${filterType}"`);
    setLogs(data);
  } catch (error) {
    console.error("[Logs.js] Error fetching logs:", error);
    Alert.alert("Error", `Could not fetch logs: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

useFocusEffect(
  useCallback(() => {
    fetchLogs(activeFilter, url);
  }, [activeFilter])
);

useFocusEffect(
  useCallback(() => {
    if (route?.params?.logId) {
      showModal(route.params.logId);
    }
  }, [route?.params?.logId])
);

const viewabilityConfig = {
  itemVisiblePercentThreshold: 100,
};

// --- Handle Search Input ---
const handleInputChange = (text) => {
  setUrl(text);
  if (text.trim() !== "") {
    setSearching(true);
    // Debounce for search feedback
    const timer = setTimeout(() => {
      fetchLogs(activeFilter, text); // Search using API with current filter and search text
      setSearching(false);
    }, 500);
    
    // Need useRef to clear timer properly in a complete implementation
    return () => clearTimeout(timer);
  } else {
    setSearching(false);
    fetchLogs(activeFilter, ""); // Clear search, fetch with current filter only
  }
};

// Handle search button press
const handleSearch = () => {
  fetchLogs(activeFilter, url);
};

// --- Delete Logic ---
const handleDeleteLog = async (logId) => {
if (!logId) {
  console.error("[Logs.js] handleDeleteLog called with invalid ID:", logId);
  Alert.alert("Error", "Cannot delete log: Invalid ID.");
  return;
}
console.log(`[Logs.js] Attempting to delete log with ID: ${logId}`);

try {
  const response = await fetch(`${config.BASE_URL}/logs/${logId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log(`[Logs.js] DELETE response status for ID ${logId}:`, response.status);

  if (response.ok) {
    setLogs((prevLogs) => prevLogs.filter(log => log.id !== logId));
    console.log(`[Logs.js] Log ${logId} successfully deleted from state.`);
    Alert.alert("Success", "Log deleted successfully.");
  } else {
    const errorData = await response.json().catch(() => ({}));
    console.error(`[Logs.js] Failed to delete log ${logId}. Status: ${response.status}`, errorData);
    Alert.alert(
      "Deletion Failed",
      errorData.error || `Could not delete log (Status: ${response.status}). Please try again.`
    );
  }
} catch (error) {
  console.error(`[Logs.js] Error during fetch DELETE operation for ID ${logId}:`, error);
  Alert.alert("Error", "An error occurred while trying to delete the log. Check your connection.");
}
};

// --- Render ---
console.log(`[Logs.js] Rendering component. Current modalVisible state: ${modalVisible}, Current logLoading state: ${logLoading}`);
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
<TouchableOpacity style={styles.iconWrapper} onPress={handleSearch}>
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
    </View>
  ) : logs.length === 0 ? (
     <View style={styles.centeredIndicator}>
        <Text style={styles.noResultsText}>No logs found for "{activeFilter}" filter{url ? ` matching "${url}"` : ""}.</Text>
     </View>
  ) : (
    <FlatList
      data={logs} // Use fetched logs directly instead of filtering client-side
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => {
            console.log(`[Logs.js] TouchableOpacity onPress - Calling showModal for ID: ${item.id}`);
            showModal(item.id);
          }}
        >
          <ListItem
            item={{
              ...item,
              icon: iconMap[item.icon],
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
{console.log(`[Logs.js] Preparing to render DetailsModal. Props being passed - visible: ${modalVisible || logLoading}, logLoading: ${logLoading}`)}

<DetailsModal
  visible={modalVisible || logLoading}
  onClose={closeModal}
  logDetails={selectedLog}
  loading={logLoading}
  onDelete={handleDeleteLog}
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
backgroundColor: '#121212', // Example background color
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
textAlign: 'center',
paddingHorizontal: 20, // Add some padding if text is long
},
listContent: {
paddingBottom: 20,
},
});