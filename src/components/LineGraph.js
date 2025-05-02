import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";
import config from "../config/config";

const screenWidth = Dimensions.get("window").width;
// --- Helper function to convert hex color to rgba ---
// (Needed because chart-kit requires color as a function)
const hexToRgba = (hex, opacity = 1) => {
  if (!hex || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    console.warn(`Invalid hex color: ${hex}, using grey.`);
    return `rgba(170, 170, 170, ${opacity})`;
  }
  let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(170, 170, 170, ${opacity})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
// --- End helper ---

const LineGraph = ({ data }) => {
  const colorScheme = useColorScheme(); // Gets 'light', 'dark', or null

  // State variables
  // const [chartData, setChartData] = useState(null); // Holds formatted data for the chart
  // const [loading, setLoading] = useState(false); // Tracks if data is being fetched
  // const [error, setError] = useState(null); // Stores error message if fetching fails

  const chartConfig = useMemo(() => {
    const isDarkMode = colorScheme === "dark";

    return {
      // Transparency settings (using opacity is more robust)
      backgroundGradientFrom: "#000000", // Base color (will be transparent)
      backgroundGradientTo: "#000000", // Base color (will be transparent)
      backgroundGradientFromOpacity: 0, // Make gradient start transparent
      backgroundGradientToOpacity: 0, // Make gradient end transparent
      backgroundColor: "transparent", // Make solid background transparent

      decimalPlaces: 0,
      // Dynamic colors based on the theme
      // Color for AXES/LABELS ONLY (line color comes from dataset)
      color: () => `rgba(0, 0, 0, 0)`, // Black for light mode

      // Color for LABELS (e.g., "Sat", "Sun")
      // Ignore opacity param, force alpha to 1 for solid grey
      labelColor: () => `rgba(58, 237, 151, 1)`, // Force solid green
      propsForBackgroundLines: { stroke: "none" },
      // Optional: Dot styling if needed
      // propsForDots: { r: "3", strokeWidth: "1", stroke: "#CCCCCC" }

      fillShadowGradientFromOpacity: 0, // Default might be non-zero
      fillShadowGradientToOpacity: 0, // Default might be non-zero
    };
  }, [colorScheme]);

  let processedChartData = null;
  let validationError = null; // Optional: track validation errors

  console.log(
    "<<< LineGraph [Props]: Received data prop: >>>",
    JSON.stringify(data, null, 2)
  );

  // Validate the incoming prop data structure
  const isDataValid =
    data &&
    Array.isArray(data.labels) &&
    Array.isArray(data.datasets) && // Check for datasets
    data.labels.length > 0 &&
    data.datasets.length > 0 &&
    data.datasets.every(
      // Checks EVERY item in datasets
      (ds) =>
        ds &&
        Array.isArray(ds.data) && // Does each item have a 'data' array?
        ds.data.length === data.labels.length && // Does length match labels?
        ds.color && // Does each item have a 'color'?
        ds.label // Does each item have a 'label'?
    );

  if (isDataValid) {
    try {
      // Format datasets for react-native-chart-kit
      const formattedChartDatasets = data.datasets.map((ds) => {
        // Log the color being processed
        console.log(
          `<<< LineGraph [Props]: Processing dataset '${ds.label}', color: ${ds.color} >>>`
        );

        // --- FIX: Ensure 'color' function is included in returned object ---
        return {
          // This is the object returned for each dataset
          data: ds.data.map((point) => {
            // Sanitize points
            const num = Number(point);
            return Number.isFinite(num) ? num : 0;
          }),
          color: () => hexToRgba(ds.color, 1), // <<< ADD THIS LINE BACK
          strokeWidth: 1, // Your chosen width (e.g., 4)
        };
        // --- END FIX ---
      }); // End of .map()

      processedChartData = {
        labels: data.labels.map((label) => String(label ?? "")), // Sanitize labels
        datasets: formattedChartDatasets, // Assign the correctly formatted array
      };
      // Log the final processed data
      console.log(
        "<<< LineGraph [Props]: Final processedChartData for rendering: >>>",
        JSON.stringify(processedChartData, null, 2)
      );
    } catch (processingError) {
      console.error(
        "LineGraph [Props]: Error processing prop data:",
        processingError
      );
      validationError = "Error processing chart data.";
    }
  } else {
    // ... (handle invalid data prop) ...
    if (data && (data.labels || data.datasets)) {
      validationError = "Invalid chart data structure received.";
    }
  }

  // --- Render the component ---
  return (
    // Use a container View. Apply styles if needed.
    <View style={styles.container}>
      {/* Conditional rendering based on processedChartData */}
      {console.log(
        "<<< LineGraph [Render]: Rendering chart with processed data:",
        processedChartData ? "Exists" : "null"
      )}

      {processedChartData ? (
        <LineChart
          data={processedChartData} // Use the processed data from props
          width={screenWidth * 0.95} // Adjust width as needed
          height={180} // Adjusted height
          chartConfig={chartConfig}
          bezier={false}
          style={styles.chartStyle}
          withInnerLines={false}
          withOuterLines={false}
          withHorizontalLabels={false} // Show X labels
          withVerticalLabels={true} // Hide Y labels
          fromZero={true}
          withDots={false}
        />
      ) : (
        // Show placeholder (consider showing specific error if validationError is set)
        <View style={styles.placeholderContainer}>
          <Text style={styles.noDataText}>
            {validationError // <<< This variable is set when isDataValid is false
              ? `Error: ${validationError}` // <<< THIS IS THE TEXT BEING DISPLAYED
              : "Waiting for chart data..."}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Add styles for the container if needed, e.g., alignment, padding
    // Example:
    alignItems: "center", // Center chart/indicator horizontally
    justifyContent: "center", // Center vertically if needed (depends on parent layout)
    minHeight: 200, // Ensure container has height even when loading/error
    // marginBottom: 10 // If spacing needed below this component
  },
  placeholderContainer: {
    // Added style for placeholder view
    height: 220, // Match chart height
    width: screenWidth - 40, // Match chart width (use same calculation as chart)
    alignItems: "center",
    justifyContent: "center",
    // borderWidth: 1, borderColor: 'grey' // Optional for debugging layout
  },
  indicator: {
    marginTop: 10, // Add some spacing for the loader
  },
  errorText: {
    textAlign: "center",
    color: "#FF4F4F", // Red color for errors
    padding: 20,
    fontSize: 14,
  },
  noDataText: {
    textAlign: "center",
    color: "#AAAAAA", // Grey color for no data message
    padding: 20,
    fontSize: 14,
  },
  chartStyle: {
    marginVertical: 5,
    borderRadius: 12, // Slightly rounded corners for the chart background
    // Adjust left margin if needed for alignment within parent
    marginLeft: -30, // Example if chart needs shifting left
  },
});

export default LineGraph;
