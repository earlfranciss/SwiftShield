import React from "react";
import { FlatList, StyleSheet, View, Dimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import ListItem from "./ListItem";

const { height } = Dimensions.get("window");

const RecentActivityLogs = ({ logs }) => {
  const viewableItems = useSharedValue([]);

  const activityData = logs || [
    {
      id: "1",
      title: "Suspicious Link!",
      link: "www.malicious.link - SMS",
      time: "15 mins ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "2",
      title: "Safe Link Verified",
      link: "www.safe.link - Email",
      time: "30 mins ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "3",
      title: "Suspicious Link!",
      link: "www.malicious.link - Facebook",
      time: "1 hour ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "4",
      title: "Another Suspicious Link!",
      link: "www.example-malicious.link - SMS",
      time: "2 hours ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "5",
      title: "Safe Link Verified",
      link: "www.safe.link - WhatsApp",
      time: "3 hours ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "6",
      title: "Suspicious Link!",
      link: "www.phishing.link - Email",
      time: "5 hours ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "7",
      title: "Safe Link Verified",
      link: "www.validsite.com - Chrome",
      time: "7 hours ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "8",
      title: "Suspicious Link!",
      link: "www.malicious.link - Instagram",
      time: "10 hours ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "9",
      title: "Safe Link Verified",
      link: "www.safeplatform.net - SMS",
      time: "12 hours ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "10",
      title: "Suspicious Link!",
      link: "www.phishy-link.com - Email",
      time: "15 hours ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "11",
      title: "Suspicious Link!",
      link: "www.fake-news.com - WhatsApp",
      time: "16 hours ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "12",
      title: "Safe Link Verified",
      link: "www.securebanking.com - App",
      time: "18 hours ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "13",
      title: "Suspicious Link!",
      link: "www.maliciousapp.net - SMS",
      time: "20 hours ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "14",
      title: "Safe Link Verified",
      link: "www.safeplace.com - Chrome",
      time: "1 day ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "15",
      title: "Suspicious Link!",
      link: "www.phishing-attempt.com - Email",
      time: "1 day ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "16",
      title: "Suspicious Link!",
      link: "www.fake-app.net - WhatsApp",
      time: "1 day ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "17",
      title: "Safe Link Verified",
      link: "www.verifiedsite.org - App",
      time: "2 days ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "18",
      title: "Suspicious Link!",
      link: "www.scam-site.info - SMS",
      time: "2 days ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
    {
      id: "19",
      title: "Safe Link Verified",
      link: "www.secure-email.com - Email",
      time: "3 days ago",
      icon: require("../../../assets/images/safe-icon.png"),
    },
    {
      id: "20",
      title: "Suspicious Link!",
      link: "www.fake-website.link - Facebook",
      time: "4 days ago",
      icon: require("../../../assets/images/suspicious-icon.png"),
    },
  ];

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50, // Adjust percentage as needed
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={activityData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem item={item} viewableItems={viewableItems} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={2} // Render the first 2 items
        maxToRenderPerBatch={2} // Load 2 more as needed
        onViewableItemsChanged={({ viewableItems: vItems }) => {
          viewableItems.value = vItems.map((vItem) => vItem.item.id);
        }}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200, // Adjust this to limit visible height (approximately 2 cards)
    overflow: "hidden", // Hide the rest of the items
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default RecentActivityLogs;
