/*import React, { Component } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

class ReportItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isExpanded: false
    };
  }

  toggleDropdown = () => {
    this.setState(prevState => ({
      isExpanded: !prevState.isExpanded
    }));
  }

  getCardBackgroundColor = (status) => {
    if (!status) return "#3AED97"; // Default green
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === "pending") return "#FFFF00"; // Yellow
    if (statusLower === "in progress") return "#FFA500"; // Orange
    
    return "#3AED97"; // Green for Resolved or other statuses
  };

  render() {
    const { item, navigation, refreshReports, isDarkMode, onToggleDarkMode } = this.props;
    const { isExpanded } = this.state;
    
    const formattedDate = new Date(item.created_at).toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const cardBackgroundColor = this.getCardBackgroundColor(item.status);

    return (
      <View style={styles.itemContainer}>
        {/* Report Card }
        <TouchableOpacity onPress={this.toggleDropdown}>
          <View style={[styles.reportCard, { backgroundColor: cardBackgroundColor }]}>
            <View>
              <Text style={styles.reportTitle}>{item.title}</Text>
              <Text style={styles.reportStatus}>{item.status}</Text>
            </View>
            <Text style={styles.reportDate}>{formattedDate}</Text>
          </View>
        </TouchableOpacity>

        {/* Dropdown - Only shown when isExpanded is true }
        {isExpanded && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                this.setState({ isExpanded: false });
                navigation.navigate("EditReport", {
                  report: item,
                  refreshReports: refreshReports,
                  isDarkMode: isDarkMode,
                  onToggleDarkMode: onToggleDarkMode
                });
                // Log the report object for debugging
                console.log("Navigating to edit with report:", item);
              }}
            >
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownText}>Edit Report</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  itemContainer: {
    marginBottom: 8,
  },
  reportCard: {
    backgroundColor: "#3AED97",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  dropdown: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 15,
    marginBottom: 10,
    marginTop: 5,
  },
  dropdownItem: {
    paddingVertical: 1,
  },
  dropdownContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  dropdownText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "bold",
  },
});

export default ReportItem;*/