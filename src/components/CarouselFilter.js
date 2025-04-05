import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CarouselFilter = ({ filters, onFilterChange }) => {
  const [selectedFilter, setSelectedFilter] = useState(filters[0]?.id || "recent");

  const handleFilterPress = (filterId) => {
    setSelectedFilter(filterId);
    onFilterChange(filterId);
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
            style={[styles.card, item.id === selectedFilter && styles.selectedCard]}
            onPress={() => handleFilterPress(item.id)}
          >
            <Text style={[styles.label, item.id === selectedFilter && styles.selectedLabel]}>
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
  container: { marginVertical: 5 },
  listContent: { paddingHorizontal: 10 },
  card: {
    backgroundColor: "rgba(58, 237, 151, 0.8)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginHorizontal: 5,
    borderColor: "transparent",
    borderWidth: 2,
  },
  selectedCard: {
    borderColor: "#34d399",
    backgroundColor: "#34d3991a",
  },
  label: { color: "#030303", fontSize: 12, textAlign: "center" },
  selectedLabel: { color: "#34d399", fontWeight: "bold" },
});

export default CarouselFilter;
