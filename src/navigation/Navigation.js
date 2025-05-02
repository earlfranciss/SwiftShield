import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Image,
  AppState,
} from "react-native";
//Components
import React, { useState, useEffect, useRef, useContext } from "react";
import GradientScreen from "../components/GradientScreen";
import TopBar from "../components/TopBar";
import NotificationToast from "../components/NotificationToast";
import { useTheme } from "../components/themeContext";
//Services - Import with error handling
import * as NotificationService from "../services/NotificationService";
const {
  requestNotificationPermissions,
  setupNotificationListeners,
  scheduleNotification,
} = NotificationService;
import WebViewScreen from "../screens/WarningScreen/WebViewScreen";
//ConfignotificationData
import config from "../config/config";
//Tab Screens
import Home from "../screens/tabScreens/Home";
import Analytics from "../screens/tabScreens/Analytics";
import Logs from "../screens/tabScreens/Logs";
import Settings from "../screens/tabScreens/Settings";
//Stack Screen
import Notifications from "../screens/stackScreens/Notifications";
//Authentication Screens
import Login from "../screens/authScreens/Login";
import Registration from "../screens/authScreens/Registration";
import ForgotPassword from "../screens/authScreens/ForgotPassword";
//import EditProfile from "../screens/authScreens/EditProfile";
//Reports Page
import Reports from "../screens/reportsPage/Reports";
import CreateReport from "../screens/reportsPage/CreateReport";
import EditReport from "../screens/reportsPage/EditReport";
//Settings Screens
////import ConnectedAppsScreen from '../screens/settingsScreens/screens/ConnectedAppsScreen';
import PushNotificationsScreen from "../screens/settingsScreens/screens/PushNotifications";
import ManageUsers from "../screens/stackScreens/ManageUsers";
import OnboardingScreen from "../screens/stackScreens/OnboardingScreen";

//Icons
import Entypo from "react-native-vector-icons/Entypo";
import Octicons from "react-native-vector-icons/Octicons";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Ionicons from "react-native-vector-icons/Ionicons";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const SettingsStackNav = createNativeStackNavigator();

// Create a global navigation variable to store the navigation prop
let globalNavigation = null;

