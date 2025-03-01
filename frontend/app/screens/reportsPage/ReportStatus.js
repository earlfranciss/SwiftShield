import React, { useState, useCallback } from "react";
import { FlatList, StyleSheet, View, Dimensions, ActivityIndicator } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Reports from "./Reports";
import { useFocusEffect } from '@react-navigation/native';
import config from "../../config";

const { height } = Dimensions.get("window");

const iconMap = {
  "pending": require("../../../assets/images/pending.png"),
  "in progress": require("../../../assets/images/in progress.png"),
  "resolved": require("../../../assets/images/resolved.png"),
};

const ReportStatus = () => {
  const [reports, setReports] = useState([]);
  const viewableItems = useSharedValue([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.BASE_URL}/reports`);
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch reports when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchReports();
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
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Reports
              item={{
                ...item,
                icon: iconMap[item.status] || iconMap["pending"], // Default to 'pending' if status is unknown
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

export default ReportStatus;
