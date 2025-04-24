// frontend/app/screens/components/RecentActivityLogs.js
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
// Keep LinearGradient ONLY if you intend to use a gradient later.
// For a solid color, a simple View is more efficient.
// import { LinearGradient } from "expo-linear-gradient";

// --- Use your existing icon map ---
const iconMap = {
  "suspicious-icon": require("../../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../../assets/images/safe-icon.png"),
};
// Make sure you have a 'safe-shield-icon.png' or similar, or update the path/name.

const RecentActivityLogs = ({ logItem }) => {
  // --- Helper function to format URL for display (remove scheme) ---
  const formatUrlForDisplay = (urlToFormat) => {
    if (!urlToFormat || typeof urlToFormat !== "string") {
      return ""; // Return empty string or a placeholder if URL is invalid/missing
    }
    // Remove http:// or https:// from the beginning
    return urlToFormat.replace(/^https?:\/\//, "");
  };
  // --- End helper function ---

  // --- Prepare display data ---
  const displayTitle = logItem?.title || "Log Event";
  const displayTime = logItem?.time || "";
  const iconSource =
    iconMap[logItem?.icon || "safe-icon"] || iconMap["safe-icon"];

  // --- Format the link string for display ---
  let displayLink = logItem?.link || "Unknown Link"; // Default to original link
  const linkString = logItem?.link;

  if (linkString && typeof linkString === "string") {
    const parts = linkString.split(" - "); // Split "URL - Source"
    const urlPart = parts[0]; // Get the URL part (might have scheme)
    const sourcePart = parts.length > 1 ? parts.slice(1).join(" - ") : ""; // Get the source part (handle cases with " - " in source)

    const schemeLessUrl = formatUrlForDisplay(urlPart); // Remove scheme

    // Reconstruct the link for display, ensuring source part is included if it exists
    displayLink = schemeLessUrl + (sourcePart ? ` - ${sourcePart}` : "");
  }
  // --- End link formatting ---

  return (
    // Using a View with solid background color matching the image
    <View style={styles.logContainer}>
      <Image source={iconSource} style={[styles.icon]} resizeMode="contain" />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>
        {/* Display the link string (which already contains URL - Source) */}
        <Text style={styles.subtitle} numberOfLines={1}>
          {displayLink}
        </Text>
      </View>
      {/* Display the time string */}
      <Text style={styles.time}>{displayTime}</Text>
    </View>
  );
};

// --- Styles to match the target UI image ---
const styles = StyleSheet.create({
  logContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12, // More rounded corners
    backgroundColor: "#2aaa6d", // Solid green background color
    paddingVertical: 12, // Adjust vertical padding
    paddingHorizontal: 15, // Horizontal padding
    elevation: 1, // Subtle shadow on Android
    // iOS shadow (optional)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  icon: {
    width: 28, // Adjust icon size
    height: 28,
    marginRight: 12, // Space between icon and text
    // tintColor might be needed depending on your icon assets
    // tintColor: '#000000', // Example: Make icons black if they are template images
  },
  textContainer: {
    flex: 1, // Allows this container to push the time to the right
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000", // Black text for title
    marginBottom: 2, // Small space below title
  },
  subtitle: {
    // Contains "URL - Source"
    fontSize: 12,
    color: "#4A4A4A", // Dark grey for subtitle
  },
  time: {
    fontSize: 11, // Smaller font size for time
    color: "#4A4A4A", // Faded black/grey for time
    marginLeft: 8, // Space between text container and time
  },
});

export default RecentActivityLogs;
