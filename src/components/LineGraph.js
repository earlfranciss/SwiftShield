import React, { useState, useCallback } from "react";
import { View, Text, Dimensions, ActivityIndicator } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native"; 
import config from "../config/config"; 

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundColor: "#000",
  backgroundGradientFrom: "#000",
  backgroundGradientTo: "#000",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(58, 237, 151, ${opacity})`,
  propsForBackgroundLines: { stroke: "none" },
};

const LineGraph = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  
  useFocusEffect(
    useCallback(() => {
      const fetchThreatData = async () => {
        setLoading(true);
        try {
          console.log("Fetching updated data...");
          const response = await fetch(`${config.BASE_URL}/logs/weekly-threats`);
          
          if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
          }
          
          const data = await response.json();
          if (!data.labels || !data.data) {
            throw new Error("Invalid API response format");
          }

          console.log("Updated API Response:", data);

          setChartData({
            labels: data.labels, // ["Sun", "Mon", ..., "Sat"]
            datasets: [{ 
              data: data.data, 
              color: (opacity = 1) => `rgba(36, 176, 115, ${opacity})`, 
              strokeWidth: 2 
            }],
          });

          setError(null); // Clear errors if successful
        } catch (error) {
          console.error("Error fetching chart data:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchThreatData();
    }, []) 
  );

  return (
    <View>
      <Text style={{ textAlign: "left", fontSize: 12, marginLeft: 20, color: "#3AED97" }}>
        Weekly Threat Analysis:
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3AED97" />
      ) : error ? (
        <Text style={{ textAlign: "center", color: "red" }}>Error: {error}</Text>
      ) : chartData ? (
        <LineChart
          data={chartData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16, marginLeft: -30 }}
          withInnerLines={false}
          withVerticalLines={false}
          withHorizontalLabels={false}
          withVerticalLabels={true}
        />
      ) : (
        <Text style={{ textAlign: "center", color: "#3AED97" }}>No data available</Text>
      )}
    </View>
  );
};

export default LineGraph;
