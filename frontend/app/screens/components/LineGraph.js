import React, { useState, useCallback } from "react";
import { View, Text, Dimensions, ActivityIndicator, StyleSheet } from "react-native"; // Added StyleSheet
import { LineChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";
import config from "../../config"; // Make sure this path is correct

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundColor: "#000",
  backgroundGradientFrom: "#000",
  backgroundGradientTo: "#000",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(58, 237, 151, ${opacity})`,
  propsForBackgroundLines: { stroke: "none" },
};

const LineGraph = () => {
  // State variables
  const [chartData, setChartData] = useState(null); // Holds formatted data for the chart
  const [loading, setLoading] = useState(false);   // Tracks if data is being fetched
  const [error, setError] = useState(null);       // Stores error message if fetching fails

  // useFocusEffect runs the fetch logic when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Define the asynchronous function to fetch data
      const fetchThreatData = async () => {
        setLoading(true);     // Indicate loading started
        setError(null);       // Clear any previous errors
        setChartData(null);   // Clear previous chart data to avoid showing stale info

        try {
          console.log("LineGraph: Fetching updated data from /weekly-threats...");
          const response = await fetch(`${config.BASE_URL}/weekly-threats`); // Fetch from backend

          // Check for network/HTTP errors (e.g., 404, 500)
          if (!response.ok) {
            throw new Error(`HTTP Error fetching weekly threats: ${response.status}`);
          }

          // Parse the JSON response from the backend
          const data = await response.json();
          console.log("LineGraph: Raw API Response:", JSON.stringify(data)); // Log raw data

          // --- Data Validation & Sanitization ---
          let sanitizedLabels = [];
          let sanitizedDataPoints = [];
          let isValidDataStructure = false; // Flag to track if data is usable

          // Check if the basic structure (labels/data arrays of same length) is correct
          if (
            data &&
            Array.isArray(data.labels) &&
            Array.isArray(data.data) &&
            data.labels.length === data.data.length
          ) {
            // If structure is okay, proceed with sanitizing
            isValidDataStructure = true;

            // Ensure all labels are strings (important for the chart library)
            sanitizedLabels = data.labels.map(label => String(label ?? '')); // Use String() and handle potential null/undefined labels

            // Ensure all data points are valid finite numbers (not NaN, Infinity, null, etc.)
            // Replace any invalid points with 0 to prevent chart errors
            sanitizedDataPoints = data.data.map(point => {
              const num = Number(point); // Attempt conversion to number
              return Number.isFinite(num) ? num : 0; // Use 0 if not a valid finite number
            });

            console.log("LineGraph: Sanitized Labels:", sanitizedLabels);
            console.log("LineGraph: Sanitized Data Points:", sanitizedDataPoints);

          } else {
            // If the structure from the API is invalid or inconsistent
            console.error("LineGraph: Invalid or mismatched data structure received:", data);
            // Option 1: Throw an error to show error message
            throw new Error("Received invalid data structure for chart.");
            // Option 2: Silently fail and show "No data available" (by leaving isValidDataStructure = false)
          }
          // --- End Data Validation & Sanitization ---

          // Only update the chart state if the data was valid and sanitized
          if (isValidDataStructure) {
            setChartData({
              labels: sanitizedLabels, // Use the validated/sanitized labels
              datasets: [
                {
                  data: sanitizedDataPoints, // Use the validated/sanitized data points
                  color: (opacity = 1) => `rgba(58, 237, 151, ${opacity})`, // Line color
                  strokeWidth: 3 // Thickness of the line
                }
              ],
              // legend: ["Weekly Threats"] // Optional: Add a legend
            });
          } else {
            // If data structure was bad, ensure chartData remains null
            // This will trigger the "No data available" text in the return statement
            setChartData(null);
          }

        } catch (err) { // Catch any error from try block (fetch, parse, validation)
          console.error("LineGraph: Error fetching or processing chart data:", err);
          setError(err.message); // Set the error message state
          setChartData(null); // Ensure no chart is shown on error
        } finally {
          // This runs regardless of success or error
          setLoading(false); // Indicate loading finished
        }
      };

      fetchThreatData(); // Call the fetch function when the effect runs

      // Return a cleanup function (optional, useful if you needed to cancel fetches)
      // return () => { console.log("LineGraph: Cleaning up effect"); };

    }, []) // Empty dependency array means the fetchThreatData callback is memoized and doesn't re-run unnecessarily
  );

  // --- Render the component ---
  return (
    // Use a container View. Apply styles if needed.
    <View style={styles.container}>
      {/* Conditional rendering based on state */}
      {loading ? (
        // Show loading indicator while fetching
        <ActivityIndicator style={styles.indicator} size="large" color="#3AED97" />
      ) : error ? (
        // Show error message if fetch failed (ensure wrapped in Text!)
        <Text style={styles.errorText}>Error: {error}</Text>
      ) : chartData ? (
        // Render the LineChart if data is successfully fetched and processed
        <LineChart
          data={chartData}
          width={screenWidth * 0.95} // Make chart slightly less than full width for padding
          height={180}
          chartConfig={chartConfig}
          bezier // Makes the line smooth
          style={styles.chartStyle} // Apply styles for margin, etc.
          // Chart-specific props for appearance:
          withInnerLines={false}      // Hide horizontal grid lines inside chart area
          withOuterLines={false}      // Hide lines framing the chart
          withVerticalLines={false}   // Hide vertical grid lines
          withHorizontalLabels={false} // Show labels below chart (e.g., Fri, Sat)
          withVerticalLabels={true}   // Show labels on the Y-axis (counts)
          fromZero={true}           // Ensure Y-axis starts at 0
          // yAxisInterval={1} // Optional: Control spacing of Y-axis labels
          // formatYLabel={(y) => Math.round(y)} // Optional: Format Y-axis labels (e.g., round numbers)
          // segments={4} // Optional: Suggest number of horizontal lines/labels on Y-axis
        />
      ) : (
        // Show "No data" message if not loading, no error, but no data available (initial or after validation fail)
        <Text style={styles.noDataText}>No weekly threat data available</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Add styles for the container if needed, e.g., alignment, padding
    // Example:
     alignItems: 'center', // Center chart/indicator horizontally
     justifyContent: 'center', // Center vertically if needed (depends on parent layout)
     minHeight: 230, // Ensure container has height even when loading/error
     // marginBottom: 10 // If spacing needed below this component
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
    marginLeft: -30 // Example if chart needs shifting left
  },
});

export default LineGraph;
