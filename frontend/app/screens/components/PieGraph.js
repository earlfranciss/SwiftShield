import React from 'react'; // Make sure React is imported
import { View, Text, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { PieChart } from "react-native-chart-kit";

// Get screen width - Define it reliably
const screenWidth = Dimensions.get('window').width;


const PieGraph = ({ data }) => {

  // --- Check for null/undefined data ---
  if (!data) {
    // Handle case where data prop hasn't arrived yet (e.g., initial render)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#AAAAAA" />
        <Text style={styles.emptyText}>Loading chart data...</Text>
      </View>
    );
  }

  // --- Check if data is not an array ---
  // (It's okay if it's an empty array [], the map will just render nothing)
   if (!Array.isArray(data)) {
      console.error("PieGraph Error: Received data prop is not an array:", data);
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Invalid data format received.</Text>
        </View>
      );
   }
   // --- End of checks ---


  // Filter data for chart slices (only show slices with population > 0)
  // If 'data' is [], chartDataForDisplay will also be []
  const chartDataForDisplay = data.filter(item => item && typeof item.population === 'number' && item.population > 0);

  // Chart Configuration
  const chartConfig = {
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Color for chart elements if needed (not labels/slices here)
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Default label color (not used by PieChart)
    style: {
      borderRadius: 16,
    },
    // Props for background gradient are not directly applicable like LineChart,
    // but defining color is good practice.
  };

  return (
    // Main container using Flexbox row layout
    <View style={styles.container}>

      {/* --- Custom Legends Section --- */}
      <View style={styles.legendContainer}>
        {/* Map over the ORIGINAL data prop to show all categories */}
        {data.map((item, index) => (
            <View key={item?.name || `legend-${index}`} style={styles.legendItem}>
              {/* Legend Name */}
              <Text style={styles.legendNameText}>
                 {/* Use name from prop data, provide fallback */}
                 {item?.name || 'Unnamed'}:
              </Text>
              {/* Legend Value */}
              <Text
                 style={[
                    styles.legendValueText,
                    // Use color from prop data for the value, fallback to white
                    { color: item?.color || '#FFFFFF' },
                 ]}
               >
                {/* Use population from prop data (will correctly show 0) */}
                {item?.population ?? 0} {/* Handle potential missing population */}
              </Text>
            </View>
          )
        )}
        {/* Display a message if the data array was explicitly empty */}
        {data.length === 0 && (
            <Text style={styles.emptyText}>No categories defined.</Text>
        )}
      </View>

      {/* --- Pie Chart Section --- */}
      <View style={styles.chartContainer}>
        {/* Conditionally render the PieChart only if there's data with population > 0 */}
        {chartDataForDisplay.length > 0 ? (
          <PieChart
            data={chartDataForDisplay} // Use the FILTERED data for drawing slices
            width={screenWidth / 2.2}  // Adjust width as needed
            height={150}               // Adjust height as needed
            chartConfig={chartConfig}
            accessor={"population"}    // Access the 'population' key
            backgroundColor={"transparent"} // Make chart background transparent
            paddingLeft={"15"}         // Adjust padding if needed
            center={[10, 0]}           // Fine-tune centering [x, y] offset if needed
            absolute                   // Show absolute values, not percentages
            hasLegend={false}          // Disable default chart legend, we use our custom one
          />
        ) : (
          // Render an empty placeholder View if there are no slices to draw
          // This maintains the layout structure.
          <View style={styles.emptyChartPlaceholder}>
             {/* You could optionally put text here like <Text style={styles.emptyText}>No counts yet</Text> */}
          </View>
        )}
      </View>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  emptyChartPlaceholder: {
    width: screenWidth / 2.2, // Match chart width
    height: 150,             // Match chart height
    // backgroundColor: 'rgba(255,0,0,0.1)', // Uncomment to debug placeholder visibility
  },
  container: {
    flexDirection: "row",    // Arrange legend and chart side-by-side
    alignItems: "center",    // Vertically align items in the center
    width: '100%',           // Take full width of parent
  },
  legendContainer: {
    width: '55%',            // Allocate slightly more than half width for legends
    paddingRight: 50,        // Space between legends and chart
    justifyContent: 'center',// Center legend items vertically if container is taller
    // backgroundColor: 'rgba(0,0,255,0.1)', // Uncomment to debug legend container visibility
  },
  chartContainer: {
    width: '45%',            // Allocate remaining width for the chart
    alignItems: "center",    // Center the chart horizontally within this container
    // backgroundColor: 'rgba(255,255,0,0.1)', // Uncomment to debug chart container visibility
  },
  legendItem: {
    flexDirection: "row",        // Arrange name and value side-by-side
    alignItems: "center",        // Align items vertically
    justifyContent: "space-between", // Push name to left, value to right
    marginBottom: 8,             // Space below each legend item
    paddingLeft: 15,          // Space on the left for the legend item
  },
  legendNameText: {
    color: "#31EE9A",            // White color for legend names (adjust if needed)
    fontSize: 12,
  },
  legendValueText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: 'right',          // Align value text to the right
    // Color is applied dynamically based on item.color in the component's return jsx
  },
  loadingContainer: {
    height: 150,               // Give fixed height during loading
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {            // For error messages or invalid data
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10
  },
  emptyText: {                 // Text style for loading/error/no data messages
    color: '#AAAAAA',
    fontSize: 12,
    textAlign: 'center'
  }
});

export default PieGraph;