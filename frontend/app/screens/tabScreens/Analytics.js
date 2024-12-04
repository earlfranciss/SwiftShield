import React from "react";
import { StyleSheet, SafeAreaView, Text, View } from "react-native";
import LineGraph from "../components/LineGraph";
import PieGraph from "../components/PieGraph";
import ThreatLevelCard from "../components/ThreatLevelCard";
import RecentActivityLogs from "../components/RecentActivityLogs"; // Make sure this is the correct path
import StatsText from "../components/StatsText";

const threatData = [
  {
    level: "Low",
    count: "9",
    borderColor: "#3AED97",
    textColor: "#3AED97",
    countColor: "#3AED97",
  },
  {
    level: "Medium",
    count: "5",
    borderColor: "#FFDE59",
    textColor: "#FFDE59",
    countColor: "#FFDE59",
  },
  {
    level: "High",
    count: "3",
    borderColor: "#FF914D",
    textColor: "#FF914D",
    countColor: "#FF914D",
  },
  {
    level: "Critical",
    count: "1",
    borderColor: "#FF4F4F",
    textColor: "#FF4F4F",
    countColor: "#FF4F4F",
  },
];

const statsData = [
  { label: "URLs Scanned", value: "21" },
  { label: "Threats Blocked", value: "9" },
];

export default function Analytics() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Line Graph */}
      <View style={styles.graphContainer}>
        <LineGraph />
      </View>

      {/* Pie Chart */}
      <View style={styles.graphContainer}>
        <PieGraph />
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <StatsText stats={statsData} />
      </View>

      {/* Threat Level Breakdown */}
      <View style={styles.card}>
        <ThreatLevelCard data={threatData} />
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivityContainer}>
        <Text style={styles.recentActivityTitle}>Recent Activity:</Text>
        <RecentActivityLogs />
      </View>
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
    marginBottom: 60,
    marginHorizontal: 20,
  },
});
