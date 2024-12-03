import React from "react";
import { View, Text, StyleSheet } from "react-native";

const RecentActivityLogs = ({ logs }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent Activity:</Text>
      {logs.map((log, index) => (
        <View
          key={index}
          style={[styles.logItem, { backgroundColor: log.color }]}
        >
          <Text style={styles.logTitle}>{log.title}</Text>
          <Text style={styles.logLink}>{log.link}</Text>
          <Text style={styles.logTime}>{log.time}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    marginTop: 15,
  },
  header: {
    color: "#3AED97",
    fontSize: 14,
    marginBottom: 10,
  },
  logItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  logTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  logLink: {
    color: "#fff",
    fontSize: 12,
  },
  logTime: {
    color: "#ccc",
    fontSize: 10,
    marginTop: 5,
  },
});

export default RecentActivityLogs;
