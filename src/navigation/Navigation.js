import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Image,
  AppState
} from "react-native";
//Components
import React, { useState, useEffect, useRef } from "react";
import GradientScreen from "../components/GradientScreen";
import TopBar from "../components/TopBar";
import NotificationToast from "../components/NotificationToast";
//Services - Import with error handling
import * as NotificationService from "../services/NotificationService";
const { requestNotificationPermissions, setupNotificationListeners, scheduleNotification } = NotificationService;
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
import EditProfile from "../screens/authScreens/EditProfile";
//Reports Page 
import Reports from "../screens/reportsPage/Reports";
import CreateReport from "../screens/reportsPage/CreateReport";
import EditReport from "../screens/reportsPage/EditReport";
//Settings Screens
import ConnectedAppsScreen from '../screens/settingsScreens/screens/ConnectedAppsScreen';
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
  useEffect(() => {
    globalNavigation = navigation;
    return () => { globalNavigation = null; };
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
      isDarkMode: isDarkMode,
      onToggleDarkMode: onToggleDarkMode,
      // Pass the PARENT navigation to TopBar (likely correct for its icons/actions)
      navigation: navigation,
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
        <SettingsStackNav.Screen name="ConnectedApps">
          {/* 'props' here contains the CORRECT navigation for SettingsStackNav */}
          {(props) => (
            <GradientScreen {...commonGradientProps}>
              {/* Pass the STACK's props DOWN, remove explicit override */}
              <ConnectedAppsScreen {...props} />
            </GradientScreen>
         )}
      </SettingsStackNav.Screen>
       {/* Add other screens that should be nested under Settings tab here */}
       <SettingsStackNav.Screen name="ManageUsers">
         {props => (
            <GradientScreen {...commonGradientProps}>
                <ManageUsers {...props} />
            </GradientScreen>
         )}
        
         </SettingsStackNav.Screen>
    </SettingsStackNav.Navigator>
  );
}
  

  const [isDarkMode, setDarkMode] = useState(false);

  const handleToggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

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
                  color: isDarkMode ? "#218555" : "#3AED97",
                  fontSize: 12,
                }}
              >
                {route.name}
              </Text>
            ) : null,

          tabBarActiveTintColor: isDarkMode ? "#00A757" : "#3AED97",
          tabBarInactiveTintColor: isDarkMode ? "#AAAAAA" : "#218555",
          tabBarStyle: {
            backgroundColor: isDarkMode ? "#FFFFFF" : "#000000",
            height: 56,
            borderTopWidth: 0,
          },
        })}
      >
        <Tab.Screen name="Home" options={{ headerShown: false }}>
          {(props) => (
            <GradientScreen
              // Pass props relevant to GradientScreen if needed
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              // Pass the correct navigation object to TopBar
              topBar={
                <TopBar
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={handleToggleDarkMode}
                  // props.navigation is the navigation for the Home screen
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
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              topBar={
                <TopBar
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={handleToggleDarkMode}
                  // props.navigation is the navigation for the Analytics screen
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
              onToggleDarkMode={handleToggleDarkMode}
              isDarkMode={isDarkMode}
              navigation={navigation}
              topBar={
                <TopBar
                  onToggleDarkMode={handleToggleDarkMode}
                  isDarkMode={isDarkMode}
                  navigation={props.navigation}
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
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
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
      <Stack.Screen name="EditProfile" component={EditProfile} />
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
  const lastNotifiedIdRef = useRef(null);

  useEffect(() => {
    requestNotificationPermissions();
    const cleanupListeners = setupNotificationListeners(
      (notification) => {
        console.log("Notification received:", notification);
      },
      (response) => {
        const data = response.notification.request.content.data;
        navigateToNotificationsScreen(data);
      }
    );


    // ENABLE NOTIFICATION POLLING
    const checkInterval = setInterval(checkForNewNotifications, 30000);
    checkForNewNotifications();

    // Clean up on unmount
    return () => {
      cleanupListeners();
      clearInterval(checkInterval);
    };
  }, []);

  // Monitor app state to determine notification type
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  // Function to check for new notifications
  const checkForNewNotifications = async () => {
    try {
      if (!config?.BASE_URL) {
        console.error("BASE_URL missing");
        return;
      }

      const response = await fetch(`${config.BASE_URL}/logs`);
      if (!response.ok) {
        console.error(`HTTP Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log('API response data:', data);

      // **** Changed check to ensure data exists and is an array ****
      if (data?.length > 0) {
        const sortedData = data.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        handleNewNotification(sortedData[0]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  // Handle a new notification
  const handleNewNotification = (notification) => {
    // Validate required fields
    if (!notification?.detection_id || !notification?.log_id) {
      console.warn("Invalid notification format:", notification);
      return;
    }

  // Normalize notification data
  const newNotification = {
    id: notification.detection_id, // Use detection_id as primary ID
    log_id: notification.log_id,
    url: notification.url || notification.link || "No URL provided",
    icon: notification.icon === "safe-icon" ? "safe-icon" : "suspicious-icon",
    timestamp: notification.date_scanned ? 
      new Date(notification.date_scanned).getTime() : Date.now(),
    severity: notification.severity?.toUpperCase() || "UNKNOWN",
    phishing_percentage: notification.phishing_probability_score ?
      Math.round(notification.phishing_probability_score * 100) : 0,
    recommended_action: notification.recommended_action || "No recommendation",
    platform: notification.platform || "Unknown Source"
  };
  
    console.log('Processing notification:', newNotification);

    // **** Core Logic: Check if the ID is new ****
    if (newNotification.id !== lastNotifiedIdRef.current) {
      console.log(`New notification ID: ${newNotification.id}`);
      setHasUnreadNotifications(true);

      if (appState.current === "active") {
        setInAppNotification(newNotification);
        lastNotifiedIdRef.current = newNotification.id;
      } else {
        scheduleNotification(
          newNotification.severity === 'critical' 
            ? "Malicious Link Detected" 
            : "Safe Link Verified",
          newNotification.url,
          newNotification
        );
        lastNotifiedIdRef.current = newNotification.id;
      }
    }
  };

  // Function to navigate to notifications screen using the global navigation variable
  const navigateToNotificationsScreen = (data) => {
    if (globalNavigation) {
      globalNavigation.navigate("Notifications", {
        isDarkMode: false,
        onToggleDarkMode: () => {},
        ...data
      });
      setHasUnreadNotifications(false);
    }
  };

  // Simply return the MainStack and NotificationToast
  return (
    <>
      <MainStack
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationRead={() => setHasUnreadNotifications(false)}
      />

      {inAppNotification && (
        <NotificationToast
          notification={inAppNotification}
          onPress={(data) => {
            console.log("Toast pressed:", data);
            setHasUnreadNotifications(false);
          }}
          onDismiss={() => {
            console.log("Toast dismissed");
            setInAppNotification(null);
          }}
          navigation={globalNavigation}
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