import { StyleSheet, SafeAreaView, Text, View } from "react-native";
import LineGraph from "../components/LineGraph";
import PieGraph from "../components/PieGraph";
import ThreatLevelCard from "../components/ThreatLevelCard";
import RecentActivityLogs from "../components/RecentActivityLogs";
import StatsText from "../components/StatsText";

const threatData = [
  {
    level: "Low",
    count: "9",
    borderColor: "#3AED97", // Border color
    textColor: "#3AED97", // Text color for Low
    countColor: "#3AED97", // Number color for Low
  },
  {
    level: "Medium",
    count: "5",
    borderColor: "#FFDE59",
    textColor: "#FFDE59", // Text color for Medium
    countColor: "#FFDE59", // Number color for Medium
  },
  {
    level: "High",
    count: "3",
    borderColor: "#FF914D",
    textColor: "#FF914D", // Text color for High
    countColor: "#FF914D", // Number color for High
  },
  {
    level: "Critical",
    count: "1",
    borderColor: "#FF4F4F",
    textColor: "#FF4F4F", // Text color for Critical
    countColor: "#FF4F4F", // Number color for Critical
  },
];

const statsData = [
  { label: "URLs Scanned", value: "21" },
  { label: "Threats Blocked", value: "9" },
];

const logs = [
  {
    title: "Suspicious Link!",
    link: "www.malicious.link - SMS",
    time: "15 mins ago",
    color: "#FF4F4F",
  },
  {
    title: "Safe Link Verified",
    link: "www.safe.link - Email",
    time: "30 mins ago",
    color: "#3AED97",
  },
  {
    title: "Suspicious Link!",
    link: "www.malicious.link - Facebook",
    time: "1 hour ago",
    color: "#FF4F4F",
  },
];

export default function Analytics() {
  return (
    <SafeAreaView>
      {/* Line Graph */}
      <View style={styles.graphContainer}>
        <LineGraph />
      </View>

      {/* Pie Chart */}
      <View style={styles.graphContainer}>
        <PieGraph />
      </View>

      {/* Additional Statistics */}
      <View style={styles.statsContainer}>
        {/* URLs Scanned and Threats Blocked */}
        <StatsText stats={statsData} />
      </View>

      {/* Threat Level Breakdown */}
      <View style={styles.card}>
        {/* Threat Levels */}
        <ThreatLevelCard data={threatData} />
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <Text style={styles.recentActivityTitle}>Recent Activity:</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // Match background
    padding: 20,
  },
  card: {
    marginVertical: 0,
    marginHorizontal: 40,
  },
  statsContainer: {
    marginVertical: 2,
    marginHorizontal: 20,
  },
  recentActivity: {
    marginTop: 5,
  },
  recentActivityTitle: {
    color: "#3AED97",
    fontSize: 12,
    fontWeight: "regular",
    marginBottom: 10,
    marginLeft: 40,
  },
});