//Bottom Tab Bar Component
// TabGroup component
function TabGroup({ navigation, hasUnreadNotifications, onNotificationRead }) {
  // Store the navigation prop globally when this component mounts
  useEffect(() => {
    globalNavigation = navigation;
  }, [navigation]);

  // Define the Settings Stack function
  function SettingsStack({
    navigation,
    route,
    isDarkMode,
    onToggleDarkMode,
    hasUnreadNotifications,
    onNotificationRead,
  }) {
    // navigation here is from the PARENT (Tab Navigator) - USE WITH CAUTION inside stack screens

    const commonGradientProps = {
      isDarkMode: isDarkMode,
      onToggleDarkMode: onToggleDarkMode,
      // DO NOT pass parent navigation here unless GradientScreen specifically needs it
      // navigation: navigation,
    };

    const commonTopBarProps = {
      isDarkMode: isDarkMode, // This 'isDarkMode' is now from the prop passed by TabGroup
      onToggleDarkMode: onToggleDarkMode, // This is now from the prop passed by TabGroup
      navigation: navigation, // Parent navigation passed down correctly
      hasUnreadNotifications: hasUnreadNotifications,
      onNotificationRead: onNotificationRead,
    };

    return (
      <SettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
        <SettingsStackNav.Screen name="SettingsMain">
          {/* 'props' here contains the CORRECT navigation for SettingsStackNav */}
          {(props) => (
            <GradientScreen
              {...commonGradientProps}
              topBar={<TopBar {...commonTopBarProps} />}
            >
              {/* Pass the STACK's props DOWN, remove explicit override */}
              <Settings {...props} isDarkMode={isDarkMode} />
            </GradientScreen>
          )}
        </SettingsStackNav.Screen>
        <SettingsStackNav.Screen name="PushNotifications">
          {(props) => (
            <GradientScreen {...commonGradientProps}>
              {/* No TopBar needed here */}
              <PushNotificationsScreen {...props} />
            </GradientScreen>
          )}
        </SettingsStackNav.Screen>

        {/* <SettingsStackNav.Screen name="ConnectedApps">
          {/* 'props' here contains the CORRECT navigation for SettingsStackNav 
          {(props) => (
            <GradientScreen {...commonGradientProps}>
              {/* Pass the STACK's props DOWN, remove explicit override 
              {/* Pass the STACK's props DOWN, remove explicit override 
              <ConnectedAppsScreen {...props} />
            </GradientScreen>
         )}
      </SettingsStackNav.Screen>*/}

        {/* Add other screens that should be nested under Settings tab here */}
        <SettingsStackNav.Screen name="ManageUsers">
          {(props) => (
            <GradientScreen {...commonGradientProps}>
              <ManageUsers {...props} />
            </GradientScreen>
          )}
        </SettingsStackNav.Screen>
      </SettingsStackNav.Navigator>
    );
  }

  // const [isDarkMode, setDarkMode] = useState(false);

  // const handleToggleDarkMode = () => {
  //   setDarkMode((prevMode) => !prevMode);
  // };

  const { theme, toggleTheme } = useTheme(); // <<< Get theme from context
  console.log("<<< TabGroup: Initial Mount Theme Check:", theme); // Should log 'dark'

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        style={{ color: "#FFFFFF" }}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }) => {
            let iconName;
            let IconLibrary;

            if (route.name === "Home") {
              iconName = "home";
              IconLibrary = Entypo;
            } else if (route.name === "Analytics") {
              iconName = "graph";
              IconLibrary = Octicons;
            } else if (route.name === "Logs") {
              iconName = "list";
              IconLibrary = FontAwesome6;
            } else if (route.name === "Settings") {
              iconName = "settings-sharp";
              IconLibrary = Ionicons;
            }

            return (
              <View style={{ paddingTop: 5 }}>
                <IconLibrary name={iconName} size={22} color={color} />
              </View>
            );
          },
          tabBarLabel: ({ focused }) =>
            focused ? (
              <Text
                style={{
                  // <<< CORRECTED: Use theme from context
                  color: "#3AED97",
                  fontSize: 12,
                }}
              >
                {route.name}
              </Text>
            ) : null,
          // <<< CORRECTED: Use theme from context
          tabBarActiveTintColor: "#3AED97",
          tabBarInactiveTintColor: "#3AED97",
          tabBarStyle: {
            // <<< CORRECTED: Use theme from context
            backgroundColor: theme === "dark" ? "#000000" : "#FFFFFF",
            height: 56,
            borderTopWidth: 0,
          },
          // <<< Closing parenthesis for screenOptions was missing here, added below >>>
        })}
      >
        <Tab.Screen name="Home" options={{ headerShown: false }}>
          {(props) => (
            <GradientScreen
              isDarkMode={theme === "light"} // <<< Use theme from context
              onToggleDarkMode={toggleTheme} // <<< Use toggleTheme from context
              topBar={
                <TopBar
                  isDarkMode={theme === "light"} // <<< Use theme from context
                  onToggleDarkMode={toggleTheme} // <<< Use toggleTheme from context
                  navigation={props.navigation}
                  hasUnreadNotifications={hasUnreadNotifications}
                  onNotificationRead={onNotificationRead}
                />
              }
            >
              <Home {...props} />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen name="Analytics" options={{ headerShown: false }}>
          {(props) => (
            <GradientScreen
              // <<< CORRECTED props
              isDarkMode={theme === "light"} // Use theme from context
              onToggleDarkMode={toggleTheme} // Use toggleTheme from context
              topBar={
                <TopBar
                  // <<< CORRECTED props
                  isDarkMode={theme === "light"} // Use theme from context
                  onToggleDarkMode={toggleTheme} // Use toggleTheme from context
                  navigation={props.navigation}
                  hasUnreadNotifications={hasUnreadNotifications}
                  onNotificationRead={onNotificationRead}
                />
              }
            >
              <Analytics {...props} />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen name="Logs" options={{ headerShown: false }}>
          {(props) => (
            <GradientScreen
              // <<< CORRECTED props
              isDarkMode={theme === "light"} // Use theme from context
              onToggleDarkMode={toggleTheme} // Use toggleTheme from context
              // Check if 'navigation' prop is needed here vs props.navigation for GradientScreen
              navigation={navigation} // Assuming 'navigation' is the prop passed to TabGroup
              topBar={
                <TopBar
                  // <<< CORRECTED props
                  isDarkMode={theme === "light"} // Use theme from context
                  onToggleDarkMode={toggleTheme} // Use toggleTheme from context
                  navigation={props.navigation} // Use screen-specific navigation for TopBar actions
                  hasUnreadNotifications={hasUnreadNotifications}
                  onNotificationRead={onNotificationRead}
                />
              }
            >
              <Logs {...props} />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen name="Settings" options={{ headerShown: false }}>
          {(
            props // props here includes navigation and route from the Tab navigator
          ) => (
            <SettingsStack
              {...props} // Pass down tab's navigation/route
              isDarkMode={theme === "light"} // Use theme from context
              onToggleDarkMode={toggleTheme}
              hasUnreadNotifications={hasUnreadNotifications}
              onNotificationRead={onNotificationRead}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

// Main Stack Navigator
function MainStack({ hasUnreadNotifications, onNotificationRead }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Registration} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      {/*<Stack.Screen name="EditProfile" component={EditProfile} />*/}
      <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
      <Stack.Screen name="Tabs">
        {(props) => (
          <TabGroup
            {...props}
            hasUnreadNotifications={hasUnreadNotifications}
            onNotificationRead={onNotificationRead}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="CreateReport" component={CreateReport} />
      <Stack.Screen name="EditReport" component={EditReport} />
      <Stack.Screen
        name="Notifications"
        component={Notifications}
        options={{ animation: "slide_from_right" }}
      />

      <Stack.Screen
        name="WebViewScreen" // Name used in navigation.navigate('WebViewScreen', ...)
        component={WebViewScreen}
        options={{
          headerShown: false, // Use the custom header inside WebViewScreen
          presentation: "modal", // Optional: Makes it slide up like a modal
          animation: "slide_from_bottom", // Explicitly define modal animation
        }}
      />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const [inAppNotification, setInAppNotification] = useState(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const appState = useRef(AppState.currentState);
  // **** Add useRef to track the last notified ID ****
  const lastNotifiedIdRef = useRef(null);

  // Set up notifications on app start
  useEffect(() => {
    // Request permissions
    requestNotificationPermissions();

    // Set up listeners for system notifications
    const cleanupListeners = setupNotificationListeners(
      (notification) => {
        // Handle received notification
        console.log("Notification received", notification);
      },
      (response) => {
        // Handle notification response (user tap)
        const data = response.notification.request.content.data;
        navigateToNotificationsScreen(data);
      }
    );

    // Set up polling for new notifications
    //const checkInterval = setInterval(checkForNewNotifications, 30000); // Every 30 seconds
    //checkForNewNotifications(); // Check immediately on mount

    // Clean up on unmount
    return () => {
      cleanupListeners();
      //clearInterval(checkInterval);
    };
  }, []);

  // Monitor app state to determine notification type
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Function to check for new notifications
  const checkForNewNotifications = async () => {
    try {
      // Check if config and BASE_URL exist
      if (!config || !config.BASE_URL) {
        console.error("BASE_URL is not defined in config");
        return;
      }

      const response = await fetch(`${config.BASE_URL}/logs`);
      // **** Added error handling for non-ok responses ****
      if (!response.ok) {
        console.error(
          `Error fetching logs: ${response.status} ${response.statusText}`
        );
        // Optionally handle specific statuses like 404, 500 etc.
        return;
      }
      const data = await response.json();

      // **** Changed check to ensure data exists and is an array ****
      if (data && Array.isArray(data) && data.length > 0) {
        // Get the latest notification (assuming API returns sorted newest first)
        const latestNotification = data[0];
        console.log(`[Check] Latest log ID from API: ${latestNotification.id}`); // Debug log
        handleNewNotification(latestNotification);
      } else {
        // console.log("[Check] No logs found or invalid data format from API."); // Optional debug log
      }
    } catch (error) {
      console.error("Error during checkForNewNotifications fetch:", error);
    }
  };

  // Handle a new notification
  const handleNewNotification = (notification) => {
    // **** Ensure notification and its ID exist ****
    if (!notification || !notification.id) {
      console.warn(
        "handleNewNotification received invalid notification data:",
        notification
      );
      return;
    }

    // Determine if link is malicious based on icon or other property
    const isMalicious = notification.icon === "suspicious-icon";
    const title = isMalicious
      ? "Warning: Malicious Link Detected"
      : "Safe Link Verified";
    const body = notification.link || ""; // Use link as body

    // Set unread notifications flag (might need refinement later if you track read status globally)
    setHasUnreadNotifications(true);

    // **** Core Logic: Check if the ID is new ****
    if (notification.id !== lastNotifiedIdRef.current) {
      console.log(
        `[New Notification] ID ${notification.id} is different from last notified ID ${lastNotifiedIdRef.current}. Showing toast.`
      ); // Debug log
      if (appState.current === "active") {
        // App is in foreground, show in-app notification
        setInAppNotification({
          id: notification.id, // Use the actual ID from the log
          link: notification.link, // Use link from log data
          icon:
            notification.icon ||
            (isMalicious ? "suspicious-icon" : "safe-icon"),
          // Add any other properties your NotificationToast needs from the notification object
        });
        // **** Update the last notified ID ****
        lastNotifiedIdRef.current = notification.id;
      } else {
        // App is in background, show system notification
        console.log(
          `[New Notification] App not active. Scheduling system notification for ID ${notification.id}.`
        ); // Debug log
        scheduleNotification(title, body, notification);
        // **** Update the last notified ID even for background notifications ****
        // This prevents showing an in-app toast for the same item when the app returns to foreground
        lastNotifiedIdRef.current = notification.id;
      }
    } else {
      console.log(
        `[New Notification] ID ${notification.id} is the SAME as last notified ID ${lastNotifiedIdRef.current}. Skipping toast.`
      ); // Debug log
    }
  };

  // Function to navigate to notifications screen using the global navigation variable
  const navigateToNotificationsScreen = (data) => {
    if (globalNavigation) {
      globalNavigation.navigate("Notifications", {
        isDarkMode: false, // Pass relevant props if needed
        onToggleDarkMode: () => {},
        ...data, // Pass any data needed by the Notifications screen
      });
      // Clear unread notifications when navigating to the Notifications screen
      setHasUnreadNotifications(false);
    } else {
      console.warn("Cannot navigate: globalNavigation is not set.");
    }
  };

  // Simply return the MainStack and NotificationToast
  return (
    <>
      <MainStack
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationRead={() => setHasUnreadNotifications(false)}
      />

      {/* Notification Toast */}
      {inAppNotification && (
        <NotificationToast
          notification={inAppNotification}
          onPress={(notificationData) => {
            console.log(
              "Toast pressed, showing details modal:",
              notificationData
            ); // Debug log
            // The modal will be shown directly from NotificationToast component
            setHasUnreadNotifications(false); // Mark as read
          }}
          onDismiss={() => {
            console.log("Toast dismissed (timeout or manual)."); // Debug log
            setInAppNotification(null);
          }}
          navigation={globalNavigation} // Pass the navigation prop
        />
      )}
    </>
  );
}

// Styles (Keep existing styles)
const styles = StyleSheet.create({
  topBar: {
    height: 60,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  logo: {
    width: 120,
    height: 30,
    resizeMode: "contain",
  },
  topBarIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
