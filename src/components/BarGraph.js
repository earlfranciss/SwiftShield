// src/components/BarGraph.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../components/themeContext";

// Default maximum height for the bars in pixels
const CHART_MAX_HEIGHT = 150;
// Fixed width for each bar
const BAR_WIDTH = 50;
// Space between bars
const BAR_MARGIN = 35;
const AXIS_LINE_COLOR = "#FFFFFF"; // Color for both X and Y axis lines
const AXIS_LINE_WIDTH = 1;

const BarGraph = ({ data }) => {
  const { theme } = useTheme();

  // <<< 4. DETERMINE Axis color based on theme >>>
  const axisColor = theme === "dark" ? "#FFFFFF" : "#000000"; // White for dark, Black for light
  // Handle empty or invalid data gracefully
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No severity data available.</Text>
      </View>
    );
  }

  // Find the maximum value in the dataset to scale the bars
  const maxValue = data.reduce((max, item) => Math.max(max, item.value), 0);

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        <View
          style={[
            styles.yAxisLine,
            {
              height: CHART_MAX_HEIGHT, // Make it the full height of the chart area
              backgroundColor: axisColor,
              width: AXIS_LINE_WIDTH,
            },
          ]}
        />
        {data.map((item, index) => {
          // Calculate bar height proportionally, handle maxValue = 0 case
          const barHeight =
            maxValue > 0 ? (item.value / maxValue) * CHART_MAX_HEIGHT : 0;

          // Ensure minimum visible height for non-zero values if desired,
          // otherwise, 0 value gives 0 height. Let's keep it proportional for now.
          // const displayHeight = Math.max(barHeight, item.value > 0 ? 1 : 0); // Example minimum height

          return (
            // Wrapper for each bar and its label
            <View key={item.label || index} style={styles.barWrapper}>
              {/* The actual bar */}
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight, // Use calculated height
                    backgroundColor: item.color || "#CCCCCC", // Use color from data or default
                    width: BAR_WIDTH, // Use fixed width
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View
        style={[
          styles.xAxisLine,
          {
            backgroundColor: axisColor,
            height: AXIS_LINE_WIDTH, // Use consistent line width
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Aligns the chart content (bars container)
    alignItems: "center",
    // paddingVertical: 10, // Add padding if needed around the chart
  },
  barsContainer: {
    flexDirection: "row", // Arrange bars horizontally
    alignItems: "flex-end", // Align bars to the bottom
    height: CHART_MAX_HEIGHT, // Set a fixed height for the container to allow alignment
    justifyContent: "center", // Center bars horizontally
    // Add some horizontal padding if bars might overflow slightly with margins
    // paddingHorizontal: 10,
  },
  barWrapper: {
    alignItems: "center", // Center the label below the bar
    marginHorizontal: BAR_MARGIN / 2, // Apply half margin on each side for spacing
  },
  bar: {
    // Bar appearance
    // width is set dynamically
    // height is set dynamically
    // backgroundColor is set dynamically
    // borderRadius: 4, // Slightly rounded top corners
  },
  label: {
    marginTop: 8, // Space between bar and label
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    // Color is set dynamically based on item.color
  },
  noDataText: {
    color: "#AAAAAA",
    textAlign: "center",
    padding: 20,
  },
  xAxisLine: {
    // height is dynamic
    // backgroundColor is dynamic
    alignSelf: "stretch", // Span width
  },
  // --- Style for the Y-Axis Line ---
  yAxisLine: {
    position: "absolute",
    left: 1, // Position at the very left of the barsContainer
    bottom: 0, // Align with the bottom
    // height is dynamic
    // backgroundColor is dynamic
    // width is dynamic
  },
});

export default BarGraph;
