import { View, Text, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { PieChart } from "react-native-chart-kit";

// Get screen width - Define it reliably
const screenWidth = Dimensions.get('window').width;

const PieGraph = ({ data }) => {

  // --- REMOVE Hardcoded data ---
  // const data = [ ... ]; // DELETE THIS HARDCODED ARRAY

  // --- ADD: Check the INCOMING 'data' prop ---
  if (!data) {
    // Handle case where data prop hasn't arrived yet (e.g., initial render)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#AAAAAA" />
        <Text style={styles.emptyText}>Loading chart data...</Text>
      </View>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    // Handle case where backend returned empty array or fetch failed
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No scan source data available.</Text>
      </View>
    );
  }
  // --- END OF ADDED CHECKS ---

  // --- Filter data for chart slices (only show slices > 0) ---
  // Use the 'data' prop here
  const chartDataForDisplay = data.filter(item => item.population > 0);

  // --- Handle Case Where All Values Are Zero ---
  if (chartDataForDisplay.length === 0 && data.length > 0) {
      // If the original data array had items, but all had population 0
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scans recorded yet for any source.</Text>
        </View>
      );
  }


  // --- Chart Configuration (can stay the same) ---
  const chartConfig = {
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <View style={styles.container}>
      {/* --- Custom Legends Section --- */}
      {/* MODIFY: Use the incoming 'data' prop here to show ALL categories */}
      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <View
            key={item.name || `legend-${index}`} // Use name from prop data as key
            style={styles.legendItem}
          >
            {/* Legend Name */}
            <View style={styles.legendTextContainer}>
              <Text style={styles.legendNameText}>
                {/* Use name from prop data */}
                {item.name}:
              </Text>
            </View>

            {/* Legend Number */}
            <Text
              style={[
                styles.legendValueText,
                // Use color from prop data (provide fallback)
                { color: item.color || '#FFFFFF' },
              ]}
            >
              {/* Use population from prop data */}
              {item.population}
            </Text>
          </View>
        ))}
      </View>

      {/* --- Pie Chart Section --- */}
      <View style={styles.chartContainer}>
        {/* MODIFY: Use the filtered 'chartDataForDisplay' from the prop data */}
        <PieChart
          data={chartDataForDisplay} // Use filtered data from prop
          width={screenWidth / 2.2}
          height={150}
          chartConfig={chartConfig}
          accessor={"population"} // Still use 'population' key
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          absolute
          hasLegend={false}
        />
      </View>
    </View>
  );
};

// --- Add/Keep Styles ---
const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", width: '100%' },
  legendContainer: { flex: 1, paddingRight: 10, justifyContent: 'center' },
  chartContainer: { alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  legendTextContainer: { flexDirection: "row", alignItems: "center" },
  legendNameText: { color: "#E0E0E0", fontSize: 12 },
  legendValueText: { fontSize: 14, fontWeight: "bold", textAlign: 'right' },
  loadingContainer: { height: 150, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { height: 150, justifyContent: 'center', alignItems: 'center', padding: 10 },
  emptyText: { color: '#AAAAAA', fontSize: 12, textAlign: 'center' }
});

export default PieGraph;
