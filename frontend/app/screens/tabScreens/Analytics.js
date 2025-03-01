import React, { useEffect, useState, useCallback  } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logsData, setLogsData] = useState([]);
  const [totalUrlsScanned, setTotalUrlsScanned] = useState(0);
  const [threatsBlocked, setThreatsBlocked] = useState(0);
  const [severityCounts, setSeverityCounts] = useState({
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  });


  useFocusEffect(
    useCallback(() => {
      async function fetchAnalyticsData() {
        try {
          setLoading(true);
  
          // Fetch all required APIs in parallel
          const [logsRes, urlsScannedRes, threatsBlockedRes, severityCountsRes] =
            await Promise.all([
              fetch(`${config.BASE_URL}/recent-activity`).then((res) => res.json()), // ✅ Correct API
              fetch(`${config.BASE_URL}/urls-scanned`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/threats-blocked`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/severity-counts`).then((res) => res.json()),
            ]);
  
          console.log("✅ Recent Activity:", logsRes);
          console.log("✅ URLs Scanned:", urlsScannedRes);
          console.log("✅ Threats Blocked:", threatsBlockedRes);
          console.log("✅ Severity Counts:", severityCountsRes);
  
          // Set the data in state
          setLogsData(logsRes.recent_activity || []); // ✅ Directly use logsRes
          setTotalUrlsScanned(urlsScannedRes.total_urls_scanned || 0);
          setThreatsBlocked(threatsBlockedRes.threats_blocked || 0);
          setSeverityCounts(severityCountsRes.severity_counts || {});
  
        } catch (error) {
          console.error("🔥 Error fetching analytics data:", error);
        } finally {
          setLoading(false);
        }
      }
  
      fetchAnalyticsData();
      // fetchRecentActivity();
    }, [])
  );
  

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
      count: severityCounts?.Low || 0,
      borderColor: "#3AED97",
      textColor: "#3AED97",
      countColor: "#3AED97",
    },
    {
      level: "Medium",
      count: severityCounts?.Medium || 0,
      borderColor: "#FFDE59",
      textColor: "#FFDE59",
      countColor: "#FFDE59",
    },
    {
      level: "High",
      count: severityCounts?.High || 0,
      borderColor: "#FF914D",
      textColor: "#FF914D",
      countColor: "#FF914D",
    },
    {
      level: "Critical",
      count: severityCounts?.Critical || 0,
      borderColor: "#FF4F4F",
      textColor: "#FF4F4F",
      countColor: "#FF4F4F",
    },
  ];

  const statsData = [
    { label: "URLs Scanned", value: totalUrlsScanned },
    { label: "Threats Blocked", value: threatsBlocked },
  ];

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.BASE_URL}/recent-activity`);
      const data = await response.json();
      console.log("Recent Activity Data:", data);
      setLogsData(data.recent_activity);  // ✅ Set logsData correctly
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewabilityConfig = {
    // minimumViewTime: 100, // Item must be visible for 300ms to be considered seen
    // viewAreaCoveragePercentThreshold: 50, // At least 50% of the item must be visible
    itemVisiblePercentThreshold: 100,
  };
  

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
        {logsData?.length > 0 ? (
          <FlatList
            data={logsData}  // ✅ Use logsData directly
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => <RecentActivityLogs logItem={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            initialNumToRender={1} // Show only one full item
            maxToRenderPerBatch={1} // Render only one item at a time
            windowSize={2} // Keeps only the next item slightly visible
            style={{ height: 100, overflow: "hidden" }} // Ensures third item is hidden
            viewabilityConfig={viewabilityConfig}
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
