import React from "react";
import { View, Text, StyleSheet } from "react-native";

const StatsText = ({ stats }) => {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        {stats.map((item, index) => (
          <Text key={index} style={styles.statsText}>
            {item.label}:{" "}
            <Text style={styles.highlightedText}>{item.value}</Text>
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between", // Space between left and right
    alignItems: "center", // Align items vertically in the middle
  },
  statsText: {
    color: "#3AED97",
    fontSize: 12,
    fontWeight: "regular",
  },
  highlightedText: {
    color: "#3AED97",
    fontSize: 14,
    fontWeight: "semi-bold",
  },
});

export default StatsText;
