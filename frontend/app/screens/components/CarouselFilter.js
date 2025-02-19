import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

const filters = [
  { id: "recent", label: "Recent" },
  { id: "whitelisted", label: "Whitelisted" },
  { id: "blacklisted", label: "Blacklisted" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "critical", label: "Critical" },
];

const CarouselFilter = ({ onFilterChange }) => {
  const [selectedFilter, setSelectedFilter] = useState("recent");

  const handleFilterPress = (filterId) => {
    setSelectedFilter(filterId);
    onFilterChange(filterId); // Notify parent component of the filter change
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              item.id === selectedFilter && styles.selectedCard,
            ]}
            onPress={() => handleFilterPress(item.id)}
          >
            <Text
              style={[
                styles.label,
                item.id === selectedFilter && styles.selectedLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 1,
  },
  listContent: {
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: "rgba(58, 237, 151, 0.8)", // This is the same color with 80% opacity
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginHorizontal: 5,
    borderColor: "transparent",
    borderWidth: 2,
  },
  selectedCard: {
    borderColor: "#34d399", // Highlight color for selected filter
    backgroundColor: "#34d3991a", // Light shade for selected
  },
  label: {
    color: "#030303",
    fontSize: 12,
    textAlign: "center",
  },
  selectedLabel: {
    color: "#34d399",
    fontWeight: "bold",
  },
});

export default CarouselFilter;
