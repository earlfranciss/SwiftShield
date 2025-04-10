import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  ScrollView, // Import ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient"; // Keep if used elsewhere, wasn't used in provided snippet
import LineGraph from "../components/LineGraph";
import PieGraph from "../components/PieGraph";
import ThreatLevelCard from "../components/ThreatLevelCard";
import RecentActivityLogs from "../components/RecentActivityLogs";
import StatsText from "../components/StatsText";
import DetailsModal from "../components/DetailsModal";
import config from "../../config";
import { useFocusEffect } from "@react-navigation/native";

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null); // Note: analyticsData is fetched but not used directly in rendering yet
  const [loading, setLoading] = useState(true);
  const [logsData, setLogsData] = useState([]);
  const [totalUrlsScanned, setTotalUrlsScanned] = useState(0);
  const [threatsBlocked, setThreatsBlocked] = useState(0);
  const [pieChartData, setPieChartData] = useState([]);
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
          const [logsRes, urlsScannedRes, threatsBlockedRes, severityCountsRes, pieChartRes, weeklyThreatsRes] =
            await Promise.all([
              fetch(`${config.BASE_URL}/recent-activity`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/urls-scanned`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/threats-blocked`).then((res) => res.json()),
              fetch(`${config.BASE_URL}/severity-counts`).then((res) => res.json()),fetch(`${config.BASE_URL}/api/stats/scan-source-distribution`).then(res => res.ok ? res.json() : []), // Fetch pie data
              fetch(`${config.BASE_URL}/weekly-threats`).then(res => res.ok ? res.json() : { labels: [], data: [] }) // Fetch weekly data
            ]);

          console.log("✅ Recent Activity:", logsRes);
          console.log("✅ URLs Scanned:", urlsScannedRes);
          console.log("✅ Threats Blocked:", threatsBlockedRes);
          console.log("✅ Severity Counts:", severityCountsRes);
          console.log("✅ Pie Chart Data:", pieChartRes);
          console.log("✅ Weekly Threats Data:", weeklyThreatsRes);
  
          // Set the data in state
          setLogsData(logsRes.recent_activity || []);
          setTotalUrlsScanned(urlsScannedRes.total_urls_scanned || 0);
          setThreatsBlocked(threatsBlockedRes.threats_blocked || 0);
          setSeverityCounts(severityCountsRes.severity_counts || {});
          setPieChartData(pieChartRes || []); // <--- Set Pie data state
          setWeeklyThreatsData(weeklyThreatsRes || { labels: [], data: [] }); // <--- Set Weekly data state
  
        } catch (error) {
          cconsole.error("🔥 Error fetching analytics data:", error);
          // Reset states on error
          setLogsData([]);
          setTotalUrlsScanned(0);
          setThreatsBlocked(0);
          setSeverityCounts({});
          setPieChartData([]);
          setWeeklyThreatsData({ labels: [], data: [] });
        } finally {
          setLoading(false);
        }
      }
  
      fetchAnalyticsData();
    }, []) // Keep empty dependency array if you only want this to run once when the screen focuses
  );

  

  // --- Format Probability Function (keep as is) ---
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

  // --- Modal Functions (keep as is) ---
  const showModal = (logItem) => {
    console.log("Opening modal with log:", logItem);

    // Format data for modal
    const modalData = {
      id: logItem.id,
      url: logItem.url || logItem.link?.split(" - ")[0] || "Unknown URL", // Added safer access for link
      platform: logItem.platform || "Web",
      date_scanned: logItem.date_scanned || "Unknown Date", // Corrected default value
      severity: logItem.severity || "Unknown",
      // Use the formatProbability function here for consistency
      probability: formatProbability(logItem.probability),
      recommended_action: logItem.recommended_action || "Unknown"
    };
    
    setSelectedLog(modalData);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
  };

  console.log("Rendering Analytics. Severity Counts State:", JSON.stringify(severityCounts));
  

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3AED97" />
        {/* Optional: Add a loading text */}
        {/* <Text style={{ color: '#FFF', marginTop: 10 }}>Loading Analytics...</Text> */}
      </SafeAreaView>
    );
  }

  const threatData = [
    {
      level: "Low",
      // WHY IS severityCounts?.Low evaluating to undefined/null here? It should be 16.
      count: severityCounts?.LOW ?? 0,
      borderColor: "#3AED97", // Example colors - adjust as needed
      textColor: "#3AED97",
      countColor: "#3AED97",
    },
    {
      level: "Medium",
      count: severityCounts?.MEDIUM ?? 0, // Should be 4
      borderColor: "#FFDE59",
      textColor: "#FFDE59",
      countColor: "#FFDE59",
    },
    {
      level: "High",
      count: severityCounts?.HIGH ?? 0, // Should be 12
      borderColor: "#FF914D",
      textColor: "#FF914D",
      countColor: "#FF914D",
    },
    {
      level: "Critical",
      count: severityCounts?.CRITICAL ?? 0, // Should be 5
      borderColor: "#FF4F4F",
      textColor: "#FF4F4F",
      countColor: "#FF4F4F",
    },
  ];

  console.log("--- Calculated threatData RIGHT AFTER definition:", JSON.stringify(threatData));
  console.log("--- State used for calculation:", JSON.stringify(severityCounts));

  const statsData = [
    { label: "URLs Scanned", value: totalUrlsScanned },
    { label: "Threats Blocked", value: threatsBlocked },
  ];


  const viewabilityConfig = {
    itemVisiblePercentThreshold: 100,
  };

  const message = "Status: OK";

  

  return (
    // SafeAreaView provides the fixed padding
    <SafeAreaView style={styles.container}>

        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentContainer} // Use for bottom padding if needed
        >

            <View style={styles.componentWrapper}>
                <Text style={styles.debugTitle}>Weekly Threat Analysis:</Text>

                <LineGraph data={analyticsData?.weekly_threats || []} />
            </View>


            <View style={styles.componentWrapper}>
              <Text style={styles.debugTitle}>Threats by Source:</Text>
              <PieGraph data={pieChartData} />
            </View>

            <View style={styles.componentWrapper}>
                 {/* StatsText needs to handle its internal side-by-side layout responsively */}
                <StatsText stats={statsData} />
            </View>

            <View style={styles.componentWrapper}>
                {/* ThreatLevelCard needs to handle its internal horizontal layout responsively (e.g., flexWrap) */}
                <ThreatLevelCard data={threatData} />
            </View>

            {/* --- Recent Activity Section --- */}
            <View style={styles.recentActivitySection}>
              <Text style={styles.recentActivityTitle}>Recent Activity:</Text>
              {logsData?.length > 0 ? (
                  // Map logsData to render RecentActivityLogs components
                  logsData.map((item, index) => (
                      <TouchableOpacity
                          key={item.id?.toString() || `log-${index}`}
                          onPress={() => showModal(item)}
                          style={styles.logItemTouchable} // For spacing BETWEEN items
                      >
                          {/* RecentActivityLogs needs internal styling & responsiveness */}
                          <RecentActivityLogs logItem={item} />
                      </TouchableOpacity>
                  ))
              ) : (
                  <Text style={styles.noActivityText}>No recent activity available.</Text>
              )}
            </View>
            {/* --- End Recent Activity Section --- */}

        </ScrollView>

        {/* --- Modal remains outside ScrollView --- */}
        <DetailsModal
            visible={modalVisible}
            onClose={closeModal}
            logDetails={selectedLog || {}}
        />
    </SafeAreaView>
);
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { // Style for SafeAreaView
      flex: 1,
      padding: 20, // <<< FIXED padding as requested
      backgroundColor: '#000000', // Match image background
  },
  scrollContentContainer: { // Style for ScrollView's inner container
      // No horizontal/vertical padding here by default
      paddingBottom: 60, // Add padding at the bottom if needed (e.g., for tab bar)
  },
  componentWrapper: { // Simple wrapper for spacing below each main component/section
      marginBottom: 25, // Adjust spacing as needed
  },
  debugTitle: { // Temporary style for section titles (like in image) - adjust as needed
      color: "#3AED97",
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 15,
  },
  recentActivitySection: {
      // marginTop: 10, // Spacing is handled by previous componentWrapper margin
  },
  recentActivityTitle: { // Title specifically for Recent Activity
      color: "#3AED97",
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 15,
  },
  logItemTouchable: { // Used on TouchableOpacity wrapping each log item
      marginBottom: 10, // Creates vertical space between log items
  },
  loadingContainer: { // Applied additionally to container when loading
      justifyContent: "center",
      alignItems: "center",
      padding: 0, // Override padding when only showing loader
  },
  noActivityText: {
      textAlign: "center",
      color: "#AAAAAA",
      fontSize: 14,
      marginTop: 20,
      marginBottom: 20,
  },
});