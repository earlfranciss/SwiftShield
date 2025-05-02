import React from "react";
import { View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import TopBar from "./TopBar";

const GradientScreen = ({ children, topBar, isDarkMode }) => {
  return (
    <LinearGradient
      colors={isDarkMode ? ["#FFFFFF", "#66F3AF"] : ["#000000", "#24B073"]}
      start={{ x: 0.5, y: 0.5 }}
      end={{ x: 1.5, y: 1 }}
      style={{ flex: 1 }}
    >
      {topBar}
      <View style={{ flex: 1 }}>{children}</View>
    </LinearGradient>
  );
};

export default GradientScreen;
