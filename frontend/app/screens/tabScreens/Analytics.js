import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LineGraph from "../components/LineGraph";
import PieGraph from "../components/PieGraph";
import ThreatLevelCard from "../components/ThreatLevelCard";
import RecentActivityLogs from "../components/RecentActivityLogs";
import StatsText from "../components/StatsText";
import config from "../../config";

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Fetching analytics from:", `${config.BASE_URL}/analytics`);
    fetch(`${config.BASE_URL}/analytics`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Analytics Data:", data);
        setAnalyticsData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching analytics data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3AED97" />
      </SafeAreaView>
    );
  }

  const threatData = [
    {
      level: "Low",
      count: analyticsData?.threat_levels?.Low || 0,
      borderColor: "#3AED97",
      textColor: "#3AED97",
      countColor: "#3AED97",
    },
    {
      level: "Medium",
      count: analyticsData?.threat_levels?.Medium || 0,
      borderColor: "#FFDE59",
      textColor: "#FFDE59",
      countColor: "#FFDE59",
    },
    {
      level: "High",
      count: analyticsData?.threat_levels?.High || 0,
      borderColor: "#FF914D",
      textColor: "#FF914D",
      countColor: "#FF914D",
    },
    {
      level: "Critical",
      count: analyticsData?.threat_levels?.Critical || 0,
      borderColor: "#FF4F4F",
      textColor: "#FF4F4F",
      countColor: "#FF4F4F",
    },
  ];

  const statsData = [
    { label: "URLs Scanned", value: analyticsData?.total_urls_scanned || 0 },
    { label: "Threats Blocked", value: analyticsData?.threats_blocked || 0 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.graphContainer}>
        <LineGraph data={analyticsData?.weekly_threats} />
      </View>
      <View style={styles.graphContainer}>
        <PieGraph data={analyticsData?.threats_by_source} />
      </View>
      <View style={styles.statsContainer}>
        <StatsText stats={statsData} />
      </View>
      <View style={styles.card}>
        <ThreatLevelCard data={threatData} />
      </View>
      <View style={styles.recentActivityContainer}>
        <Text style={styles.recentActivityTitle}>Recent Activity:</Text>
        {analyticsData?.recent_activity?.length > 0 ? (
          <FlatList
            data={analyticsData.recent_activity}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => <RecentActivityLogs logItem={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            initialNumToRender={1} // Show only one full item
            maxToRenderPerBatch={1} // Render only one item at a time
            windowSize={2} // Keeps only the next item slightly visible
            style={{ height: 100, overflow: "hidden" }} // Ensures third item is hidden
          />
        ) : (
          <Text style={styles.noActivityText}>
            No recent activity available.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  graphContainer: {
    marginBottom: 5,
  },
  statsContainer: {
    marginBottom: 5,
  },
  card: {
    marginVertical: 5,
    marginHorizontal: 20,
  },
  recentActivityTitle: {
    color: "#3AED97",
    fontSize: 12,
    fontWeight: "regular",
    marginBottom: 10,
  },
  recentActivityContainer: {
    height: 150,
    marginBottom: 60,
    marginHorizontal: 20,
    overflow: "hidden", // Ensures extra items are clipped
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 10,
  },
  noActivityText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 10,
  },
  gradientContainer: {
    borderRadius: 12,
    marginBottom: 5,
  },
});
