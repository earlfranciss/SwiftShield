import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import LinearGradient from 'react-native-linear-gradient';

const iconMap = {
  "suspicious-icon": require("../assets/images/suspicious-icon.png"),
  "safe-icon": require("../assets/images/safe-icon.png"),
};

const RecentActivityLogs = ({ logItem }) => {
  return (
    <LinearGradient colors={["#2dbd78", "#2dbd78"]} style={styles.logContainer}>
      <Image source={iconMap[logItem.icon]} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{logItem.title}</Text>
        <Text style={styles.subtitle}>{logItem.link}</Text>
      </View>
      <Text style={styles.time}>{logItem.time}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  logContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 20,
    marginBottom: 5,
    height: 55,
    
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    marginVertical: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold", // Ensures the title is bold
    color: "#000",
  },
  subtitle: {
    fontSize: 12,
    color: "#000",
  },
  time: {
    fontSize: 12,
    color: "#6c757d",
  },
});

export default RecentActivityLogs;
