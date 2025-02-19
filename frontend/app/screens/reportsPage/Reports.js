import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import GradientScreen from "../components/GradientScreen";

const reports = [
  { id: "1", title: "Change Password issue", status: "Pending", date: "5 days ago" },
  { id: "2", title: "Account locked", status: "Done", date: "1 week ago" },
];

export default function Reports({ navigation, route }) {
  const { isDarkMode = false, onToggleDarkMode = () => {} } = route.params || {};

  const renderReportCard = ({ item }) => (
    <View style={styles.reportCard}>
      <View>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportStatus}>{item.status}</Text>
      </View>
      <Text style={styles.reportDate}>{item.date}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <GradientScreen
        onToggleDarkMode={onToggleDarkMode}
        isDarkMode={isDarkMode}
      >
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialIcons
                name="keyboard-arrow-left"
                size={28}
                color="#3AED97"
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Reports</Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateReport", {
                  isDarkMode: isDarkMode,
                  onToggleDarkMode: onToggleDarkMode,
                })
              }
            >
              <MaterialIcons name="add" size={28} color="#3AED97" />
            </TouchableOpacity>
          </View>

          {/* Recent Reports Section */}
          <Text style={styles.sectionTitle}>Recent Reports</Text>

          {/* Report Cards List */}
          <FlatList
            data={reports}
            renderItem={renderReportCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.reportList}
          />
        </View>
      </GradientScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    color: "#3AED97",
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#3AED97",
    fontSize: 16,
    marginBottom: 10,
  },
  reportList: {
    paddingBottom: 20,
  },
  reportCard: {
    backgroundColor: "#3AED97",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  reportStatus: {
    fontSize: 14,
    color: "#000000",
    opacity: 0.8,
  },
  reportDate: {
    fontSize: 14,
    color: "#000000",
  },
});
