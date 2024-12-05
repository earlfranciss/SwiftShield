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

const iconMap = {
  "suspicious-icon": require("../../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../../assets/images/safe-icon.png"),
};

export default function Logs() {
  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const viewableItems = useSharedValue([]);
  const [activeFilter, setActiveFilter] = useState("recent");

  const handleScan = () => {
    console.log("Scanning URL:", url);
    // Add your URL scanning logic here
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    console.log("Active Filter:", filter);
    // Add your filtering logic here
  };

  // Function to fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.BASE_URL}/logs`); // Corrected URL
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

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 100,
  };

  const filteredLogs = logs.filter((log) => {
    if (activeFilter === "recent") return true; 
    if (activeFilter === "suspicious") return log.icon === "suspicious-icon";
    if (activeFilter === "safe") return log.icon === "safe-icon";
    return true;
  });

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
            onChangeText={(text) => setUrl(text)}
            value={url}
          />
          <TouchableOpacity onPress={handleScan} style={styles.iconWrapper}>
            <Icon name="search" size={24} color="#585757" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Section */}
      <CarouselFilter onFilterChange={handleFilterChange} />

      {/* List Items Section */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item.id.toString()} // Ensure keys are strings
            renderItem={({ item }) => (
              <ListItem
                item={{
                  ...item,
                  icon: iconMap[item.icon], 
                }}
                viewableItems={viewableItems}
              />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginHorizontal: 20,
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
