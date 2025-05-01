import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  ScrollView,
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

export default function Analytics({ navigation }) {
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
  const [modalData, setModalData] = useState(null);
  const [logLoading, setLogLoading] = useState(false); // Keep if needed for delete loading
  const [weeklyThreatsData, setWeeklyThreatsData] = useState({
    labels: [],
    data: [],
  });

  useFocusEffect(
    useCallback(() => {
      async function fetchAnalyticsData() {
        try {
          setLoading(true);

          // Fetch all required APIs in parallel
          const [
            logsRes,
            urlsScannedRes,
            threatsBlockedRes,
            severityCountsRes,
            pieChartRes,
            weeklyThreatsRes,
          ] = await Promise.all([
            fetch(`${config.BASE_URL}/recent-activity`).then((res) =>
              res.ok ? res.json() : { recent_activity: [] }
            ),
            fetch(`${config.BASE_URL}/urls-scanned`).then((res) => res.json()),
            fetch(`${config.BASE_URL}/threats-blocked`).then((res) =>
              res.json()
            ),
            fetch(`${config.BASE_URL}/severity-counts`).then((res) =>
              res.json()
            ),
            fetch(`${config.BASE_URL}/api/stats/scan-source-distribution`).then(
              (res) => (res.ok ? res.json() : [])
            ), // Fetch pie data
            fetch(`${config.BASE_URL}/api/stats/scan-source-distribution`)
              .then((res) => {
                if (!res.ok) {
                  // Log error if fetch failed
                  console.error(
                    `Error fetching pie chart data: ${res.status} ${res.statusText}`
                  );
                  return []; // Return empty array on failure
                }
                return res.json(); // Parse JSON on success
              })
              .catch((error) => {
                // Log error if fetch itself fails (network issue, etc.)
                console.error("Fetch error for pie chart data:", error);
                return []; // Return empty array on fetch error
              }),
            fetch(`${config.BASE_URL}/weekly-threats`).then((res) =>
              res.ok ? res.json() : { labels: [], data: [] }
            ), // Fetch weekly data
          ]);

          // console.log("✅ Recent Activity:", logsRes);
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
          setPieChartData(pieChartRes || []); // Use API result directly
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
  // --- Modal Functions ---
  const showModal = (logItem) => {
    console.log("Log item clicked:", logItem);

    // **Transform data from logItem (from /recent-activity)
    // **into the structure expected by DetailsModal's 'scanResult' prop.**
    const preparedModalData = {
      log_id: logItem.log_id, // <-- Ensure this comes from backend now
      url: logItem.url || "Unknown URL",
      platform: logItem.platform || "Unknown",
      // Expecting ISO string from backend now
      date_scanned: logItem.date_scanned,
      severity: logItem.severity || "Unknown",
      // Convert probability score (0-1) to percentage (0-100)
      phishing_percentage:
        typeof logItem.phishing_probability_score === "number"
          ? parseFloat((logItem.phishing_probability_score * 100).toFixed(1))
          : 0, // Default to 0 if missing/invalid
      recommended_action: logItem.recommended_action || "Unknown",
      // Add any other fields DetailsModal might expect
    };

    console.log("Prepared data for modal:", preparedModalData);

    setModalData(preparedModalData); // Set the prepared data
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalData(null); // Clear modal data on close
  };

  // --- Delete Handler (Example - Reuse logic from Home.js if needed) ---
  const handleDeleteLog = async (logId) => {
    if (!logId) {
      console.error("Delete failed: No log ID provided.");
      Alert.alert("Error", "Cannot delete log without an ID.");
      return;
    }
    console.log("Attempting to delete log from Analytics:", logId);
    setLogLoading(true); // Use logLoading state
    try {
      const deleteUrl = `${config.BASE_URL}/logs/${logId}`;
      const response = await fetch(deleteUrl, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(
          result.error || `Failed to delete (Status: ${response.status})`
        );
      }

      Alert.alert("Success", "Log deleted successfully.");
      closeModal(); // Close modal after successful deletion

      // **Refresh the logs list** by removing the deleted item
      setLogsData((prevLogs) => prevLogs.filter((log) => log.log_id !== logId));
    } catch (err) {
      console.error("Delete failed:", err);
      Alert.alert("Error", `Could not delete log: ${err.message}`);
    } finally {
      setLogLoading(false);
    }
  };

  console.log(
    "Rendering Analytics. Severity Counts State:",
    JSON.stringify(severityCounts)
  );

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3AED97" />
        <Text style={{ color: "#3AED97", marginTop: 12 }}>
          Loading Analytics...
        </Text>
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
      borderColor: "#EED531",
      textColor: "#EED531",
      countColor: "#EED531",
    },
    {
      level: "High",
      count: severityCounts?.HIGH ?? 0,
      borderColor: "#EE8931",
      textColor: "#EE8931",
      countColor: "#EE8931",
    },
    {
      level: "Critical",
      count: severityCounts?.CRITICAL ?? 0,
      borderColor: "#ED3A3A",
      textColor: "#ED3A3A",
      countColor: "#ED3A3A",
    },
  ];

  console.log(
    "--- Calculated threatData RIGHT AFTER definition:",
    JSON.stringify(threatData)
  );
  console.log(
    "--- State used for calculation:",
    JSON.stringify(severityCounts)
  );

  const statsData = [
    { label: "URLs Scanned", value: totalUrlsScanned },
    { label: "Threats Detected", value: threatsBlocked },
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
            <Text style={styles.noActivityText}>
              No recent activity available.
            </Text>
          )}
        </View>
        {/* --- End Recent Activity Section --- */}
      </ScrollView>

      {/* --- Modal remains outside ScrollView --- */}
      <DetailsModal
        navigation={navigation}
        visible={modalVisible}
        onClose={closeModal}
        scanResult={modalData}
        //onDeletePress={handleDeleteLog}
      />
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    // Style for SafeAreaView
    flex: 1,
    padding: 20, // <<< FIXED padding as requested
  },
  scrollContentContainer: {
    // Style for ScrollView's inner container
    // No horizontal/vertical padding here by default
    paddingBottom: 60, // Add padding at the bottom if needed (e.g., for tab bar)
  },
  componentWrapper: {
    // Simple wrapper for spacing below each main component/section
    marginBottom: 5, // Adjust spacing as needed
  },
  debugTitle: {
    // Temporary style for section titles (like in image) - adjust as needed
    color: "#3AED97",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  recentActivitySection: {
    // marginTop: 10, // Spacing is handled by previous componentWrapper margin
  },
  recentActivityTitle: {
    // Title specifically for Recent Activity
    color: "#3AED97",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  logItemTouchable: {
    // Used on TouchableOpacity wrapping each log item
    marginBottom: 10, // Creates vertical space between log items
  },
  loadingContainer: {
    // Applied additionally to container when loading
    flex: 1,
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
