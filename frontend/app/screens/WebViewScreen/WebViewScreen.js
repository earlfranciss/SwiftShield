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
} from "react-native";
import { WebView } from "react-native-webview";
import Icon from "react-native-vector-icons/MaterialIcons";
import WarningModal from "../components/WarningModal"; // <-- ADJUST PATH if needed

const SUSPICIOUS_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM"];

const WebViewScreen = ({ navigation, route }) => {
  const initialUrl = route?.params?.url;
  const severity = route?.params?.severity || "UNKNOWN";
  const webViewRef = useRef(null);

  // State variables
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState("Loading...");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Start false until WebView is allowed to load
  const [error, setError] = useState(null);

  // State for Modal visibility and controlling WebView rendering/loading
  const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
  const [allowWebViewLoad, setAllowWebViewLoad] = useState(false); // Start false

  // --- Initial Check on Mount ---
  useEffect(() => {
    if (!initialUrl) {
      console.error("WebViewScreen: No initial URL provided.");
      // Handle error appropriately (e.g., show alert and go back)
      Alert.alert("Error", "No URL provided.", [
        { text: "OK", onPress: handleClose },
      ]);
      return;
    }

    const isSuspicious = SUSPICIOUS_SEVERITIES.includes(
      String(severity).toUpperCase()
    );

    if (isSuspicious) {
      // Show the warning modal first
      console.log(
        "WebViewScreen: Suspicious URL detected, showing WarningModal."
      );
      setIsWarningModalVisible(true);
      setAllowWebViewLoad(false); // Prevent WebView rendering/loading
      setIsLoading(false);
      setPageTitle("Warning"); // Set header title
    } else {
      // URL is considered safe, proceed to load directly
      console.log("WebViewScreen: Safe URL detected, allowing WebView load.");
      setIsWarningModalVisible(false);
      setAllowWebViewLoad(true); // Allow WebView rendering/loading
      setIsLoading(true); // Start loading indicator for WebView
      setPageTitle(initialUrl); // Set initial title
    }
  }, [initialUrl, severity]); // Dependencies

  // --- Navigation Functions ---
  const handleGoBack = () => {
    if (allowWebViewLoad && webViewRef.current && canGoBack)
      webViewRef.current.goBack();
  };
  const handleGoForward = () => {
    if (allowWebViewLoad && webViewRef.current && canGoForward)
      webViewRef.current.goForward();
  };
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

  // --- Modal Callback Functions ---
  const handleModalClose = () => {
    console.log("Warning Modal: Close pressed");
    setIsWarningModalVisible(false);
    handleClose(); // Navigate back (close the whole screen)
  };

  const handleModalProceed = () => {
    console.log("Warning Modal: Proceed pressed");
    setIsWarningModalVisible(false);
    setAllowWebViewLoad(true); // *** Allow WebView rendering/loading ***
    setIsLoading(true); // *** Start loading indicator for WebView ***
    setPageTitle(initialUrl || "Loading..."); // Reset title for loading state
  };

  // --- WebView Handlers ---
  // (These only run if allowWebViewLoad becomes true)
  const handleNavigationStateChange = (navState) => {
    /* ... same as before ... */ setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    if (
      navState.title &&
      navState.title.trim() !== "" &&
      !navState.title.startsWith("http")
    ) {
      setPageTitle(navState.title);
    } else if (!navState.title && navState.url) {
      setPageTitle(navState.url);
    }
    if (!navState.loading) {
      setError(null);
      setIsLoading(false);
    }
  };
  const handleRenderError = (syntheticEvent) => {
    /* ... same as before ... */ const { nativeEvent } = syntheticEvent;
    console.warn("WebView error: ", nativeEvent);
    setError(nativeEvent);
    setIsLoading(false);
  };
  const handleHttpError = (syntheticEvent) => {
    /* ... same as before ... */ const { nativeEvent } = syntheticEvent;
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

  // Added this check again for safety, although useEffect should handle it
  if (!initialUrl && !isWarningModalVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholderButton} />
          <View style={styles.placeholderButton} />
          <View style={styles.titleContainer} />
          <View style={styles.placeholderButton} />
          <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
            <Icon name="close" size={26} color="#CCC" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Icon
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

  return (
    // Use React Fragment <> to render Modal alongside SafeAreaView
    <>
      <SafeAreaView
        style={[
          styles.container,
          isWarningModalVisible ? styles.dimmedBackground : {},
        ]}
      >
        {/* Header - Always render header, but buttons might be disabled visually */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            disabled={!canGoBack || !allowWebViewLoad || isWarningModalVisible}
            style={styles.iconButton}
          >
            <Icon
              name="arrow-back-ios"
              size={22}
              color={
                canGoBack && allowWebViewLoad && !isWarningModalVisible
                  ? "#FFFFFF"
                  : "#666666"
              }
              style={{ marginLeft: Platform.OS === "ios" ? 8 : 0 }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGoForward}
            disabled={
              !canGoForward || !allowWebViewLoad || isWarningModalVisible
            }
            style={styles.iconButton}
          >
            <Icon
              name="arrow-forward-ios"
              size={22}
              color={
                canGoForward && allowWebViewLoad && !isWarningModalVisible
                  ? "#FFFFFF"
                  : "#666666"
              }
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {/* Show "Warning" title if modal is visible, otherwise loading/page title */}
              {isWarningModalVisible
                ? "Warning"
                : isLoading && !error
                ? "Loading..."
                : pageTitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isLoading || !allowWebViewLoad || isWarningModalVisible}
            style={styles.iconButton}
          >
            <Icon
              name="refresh"
              size={26}
              color={
                isLoading || !allowWebViewLoad || isWarningModalVisible
                  ? "#666666"
                  : "#FFFFFF"
              }
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
            <Icon name="close" size={26} color={"#FFFFFF"} />
          </TouchableOpacity>
        </View>

        {/* Conditionally render WebView Component */}
        {allowWebViewLoad && (
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ uri: initialUrl }}
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

        {/* Keep placeholder view if webview isn't allowed yet to maintain layout */}
        {!allowWebViewLoad && (
          <View style={styles.webViewPlaceholder}>
            {/* Optionally show a message here or just keep it blank */}
            {/* <Text style={{color: '#555'}}>Content blocked due to security warning.</Text> */}
          </View>
        )}

        {/* Loading Overlay for WebView (only show if loading webview) */}
        {allowWebViewLoad && isLoading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#3AED97" size="large" />
          </View>
        )}
        {/* Error Overlay for WebView (only show if webview load failed) */}
        {allowWebViewLoad && error && !isLoading && (
          <View style={styles.errorOverlay}>
            <Icon
              name="error-outline"
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
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Warning Modal (Rendered on top, controlled by state) */}
      <WarningModal
        visible={isWarningModalVisible}
        onClose={handleModalClose} // Closes the screen
        onProceed={handleModalProceed} // Hides modal, shows/loads WebView
        url={initialUrl}
      />
    </>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  // ... (Keep all previous styles for container, header, webview, overlays, etc.)
  container: { flex: 1, backgroundColor: "#121212" },
  dimmedBackground: {
    // Optional style to slightly dim background when modal is up
    // backgroundColor: 'rgba(18, 18, 18, 0.7)', // Example dimming
  },
  header: {
    height: 55,
    backgroundColor: "#1E1E1E",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  iconButton: { padding: 8, marginHorizontal: 2 },
  placeholderButton: { width: 40, height: 40 },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: Platform.OS === "ios" ? "center" : "flex-start",
    marginHorizontal: 5,
  },
  headerTitle: {
    color: "#EFEFEF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: Platform.OS === "ios" ? "center" : "left",
  },
  webView: { flex: 1, backgroundColor: "#FFFFFF" },
  webViewPlaceholder: {
    // Takes up space where WebView would be
    flex: 1,
    backgroundColor: "#121212", // Match container background
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
  },
  retryButtonText: { color: "#EFEFEF", fontSize: 16, fontWeight: "500" },
});

export default WebViewScreen;
