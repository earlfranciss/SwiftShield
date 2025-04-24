// WebViewScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Alert,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  // Make sure Clipboard is imported correctly for your setup
  // If using Expo Managed: import * as Clipboard from 'expo-clipboard';
  // If using Bare RN: import Clipboard from '@react-native-clipboard/clipboard';
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import WarningModal from "../components/WarningModal"; // <-- ADJUST PATH if needed
import * as Clipboard from "expo-clipboard";
import SimpleToast from "./SimpleToast"; // <-- IMPORT YOUR CUSTOM TOAST

const CopyIcon = require("../../../assets/images/Copy Icon.png");

// --- Reusable Messenger Header Component ---
// No changes needed in the header component itself
const MessengerHeader = ({
  title,
  subtitle,
  onBackPress,
  onMorePress,
  moreButtonDisabled,
}) => {
  const displaySubtitle = subtitle?.replace(/^https?:\/\//, "");

  return (
    <View style={styles.messengerHeaderContainer}>
      <TouchableOpacity
        onPress={onBackPress}
        style={styles.messengerIconButton}
      >
        <Ionicons
          name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
          size={28}
          color="#0A0A0A"
        />
      </TouchableOpacity>
      <View style={styles.messengerTitleContainer}>
        <Text style={styles.messengerTitle}>{title}</Text>
        {/* Title is now dynamic */}
        {displaySubtitle && displaySubtitle !== title && (
          <Text
            style={styles.messengerSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displaySubtitle}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onMorePress}
        style={styles.messengerIconButton}
        disabled={moreButtonDisabled}
      >
        <Ionicons
          name="ellipsis-vertical"
          size={24}
          color={moreButtonDisabled ? "#666666" : "#0A0A0A"}
        />
      </TouchableOpacity>
    </View>
  );
};

// --- Options Menu Component (Simple Example) ---
const OptionsMenu = ({
  visible,
  onClose,
  url,
  onMarkSuspicious,
  showToast,
}) => {
  if (!visible || !url) return null;

  // Simplified URL for display (optional, not used here but kept for context)
  // const simplifiedUrl = url.replace(/^https?:\/\//, '');

  // Behavior: Attempts to open the URL using the OS default handler.
  // Works reliably for http/https. Custom schemes might work if app is installed,
  // but less predictable without specific native declarations (which we're removing).
  const openInBrowser = () => {
    const urlToOpen = url; // Ensure 'url' holds the correct link
    console.log("Checking if URL can be opened:", urlToOpen);

    Linking.canOpenURL(urlToOpen)
      .then((supported) => {
        if (supported) {
          console.log("URL is supported, opening...");
          Linking.openURL(urlToOpen); // Open the link if supported
        } else {
          // This alert should now hopefully not appear for https links in your working environment
          Alert.alert(
            "Cannot Open Link",
            `The operating system doesn't know how to open this type of URL: ${urlToOpen}`
          );
          console.log("Linking.canOpenURL returned false for: " + urlToOpen);
        }
      })
      .catch((err) => {
        // Alert on other errors during the check or opening
        Alert.alert(
          "Error",
          "An error occurred while trying to open the link."
        );
        console.error(
          "An error occurred checking or opening URL with Linking:",
          err
        );
      });
    onClose(); // Close menu after action
  };

  // Behavior: Copies the URL to the clipboard WITHOUT showing a success alert.
  // Inside OptionsMenu component
  const copyLink = async () => {
    console.log("Attempting to copy URL inside copyLink:", url); // <-- Add this log
    try {
      await Clipboard.setStringAsync(url); // Ensure 'url' is not undefined/null here
      console.log("Link copied successfully.");
      showToast("Link copied", CopyIcon);
    } catch (e) {
      Alert.alert("Error", "Could not copy link to clipboard.");
      console.error("Failed to copy link:", e); // <-- What does this log?
    }
    onClose();
  };

  // --- Other functions (openPrivacyPolicy, handleMarkSuspiciousInternal) remain the same ---
  const openPrivacyPolicy = () => {
    const privacyUrl = "https://example.com/privacy"; // <-- UPDATE THIS if needed
    Linking.canOpenURL(privacyUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(privacyUrl);
        } else {
          Alert.alert(
            "Cannot Open Link",
            `Don't know how to open the Privacy Policy URL.`
          );
        }
      })
      .catch((err) => {
        Alert.alert(
          "Error",
          "An error occurred trying to open the Privacy Policy."
        );
        console.error("Error opening Privacy Policy:", err);
      });
    onClose();
  };

  const handleMarkSuspiciousInternal = () => {
    onMarkSuspicious();
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={copyLink}>
                <Ionicons
                  name="copy-outline"
                  size={22}
                  color="#EFEFEF"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Copy link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleMarkSuspiciousInternal}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color="#EFEFEF"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Mark as suspicious</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={openInBrowser}>
                <Ionicons
                  name="open-outline"
                  size={22}
                  color="#EFEFEF"
                  style={styles.menuIcon}
                />
                {/* Text remains appropriate */}
                <Text style={styles.menuText}>Open in Browser</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={openPrivacyPolicy}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="#EFEFEF"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- Main WebView Screen ---
const SUSPICIOUS_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM"];

const WebViewScreen = ({ navigation, route }) => {
  const initialUrl = route?.params?.url;
  const urlForWarningDisplay = route?.params?.displayUrl || initialUrl;
  const severity = route?.params?.severity || "UNKNOWN";
  const webViewRef = useRef(null);

  const [currentUrl, setCurrentUrl] = useState(initialUrl); // URL state for header/menu
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
  const [allowWebViewLoad, setAllowWebViewLoad] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false); // <-- State for custom toast visibility
  const [toastMessage, setToastMessage] = useState(""); // <-- State for custom toast message
  const [toastIconSource, setToastIconSource] = useState(null); // <-- State for icon source
  const toastTimerRef = useRef(null); // <-- Ref to manage the timeout

  // --- Initial Check on Mount (no changes needed here) ---
  useEffect(() => {
    if (!initialUrl) {
      console.error("WebViewScreen: No initial URL provided.");
      Alert.alert("Error", "No URL provided.", [
        { text: "OK", onPress: handleClose },
      ]);
      return;
    }
    const isSuspicious = SUSPICIOUS_SEVERITIES.includes(
      String(severity).toUpperCase()
    );
    if (isSuspicious) {
      setIsWarningModalVisible(true);
      setAllowWebViewLoad(false);
      setIsLoading(false);
      setCurrentUrl(initialUrl);
    } else {
      setIsWarningModalVisible(false);
      setAllowWebViewLoad(true);
      setIsLoading(true);
      setCurrentUrl(initialUrl);
    }
  }, [initialUrl, severity]);

  // --- Navigation/Action Functions ---
  const handleRefresh = () => {
    if (allowWebViewLoad && webViewRef.current) {
      setError(null);
      setIsLoading(true);
      webViewRef.current.reload();
    }
  };
  const handleClose = () => {
    if (navigation?.canGoBack()) navigation.goBack();
  };
  const handleMorePress = () => {
    setMenuVisible(true);
  };
  const handleCloseMenu = () => {
    setMenuVisible(false);
  };
  const handleMarkSuspicious = () => {
    Alert.alert(
      "Marked as Suspicious",
      `The URL ${currentUrl} has been reported (simulation).`
    );
    console.log("Mark as suspicious triggered for:", currentUrl);
  };

  // --- Modal Callbacks (no changes needed here) ---
  const handleModalClose = () => {
    setIsWarningModalVisible(false);
    handleClose();
  };
  const handleModalProceed = () => {
    setIsWarningModalVisible(false);
    setAllowWebViewLoad(true);
    setIsLoading(true);
    setCurrentUrl(initialUrl);
  };

  // --- WebView Handlers (no changes needed here) ---
  const handleNavigationStateChange = (navState) => {
    setCurrentUrl(navState.url); // Update URL for header subtitle and menu actions
    if (!navState.loading) {
      setError(null);
      setIsLoading(false);
    }
  };
  const handleRenderError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn("WebView render error: ", nativeEvent);
    setError(nativeEvent);
    setIsLoading(false);
  };
  const handleHttpError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn("WebView HTTP error: ", nativeEvent);
    setError({
      code: nativeEvent.statusCode,
      description:
        nativeEvent.description || `HTTP Error ${nativeEvent.statusCode}`,
      url: nativeEvent.url,
    });
    setIsLoading(false);
  };

  // --- Render Logic ---
  if (!initialUrl && !isWarningModalVisible) {
    // Simplified error display if no URL is ever provided
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={styles.messengerHeaderContainer.backgroundColor}
        />
        {/* Minimal header for error state */}
        <View style={styles.messengerHeaderContainer}>
          <View style={styles.messengerIconButton} />
          <View style={styles.messengerTitleContainer}>
            {/* Can optionally put the desired title here too */}
            <Text style={styles.messengerTitle}>SwiftShield</Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.messengerIconButton}
          >
            <Ionicons name="close" size={28} color="#CCC" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Ionicons
            name="link-off"
            size={48}
            color="#666"
            style={{ marginBottom: 15 }}
          />
          <Text style={[styles.errorText, { fontSize: 16 }]}>
            No URL Provided
          </Text>
          <Text style={styles.errorTextSmall}>Cannot load web page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Function to show the custom toast
  const showSimpleToast = (message, icon = null) => {
    // <-- Add optional icon parameter
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToastMessage(message);
    setToastIconSource(icon); // <-- Set the icon source state
    setToastVisible(true);

    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      // Optional: Reset icon after hiding if desired
      // setToastIconSource(null);
    }, 2500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          isWarningModalVisible ? styles.dimmedBackground : {},
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={styles.messengerHeaderContainer.backgroundColor}
        />

        {/* --- Use MessengerHeader with UPDATED Title --- */}
        <MessengerHeader
          title="SwiftShield" // <-- TITLE CHANGED HERE
          subtitle={currentUrl}
          onBackPress={handleClose}
          onMorePress={handleMorePress}
          moreButtonDisabled={isWarningModalVisible}
        />

        {/* Conditionally render WebView Component (no changes needed) */}
        {allowWebViewLoad && (
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ uri: currentUrl }}
            style={styles.webView}
            onLoadStart={() => {
              setIsLoading(true);
              setError(null);
            }}
            onLoadProgress={({ nativeEvent }) => {
              if (nativeEvent.progress === 1) setIsLoading(false);
            }}
            onLoadEnd={() => setIsLoading(false)}
            onError={handleRenderError}
            onHttpError={handleHttpError}
            onNavigationStateChange={handleNavigationStateChange}
            allowsBackForwardNavigationGestures={true}
            pullToRefreshEnabled={true}
          />
        )}

        {/* Placeholder view if webview isn't allowed yet (no changes needed) */}
        {!allowWebViewLoad && (
          <View style={styles.webViewPlaceholder}>
            {!isWarningModalVisible && (
              <ActivityIndicator color="#3AED97" size="large" />
            )}
          </View>
        )}

        {/* Loading Overlay (no changes needed) */}
        {allowWebViewLoad && isLoading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#3AED97" size="large" />
          </View>
        )}

        {/* Error Overlay (no changes needed) */}
        {allowWebViewLoad && error && !isLoading && (
          <View style={styles.errorOverlay}>
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color="#FF6B6B"
              style={{ marginBottom: 15 }}
            />
            <Text style={styles.errorText}>Failed to Load Page</Text>
            <Text style={styles.errorTextSmall}>
              {error.description || `Code: ${error.code || "Unknown"}`}
            </Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.retryButton}
            >
              <Ionicons
                name="refresh"
                size={20}
                color="#EFEFEF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Warning Modal (Rendered on top) */}
      <WarningModal
        visible={isWarningModalVisible}
        onClose={handleModalClose}
        onProceed={handleModalProceed}
        url={urlForWarningDisplay}
      />

      {/* Options Menu Modal (Rendered on top) - passes currentUrl */}
      <OptionsMenu
        visible={menuVisible}
        onClose={handleCloseMenu}
        url={currentUrl} // <-- Ensures the *current* URL is used for actions
        onMarkSuspicious={handleMarkSuspicious}
        showToast={showSimpleToast}
      />

      <SimpleToast
        visible={toastVisible}
        message={toastMessage}
        iconSource={toastIconSource} // <-- Pass the icon source state
      />
    </>
  );
};

