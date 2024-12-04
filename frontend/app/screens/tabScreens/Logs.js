import React, { useState } from "react";
import {
  StyleSheet,
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons"; // Assuming you're using Material Icons
import CarouselFilter from "../components/CarouselFilter"; // Import your custom CarouselFilter component

export default function Logs() {
  const [url, setUrl] = useState("");
  const [activeFilter, setActiveFilter] = useState("recent");

  const handleScan = () => {
    console.log("Scanning URL:", url);
    // Add your URL scanning logic here
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    console.log("Active Filter:", filter);
    // Add your filtering logic here
  };

  const listItems = [
    {
      id: 1,
      url: "www.malicious.link - SMS",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 2,
      url: "www.safe.link - Email",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black", // Apply black tint color to safe icon
    },
    {
      id: 3,
      url: "www.safe.link - Facebook",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black", // Apply black tint color to safe icon
    },
    {
      id: 4,
      url: "www.malicious.link - Facebook",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 5,
      url: "www.malicious.link - SMS",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 6,
      url: "www.safe.link - Twitter",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 7,
      url: "www.malicious.link - SMS",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 8,
      url: "www.safe.link - Instagram",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 9,
      url: "www.safe.link - Email",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 10,
      url: "www.malicious.link - Twitter",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 11,
      url: "www.malicious.link - SMS",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 12,
      url: "www.safe.link - Facebook",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 13,
      url: "www.malicious.link - Instagram",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 14,
      url: "www.safe.link - LinkedIn",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 15,
      url: "www.malicious.link - Email",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 16,
      url: "www.safe.link - Facebook",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 17,
      url: "www.malicious.link - Facebook",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 18,
      url: "www.safe.link - WhatsApp",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 19,
      url: "www.malicious.link - WhatsApp",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 20,
      url: "www.safe.link - Email",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 21,
      url: "www.malicious.link - Email",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 22,
      url: "www.safe.link - SMS",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 23,
      url: "www.malicious.link - Facebook",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 24,
      url: "www.safe.link - Twitter",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 25,
      url: "www.malicious.link - LinkedIn",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 26,
      url: "www.safe.link - Instagram",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 27,
      url: "www.malicious.link - Instagram",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 28,
      url: "www.safe.link - LinkedIn",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 29,
      url: "www.malicious.link - LinkedIn",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 30,
      url: "www.safe.link - WhatsApp",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 31,
      url: "www.malicious.link - SMS",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 32,
      url: "www.safe.link - Email",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 33,
      url: "www.malicious.link - SMS",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 34,
      url: "www.safe.link - SMS",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 35,
      url: "www.malicious.link - Email",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 36,
      url: "www.safe.link - Twitter",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 37,
      url: "www.malicious.link - Facebook",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 38,
      url: "www.safe.link - LinkedIn",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
    {
      id: 39,
      url: "www.malicious.link - Instagram",
      image: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: 40,
      url: "www.safe.link - WhatsApp",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Section */}
      <View>
        <Text style={styles.text}>Search:</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="www.malicious.link"
            placeholderTextColor="#6c757d"
            onChangeText={(text) => setUrl(text)}
            value={url}
          />
          <TouchableOpacity onPress={handleScan} style={styles.iconWrapper}>
            <Icon name="search" size={24} color="#585757" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Section */}
      <CarouselFilter onFilterChange={handleFilterChange} />

      {/* List Items Section (Vertical Layout) */}
      <ScrollView style={styles.listContainer}>
        {listItems.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Image
              source={item.image}
              style={[
                styles.image,
                item.tintColor && { tintColor: item.tintColor },
              ]} // Apply tint color dynamically
            />
            <Text style={styles.listItemText}>{item.url}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Placeholder for filtered content */}
      <View style={styles.contentPlaceholder}>
        <Icon name="filter-list" size={50} color="#31EE9A" />
        <Text style={styles.filterText}>
          Showing results for:{" "}
          {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginHorizontal: 20,
  },
  text: {
    color: "#31EE9A",
    fontSize: 12,
    fontStyle: "regular",
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  textInput: {
    fontSize: 14,
    height: 45,
    borderRadius: 12,
    color: "#000000",
    backgroundColor: "#3AED97",
    paddingRight: 45,
    paddingLeft: 15,
  },
  iconWrapper: {
    position: "absolute",
    right: 15,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  contentPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 10,
  },
  listContainer: {
    marginVertical: 10,
  },
  listItem: {
    backgroundColor: "#3AED97", // 80% opacity background color
    borderRadius: 12,
    marginVertical: 5, // Add space between items
    alignItems: "center",
    padding: 10,
    flexDirection: "row", // Arrange image and text horizontally
  },
  image: {
    width: 24,
    height: 24,
    borderRadius: 8,
    marginRight: 10, // Space between image and text
  },
  listItemText: {
    color: "#585757",
    fontSize: 12,
  },
});
