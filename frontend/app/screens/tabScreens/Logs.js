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
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import CarouselFilter from "../components/CarouselFilter"; 
import { useFocusEffect } from "@react-navigation/native";
import ListItem from "../components/ListItem";
import config from "../../config";
import DetailsModal from '../components/DetailsModal';

const iconMap = {
  "suspicious-icon": require("../../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../../assets/images/safe-icon.png"),
};

export default function Logs({ route }) {
  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const viewableItems = useSharedValue([]);
  const [activeFilter, setActiveFilter] = useState("recent");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logLoading, setLogLoading] = useState(false); // Track individual log loading

  // Define filter options
  const filterOptions = [
    { id: 'recent', label: 'Recent' },
    { id: 'whitelisted', label: 'Whitelisted' },
    { id: 'blacklisted', label: 'Blacklisted' },
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' },
    { id: 'critical', label: 'Critical' }
  ];

  const showModal = async (logId) => {
    console.log('Fetching log details for ID:', logId);
    setLogLoading(true);
    try {
      const response = await fetch(`${config.BASE_URL}/logs/${logId}`);
      const data = await response.json();
      
      if (data.error) {
        console.error("Error fetching log details:", data.error);
      } else {
        setSelectedLog(data);
        setModalVisible(true);
      }
    } catch (error) {
      console.error("Error fetching log details:", error);
    } finally {
      setLogLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
  };

  const filters = [
    { id: "recent", label: "Recent" },
    { id: "whitelisted", label: "Whitelisted" },
    { id: "blacklisted", label: "Blacklisted" },
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
    { id: "critical", label: "Critical" },
  ];

  const handleScan = () => {
    console.log("Scanning URL:", url);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    console.log("Active Filter:", filter);
    fetchLogs(filter);
  };

  // Fetch logs with server-side filtering
  const fetchLogs = async (filterType = activeFilter) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.BASE_URL}/logs?filter=${filterType}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch logs when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  // Handle notification click (if logId is passed from route)
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

  // Filter logs based on active category and search
  const getFilteredLogs = () => {
    return logs.filter(log => {
      // Category-based filtering
      let passesCategoryFilter = false;

      switch (activeFilter) {
        case "recent":
          passesCategoryFilter = true; // Show all logs for "recent"
          break;
        case "whitelisted":
          passesCategoryFilter = log.status?.toLowerCase().includes("safe") || 
                                 log.status?.toLowerCase().includes("whitelist");
          break;
        case "blacklisted":
          passesCategoryFilter = log.status?.toLowerCase().includes("phishing") || 
                                 log.status?.toLowerCase().includes("blacklist");
          break;
        case "low":
          passesCategoryFilter = log.severity?.toLowerCase() === "low";
          break;
        case "medium":
          passesCategoryFilter = log.severity?.toLowerCase() === "medium";
          break;
        case "high":
          passesCategoryFilter = log.severity?.toLowerCase() === "high";
          break;
        case "critical":
          passesCategoryFilter = log.severity?.toLowerCase() === "critical";
          break;
        default:
          passesCategoryFilter = true;
      }

      if (!passesCategoryFilter) return false;

      // Search-based filtering
      if (!url || url.trim() === "") return true; 

      const searchTerm = url.toLowerCase().trim();

      return Object.values(log).some(value =>
        typeof value === "string" && value.toLowerCase().includes(searchTerm)
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Section */}
      <View>
        <Text style={styles.text}>Search:</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="www.malicious.link"
            placeholderTextColor="#6c757d"
            onChangeText={text => setUrl(text)}
            value={url}
          />
          <TouchableOpacity onPress={handleScan} style={styles.iconWrapper}>
            <Icon name="search" size={24} color="#585757" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Section */}
      <CarouselFilter 
        filters={filterOptions}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange} 
      />

      {/* List Items Section */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <FlatList
            data={getFilteredLogs()}
            extraData={url}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => showModal(item.id)}
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

      <DetailsModal 
        visible={modalVisible}
        onClose={closeModal}
        logDetails={selectedLog} 
        loading={logLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  text: {
    color: "#31EE9A",
    fontSize: 12,
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
  listContainer: {
    marginVertical: 10,
  },
  listContent: {
    paddingBottom: 10,
  },
});