// --- Styles ---
// (Styles remain the same as the previous version)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  dimmedBackground: {},
  messengerHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: "#3AED97",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
    height: Platform.OS === "ios" ? 55 : 60,
  },
  messengerIconButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
  },
  messengerTitleContainer: {
    flex: 1,
    alignItems: Platform.OS === "ios" ? "center" : "flex-start",
    justifyContent: "center",
    marginLeft: Platform.OS === "ios" ? 0 : 10,
    marginRight: 5,
  },
  messengerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0A0A0A",
    textAlign: Platform.OS === "ios" ? "center" : "left",
  },
  messengerSubtitle: {
    fontSize: 12,
    color: "#4A4A4A",
    marginTop: 1,
    textAlign: Platform.OS === "ios" ? "center" : "left",
  },
  webView: { flex: 1, backgroundColor: "#FFFFFF" },
  webViewPlaceholder: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 18, 18, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 10,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    color: "#FF6B6B",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  errorTextSmall: {
    color: "#FFAAAA",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 25,
  },
  retryButton: {
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: { color: "#EFEFEF", fontSize: 16, fontWeight: "500" },
  modalOverlay: {
    flex: 1,

    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 50 : 55,
    paddingRight: 10,
  },
  menuContainer: {
    backgroundColor: "#3AED97",
    borderRadius: 8,
    paddingVertical: 5,
    minWidth: 220,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  menuItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    marginRight: 15,
    color: "#0A0A0A",
  },
  menuText: {
    fontSize: 16,
    color: "#0A0A0A",
  },
});

export default WebViewScreen;
