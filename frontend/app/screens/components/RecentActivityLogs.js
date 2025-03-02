import React, { useState, useCallback } from "react";
import { FlatList, StyleSheet, View, Dimensions, ActivityIndicator } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import ListItem from "./ListItem";
import { useFocusEffect } from '@react-navigation/native';
import config from "../../config";

const { height } = Dimensions.get("window");

const iconMap = {
  "suspicious-icon": require("../../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../../assets/images/safe-icon.png"),
  
};

const RecentActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const viewableItems = useSharedValue([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.BASE_URL}/logs`);
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
    itemVisiblePercentThreshold: 50, // Adjust as needed
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListItem
              item={{
                ...item,
                icon: iconMap[item.icon], // Use mapped static require
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
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default RecentActivityLogs;
