import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

// Data for the LineChart
const data = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], // Horizontal labels
  datasets: [
    {
      data: [
        Math.random() * 100, // Mon data
        Math.random() * 100, // Tue data
        Math.random() * 100, // Wed data
        Math.random() * 100, // Thu data
        Math.random() * 100, // Fri data
        Math.random() * 100, // Sat data
        Math.random() * 100, // Sun data
      ],
      color: (opacity = 1) => `rgba(36, 176, 115, ${opacity})`, // Line color (#24B073)
      strokeWidth: 2, // Optional stroke width
    },
  ],
};

// Chart configuration
const chartConfig = {
  backgroundColor: "#000", // Background color
  backgroundGradientFrom: "#000", // Start gradient (black)
  backgroundGradientTo: "#000", // End gradient (black)
  decimalPlaces: 0, // No decimal places
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Data point color
  labelColor: (opacity = 1) => `rgba(58, 237, 151, ${opacity})`, // Horizontal labels color
  propsForBackgroundLines: {
    stroke: "none", // Removes gridlines
  },
};

const LineGraph = () => {
  return (
    <View>
      <Text
        style={{
          textAlign: "left",
          fontSize: 12,
          marginLeft: 30,
          color: "#3AED97",
        }}
      >
        Weekly Threat Analysis:
      </Text>
      <LineChart
        data={data}
        width={screenWidth} // Chart width
        height={220} // Chart height
        chartConfig={chartConfig} // Chart configuration
        bezier // Smooth line
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withInnerLines={false} // Removes inner gridlines
        withVerticalLines={false} // Removes vertical gridlines
        withHorizontalLabels={false} // Hide y-axis labels
        withVerticalLabels={true} // Show Mon to Sun
      />
    </View>
  );
};

export default LineGraph;
