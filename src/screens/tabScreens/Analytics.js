import React, { useState, useCallback, useContext } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import LineGraph from "../../components/LineGraph";
import BarGraph from "../../components/BarGraph";
import PieGraph from "../../components/PieGraph";
import ThreatLevelCard from "../../components/ThreatLevelCard";
import config from "../../config/config";
import { useFocusEffect } from "@react-navigation/native";
import { ThemeContext } from "../../components/themeContext";

const SPACE_BETWEEN_BAR_AND_CARDS = 15; // Adjust this value (e.g., 5, 10, 15)

export default function Analytics({ navigation }) {
  const { theme } = useContext(ThemeContext); // <<< Use context instead of useColorScheme
  const [loading, setLoading] = useState(true);
  const [totalUrlsScanned, setTotalUrlsScanned] = useState(0);
  const [threatsBlocked, setThreatsBlocked] = useState(0);
  const [pieChartData, setPieChartData] = useState([]);
  const [severityCounts, setSeverityCounts] = useState({
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  });
  const [lineGraphData, setLineGraphData] = useState({
    labels: [],
    datasets: [], // <<< Use 'datasets' key here
  });
  const [error, setError] = useState(null);

  console.log("<<< Analytics Component Render - theme: >>>", theme);

  // Replace the ENTIRE useFocusEffect in your Analytics.js with this:
  useFocusEffect(
    useCallback(() => {
      console.log(
        "<<< Analytics.js: useFocusEffect triggered! Current theme:",
        theme
      ); // <<< ADD LOG HERE

      async function fetchAnalyticsData() {
        // Reset states at the beginning
        setLoading(true);
        setError(null); // Add this if you haven't already added an error state
        setTotalUrlsScanned(0); // Keep resetting states you use
        setThreatsBlocked(0); // Keep resetting states you use
        setPieChartData([]);
        setSeverityCounts({ Low: 0, Medium: 0, High: 0, Critical: 0 }); // Adjust keys if needed
        setLineGraphData({ labels: [], datasets: [] }); // Reset with CORRECT structure

        try {
          console.log("Analytics.js: Fetching data...");
          // Keep your Promise.all structure, but fetch pie ONCE
          const [
            logsRes,
            urlsScannedRes,
            threatsBlockedRes,
            severityCountsRes,
            pieChartRes, // Fetch pie once
            // Remove duplicate pie fetch result variable
            weeklyThreatsRes, // Use your variable name
          ] = await Promise.all([
            fetch(`${config.BASE_URL}/recent-activity`).then((res) =>
              res.ok ? res.json() : { recent_activity: [] }
            ),
            fetch(`${config.BASE_URL}/urls-scanned`).then((res) => res.json()), // Keep if needed
            fetch(`${config.BASE_URL}/threats-blocked`).then((res) =>
              res.json()
            ), // Keep if needed
            fetch(`${config.BASE_URL}/severity-counts`).then((res) =>
              res.json()
            ), // Adjust error handling if needed
            // Fetch pie data ONCE
            fetch(`${config.BASE_URL}/api/stats/scan-source-distribution`)
              .then((res) => (res.ok ? res.json() : []))
              .catch((err) => {
                console.error("Pie fetch error:", err);
                return [];
              }),
            // Fetch from /weekly-threats (expecting new structure)
            fetch(`${config.BASE_URL}/weekly-threats`)
              .then(async (res) => {
                // Added async for error handling
                if (!res.ok) {
                  const errorText = await res
                    .text()
                    .catch(() => "Failed to read error body");
                  console.error(
                    `<<< Analytics.js: Error fetching /weekly-threats: ${res.status} - ${errorText} >>>`
                  );
                  return null; // Indicate fetch failure
                }
                try {
                  const jsonData = await res.json();
                  console.log(
                    "<<< Analytics.js: Successfully parsed JSON from /weekly-threats >>>"
                  );
                  return jsonData;
                } catch (jsonError) {
                  console.error(
                    "<<< Analytics.js: Failed to parse JSON from /weekly-threats: >>>",
                    jsonError
                  );
                  return null; // Indicate parse failure
                }
              })
              .catch((error) => {
                console.error(
                  "<<< Analytics.js: Network/Fetch error for /weekly-threats: >>>",
                  error
                );
                return null; // Indicate fetch failure
              }),
          ]); // End of Promise.all

          console.log("Analytics.js: --- Fetch completed ---");
          // Log the raw response received for weekly threats
          console.log(
            "<<< Analytics.js: Raw weeklyThreatsRes received by Analytics.js: >>>",
            JSON.stringify(weeklyThreatsRes, null, 2)
          );

          setTotalUrlsScanned(urlsScannedRes?.total_urls_scanned || 0);
          setThreatsBlocked(threatsBlockedRes?.threats_blocked || 0);
          setSeverityCounts(
            severityCountsRes?.severity_counts || {
              Low: 0,
              Medium: 0,
              High: 0,
              Critical: 0,
            }
          ); // Adjust key case
          setPieChartData(pieChartRes || []);

          // ========================================================
          // ===== THIS VALIDATION AND SETTER BLOCK WAS MISSING =====
          // ========================================================
          // Validate the structure received from /weekly-threats
          const isValidLabels =
            weeklyThreatsRes && Array.isArray(weeklyThreatsRes.labels);
          const isValidDatasets =
            weeklyThreatsRes && Array.isArray(weeklyThreatsRes.datasets);
          console.log(
            `<<< Analytics.js: Validation Check Results: isValidLabels=${isValidLabels}, isValidDatasets=${isValidDatasets} >>>`
          );

          if (isValidLabels && isValidDatasets) {
            const isDarkMode = theme === "dark"; // Use theme from context

            // --- FIX: Corrected console log (removed colorScheme) ---
            console.log(
              `<<< Theme Check: isDarkMode=${isDarkMode} (theme=${theme}) >>>`
            );

            const modifiedDatasets = weeklyThreatsRes.datasets.map(
              (dataset) => {
                let datasetColor;
                switch (
                  dataset.label // Explicit color handling
                ) {
                  case "URLs Scanned":
                    datasetColor = isDarkMode ? "#FFFFFF" : "#000000";
                    break;
                  case "Phishing":
                    datasetColor = "#ED3A3A";
                    break;
                  case "Safe":
                    datasetColor = "#3AED97";
                    break;
                  default:
                    datasetColor = dataset.color || "#CCCCCC";
                }
                console.log(
                  `<<< Analytics.js: [${theme} mode] Calculated color for '${dataset.label}': ${datasetColor}`
                );

                return { ...dataset, color: datasetColor };
              }
            );
            const finalLineGraphData = {
              labels: weeklyThreatsRes.labels,
              datasets: modifiedDatasets,
            };

            console.log(
              "<<< Validation PASSED. Setting lineGraphData state. >>>"
            );
            setLineGraphData(finalLineGraphData); // Use final data
          } else {
            console.warn(
              "<<< Validation FAILED. NOT setting lineGraphData state. >>>"
            );
            if (!error) {
              setError(
                weeklyThreatsRes === null
                  ? "Failed to fetch graph data."
                  : "Invalid graph data format."
              );
            }
            setLineGraphData({ labels: [], datasets: [] });
          }

          // ========================================================
          // ============= END OF MISSING BLOCK =====================
          // ========================================================
        } catch (error) {
          // Catch errors from Promise.all or JSON parsing in .then()
          console.error("🔥 Error in fetchAnalyticsData try block:", error);
          // Ensure you have an error state: const [error, setError] = useState(null);
          setError(`Failed to load data: ${error.message}`);
          // Reset states
          setTotalUrlsScanned(0);
          setThreatsBlocked(0);
          setSeverityCounts({ Low: 0, Medium: 0, High: 0, Critical: 0 });
          setPieChartData([]);
          setLineGraphData({ labels: [], datasets: [] });
        } finally {
          setLoading(false);
        }
      }

      fetchAnalyticsData();
    }, [theme]) // Keep dependency array empty
  ); // End of useFocusEffect

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

  // --- Prepare data for BarGraph ---
  // Ensure keys match the case returned by the backend ('Low', 'Medium', etc.)
  // --- Prepare data for BarGraph ---
  // Ensure keys match the case returned by the backend ('Low', 'Medium', etc.)
  const barGraphData = [
    { label: "Low", value: severityCounts?.LOW ?? 0, color: "#3AED97" }, // Green
    { label: "Medium", value: severityCounts?.MEDIUM ?? 0, color: "#EED531" }, // Yellow
    { label: "High", value: severityCounts?.HIGH ?? 0, color: "#EE8931" }, // Orange
    {
      label: "Critical",
      value: severityCounts?.CRITICAL ?? 0,
      color: "#ED3A3A",
    }, // Red
  ];

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

  return (
    // SafeAreaView provides the fixed padding
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer} // Use for bottom padding if needed
      >
        {/* Section 1: Weekly Threat Analysis */}
        <View style={styles.componentWrapper}>
          <Text style={styles.sectionTitle}>Weekly Threat Analysis:</Text>

          {/* Render the chart */}
          <LineGraph
            key={JSON.stringify(lineGraphData.datasets)} // Force re-mount on dataset change
            data={lineGraphData}
          />

          {/* Legend View Block */}
          <View style={styles.legendContainer}>
            {(lineGraphData.datasets || []).map((dataset) => (
              <View key={dataset.label} style={styles.legendItem}>
                {/* Text Label: Always use the fixed green color */}
                <Text
                  style={[
                    styles.legendText,
                    { color: "#3AED97" }, // <<< FIXED: Use standard green for text
                  ]}
                >
                  {dataset.label}: {/* Colon and space */}
                </Text>
                {/* Color Box: Use the dynamic dataset color */}
                <View
                  style={[
                    styles.legendColorBox,
                    { backgroundColor: dataset.color || "#CCCCCC" }, // Box color still dynamic
                  ]}
                />
              </View>
            ))}
          </View>
          {/* End Legend View Block */}
        </View>

        <View style={styles.componentWrapper}>
          <Text style={styles.debugTitle}>Threats by Source:</Text>
          <PieGraph data={pieChartData} />
        </View>

        {/* Section 3: Severity Index (Bar Graph) */}
        <View style={styles.componentWrapper}>
          <Text style={styles.debugTitle}>Severity Index:</Text>
          {/* Pass the prepared barGraphData */}
          <BarGraph data={barGraphData} />
        </View>

        <View style={{ height: SPACE_BETWEEN_BAR_AND_CARDS }} />

        <View style={styles.componentWrapper}>
          {/* ThreatLevelCard needs to handle its internal horizontal layout responsively (e.g., flexWrap) */}
          <ThreatLevelCard data={threatData} />
        </View>
      </ScrollView>
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
  sectionTitle: {
    // Ensure this style definition exists
    color: "#3AED97", // Your standard green title color
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15, // Standard margin below titles
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
  legendContainer: {
    flexDirection: "row", // Arrange items horizontally
    justifyContent: "center", // Center items horizontally
    alignItems: "center",
    marginTop: 5, // Space above the legend
    marginBottom: 15, // Space below the legend before next section
    flexWrap: "wrap", // Allow items to wrap to next line if needed
    paddingHorizontal: 10, // Prevent items sticking to screen edges
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 30, // Space between legend items
    marginBottom: 5, // Space below items if they wrap
  },
  legendColorBox: {
    width: 12, // Size of the color square
    height: 12,
    marginRight: 6, // Space between square and text
    borderRadius: 2, // Optional: slightly rounded corners
    // Background color is set dynamically in JSX
  },
  legendText: {
    fontSize: 12,
    // Color is set dynamically in JSX to match the line color
  },
});
