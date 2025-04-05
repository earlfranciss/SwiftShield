import React, { useEffect, useState, useCallback  } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LineGraph from "../../components/LineGraph";
import PieGraph from "../../components/PieGraph";
import ThreatLevelCard from "../../components/ThreatLevelCard";
import RecentActivityLogs from "../../components/RecentActivityLogs";
import StatsText from "../../components/StatsText";
import DetailsModal from "../../components/DetailsModal";
import config from "../../config/config";
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logLoading, setLogLoading] = useState(false); // Track individual log loading


  useFocusEffect(
    useCallback(() => {
      async function fetchAnalyticsData() {
        try {
          setLoading(true);
  
          // Fetch all required APIs in parallel
          const [logsRes, urlsScannedRes, threatsBlockedRes, severityCountsRes] =
            await Promise.all([
              fetch(`${config.BASE_URL}/logs/recent-activity`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/logs/urls-scanned`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/logs/threats-blocked`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/logs/severity-counts`).then((res) => res.json()),
            ]);
  
          // Set the data in state
          setLogsData(logsRes.recent_activity || []); 
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
    }, [])
  );

  const formatProbability = (prob) => {
    // Check if probability exists and is a valid number
    if (prob === null || prob === undefined || isNaN(parseFloat(prob))) {
      return "N/A%";
    }
    
    // Convert to number, multiply by 100, round to integer, and add % sign
    try {
      const percentage = (parseFloat(prob) * 100).toFixed(0);
      return `${percentage}%`;
    } catch (error) {
      console.error("Error formatting probability:", error, "Value:", prob);
      return "N/A%";
    }
  };

  const showModal = (logItem) => {
    console.log("Opening modal with log:", logItem);
    
    // Format data for modal
    const modalData = {
      id: logItem.id,
      url: logItem.url || logItem.link.split(" - ")[0], // Extract URL from link if needed
      platform: logItem.platform || "Web",
      date_scanned: logItem.date_scanned || "Unknown",
      severity: logItem.severity || "Unknown",
      probability: logItem.probability !== undefined ? `${Math.round(logItem.probability * 100)}%` : "N/A%",
      recommended_action: logItem.recommended_action || "Unknown"
    };
    
    setSelectedLog(modalData);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
  };
  

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


  const viewabilityConfig = {
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
            data={logsData}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => showModal(item)}>
                <RecentActivityLogs logItem={item} />
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            viewabilityConfig={viewabilityConfig}
          />
        ) : (
          <Text style={styles.noActivityText}>No recent activity available.</Text>
        )}
      </View>

      <DetailsModal 
        visible={modalVisible} 
        onClose={closeModal} 
        logDetails={selectedLog || {}} 
        onUpdatePress={() => console.log("Update log:", selectedLog)}
        onDeletePress={() => console.log("Delete log:", selectedLog)}
      />
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
