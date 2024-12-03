import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ThreatLevelCard = ({ data }) => {
  return (
    <View style={styles.container}>
      {data.map((item, index) => (
        <View
          key={index}
          style={[
            styles.card,
            {
              borderColor: item.borderColor, // Border color based on data
            },
          ]}
        >
          <Text style={[styles.levelText, { color: item.textColor }]}>
            {item.level}
          </Text>
          <Text style={[styles.countText, { color: item.countColor }]}>
            {item.count}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  card: {
    borderWidth: 2, // Border width
    borderRadius: 10, // Rounded corners
    padding: 10,
    width: "22%", // Adjust width as needed
    alignItems: "center", // Centering text
    justifyContent: "center", // Centering content vertically
    backgroundColor: "transparent", // No background color
  },
  levelText: {
    fontSize: 12,
    fontWeight: "bold",
    textAlignVertical: "center",
    lineHeight: 12,
  },
  countText: {
    fontSize: 32,
    fontWeight: "bold",
    textAlignVertical: "center",
    lineHeight: 35,
  },
});

export default ThreatLevelCard;
