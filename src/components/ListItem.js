import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withTiming, } from "react-native-reanimated";

const ListItem = ({ item, viewableItems }) => {
  const rStyle = useAnimatedStyle(() => {
    const isVisible = viewableItems.value.includes(item.id);

    return {
      opacity: withTiming(isVisible ? 1 : 0, { duration: 500 }),
      transform: [
        { scale: withTiming(isVisible ? 1 : 0.8, { duration: 500 }) },
      ],
    };
  }, [viewableItems.value]); 

  return (
    <Animated.View style={[styles.card, rStyle]}>
      <View style={styles.leftSection}>
        <Image source={item.icon} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.link} numberOfLines={1}>{item.link}</Text>
        </View>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 10,
    backgroundColor: "rgba(58, 237, 151, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 10,
    paddingVertical: 10,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#0A0A0A",
    fontSize: 12,
    fontWeight: "bold",
  },
  link: {
    color: "#4A4A4A",
    fontSize: 11,
  },
  time: {
    color: "#D9D9D9",
    fontSize: 11,
    textAlign: "right",
    alignSelf: "center",
    width: 80,
  },
});

export default ListItem;
