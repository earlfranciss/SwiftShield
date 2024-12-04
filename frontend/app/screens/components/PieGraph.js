import { View, Text, Dimensions } from "react-native";
import { PieChart } from "react-native-chart-kit";

const PieGraph = () => {
  const data = [
    {
      name: "Text Message",
      population: 8,
      color: "#ffde59",
      numberColor: "#ffde59", // Number color for Text Message
    },
    {
      name: "Email",
      population: 20,
      color: "#ffbd59",
      numberColor: "#ffbd59", // Number color for Email
    },
    {
      name: "Facebook",
      population: 14,
      color: "#ff914d",
      numberColor: "#ff914d", // Number color for Facebook
    },
  ];

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {/* Legends with Spacing */}
      <View style={{ flex: 1, paddingLeft: 10 }}>
        <Text
          style={{
            color: "#3AED97",
            fontSize: 12,
            marginBottom: 10,
            marginLeft: 29,
          }}
        >
          Threats by Source
        </Text>
        {data.map((item, index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between", // Space between legend name and number
              marginBottom: 5,
            }}
          >
            {/* Legend Name */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: "#3AED97", fontSize: 12, marginLeft: 30 }}>
                {item.name}
              </Text>
            </View>

            {/* Legend Number */}
            <Text
              style={{
                color: item.numberColor,
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              {item.population}
            </Text>
          </View>
        ))}
      </View>

      {/* Pie Chart */}
      <View style={{ flex: 1, alignItems: "center", marginLeft: 60 }}>
        <PieChart
          data={data.map((item) => ({
            name: item.name,
            population: item.population,
            color: item.color,
            legendFontColor: "#fff",
            legendFontSize: 12,
          }))}
          width={Dimensions.get("window").width / 2}
          height={150}
          chartConfig={{
            backgroundColor: "#000",
            backgroundGradientFrom: "#000",
            backgroundGradientTo: "#000",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          hasLegend={false} // Custom legend handled on the left
        />
      </View>
    </View>
  );
};

export default PieGraph;
