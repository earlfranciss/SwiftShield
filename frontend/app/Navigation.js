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
import React, { useState, useEffect, useRef } from "react";
import GradientScreen from "./screens/components/GradientScreen";
import TopBar from "./screens/components/TopBar";
import NotificationToast from "./screens/components/NotificationToast";
import { requestNotificationPermissions, setupNotificationListeners, scheduleNotification } from "./services/NotificationService";
import config from "./config";

//Screens

import Home from "./screens/tabScreens/Home";
import Analytics from "./screens/tabScreens/Analytics";
import Logs from "./screens/tabScreens/Logs";
import Settings from "./screens/tabScreens/Settings";
import Notifications from "./screens/stackScreens/Notifications";
import Login from "./screens/Login";
import Registration from "./screens/Registration";
import ForgotPassword from "./screens/ForgotPassword";
import Reports from "./screens/reportsPage/Reports";
import CreateReport from "./screens/reportsPage/CreateReport";
import EditReport from "./screens/reportsPage/EditReport";
import ConnectedAppsScreen from './screens/Settings/screens/ConnectedAppsScreen';
import PushNotificationsScreen from "./screens/Settings/screens/PushNotifications";


//Icons
import { Entypo } from "@expo/vector-icons";
import Octicons from "@expo/vector-icons/Octicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";


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
  function SettingsStack({ navigation, route, isDarkMode, onToggleDarkMode, hasUnreadNotifications, onNotificationRead }) {
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
        {props => (
          <GradientScreen {...commonGradientProps} topBar={<TopBar {...commonTopBarProps}/>}>
            {/* Pass the STACK's props DOWN, remove explicit override */}
            <Settings {...props} isDarkMode={isDarkMode}/>
          </GradientScreen>
        )}
      </SettingsStackNav.Screen>
      <SettingsStackNav.Screen name="PushNotifications">
                {props => (
                    <GradientScreen {...commonGradientProps}>
                        {/* No TopBar needed here */}
                        <PushNotificationsScreen {...props} />
                    </GradientScreen>
                )}
            </SettingsStackNav.Screen>
      <SettingsStackNav.Screen name="ConnectedApps">
         {/* 'props' here contains the CORRECT navigation for SettingsStackNav */}
         {props => (
            <GradientScreen {...commonGradientProps}>
                 {/* Pass the STACK's props DOWN, remove explicit override */}
                <ConnectedAppsScreen {...props} />
            </GradientScreen>
         )}
      </SettingsStackNav.Screen>
       {/* Add other screens that should be nested under Settings tab here */}
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
          {() => (
            <GradientScreen
              onToggleDarkMode={handleToggleDarkMode}
              isDarkMode={isDarkMode}
              navigation={navigation}
              topBar={
                <TopBar
                  onToggleDarkMode={handleToggleDarkMode}
                  isDarkMode={isDarkMode}
                  navigation={navigation}
                  hasUnreadNotifications={hasUnreadNotifications}
                  onNotificationRead={onNotificationRead}
                />
              }
            >
              <Home />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen name="Analytics" options={{ headerShown: false }}>
          {() => (
            <GradientScreen
              onToggleDarkMode={handleToggleDarkMode}
              isDarkMode={isDarkMode}
              navigation={navigation}
              topBar={
                <TopBar
                  onToggleDarkMode={handleToggleDarkMode}
                  isDarkMode={isDarkMode}
                  navigation={navigation}
                  hasUnreadNotifications={hasUnreadNotifications}
                  onNotificationRead={onNotificationRead}
                />
              }
            >
              <Analytics />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen name="Logs" options={{ headerShown: false }}>
          {() => (
            <GradientScreen
              onToggleDarkMode={handleToggleDarkMode}
              isDarkMode={isDarkMode}
              navigation={navigation}
              topBar={
                <TopBar
                  onToggleDarkMode={handleToggleDarkMode}
                  isDarkMode={isDarkMode}
                  navigation={navigation}
                  hasUnreadNotifications={hasUnreadNotifications}
                  onNotificationRead={onNotificationRead}
                />
              }
            >
              <Logs />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen name="Settings" options={{ headerShown: false }}>
          {/* Render SettingsStack, passing down necessary props */}
          {props => ( // props here includes navigation and route from the Tab navigator
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
      <Stack.Screen name="Tabs">
        {props => (
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
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const [inAppNotification, setInAppNotification] = useState(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const appState = useRef(AppState.currentState);
  
  // Set up notifications on app start
  useEffect(() => {
    // Request permissions
    requestNotificationPermissions();
    
    // Set up listeners for system notifications
    const cleanupListeners = setupNotificationListeners(
      (notification) => {
        // Handle received notification
        console.log('Notification received', notification);
      },
      (response) => {
        // Handle notification response (user tap)
        const data = response.notification.request.content.data;
        navigateToNotificationsScreen(data);
      }
    );
    
    // Set up polling for new notifications
    const checkInterval = setInterval(checkForNewNotifications, 30000); // Every 30 seconds
    
    // Clean up on unmount
    return () => {
      cleanupListeners();
      clearInterval(checkInterval);
    };
  }, []);
  
  // Monitor app state to determine notification type
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
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
        console.error('BASE_URL is not defined in config');
        return;
      }
      
      const response = await fetch(`${config.BASE_URL}/logs`);
      const data = await response.json();
      
      if (data && Array.isArray(data) && data.length > 0) {
        // For simplicity, just showing the latest notification
        // In a real app, you would track which ones have been seen
        const latestNotification = data[0];
        handleNewNotification(latestNotification);
      }
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  };
  
  // Handle a new notification
  const handleNewNotification = (notification) => {
    // Determine if link is malicious based on icon or other property
    const isMalicious = notification.icon === "suspicious-icon";
    const title = isMalicious ? 
      "Warning: Malicious Link Detected" : 
      "Safe Link Verified";
    const body = notification.url || notification.link || "";
    
    // Set unread notifications flag
    setHasUnreadNotifications(true);
    
    if (appState.current === 'active') {
      // App is in foreground, show in-app notification
      setInAppNotification({
        ...notification,
        id: notification.id || Math.random().toString(),
        icon: notification.icon || (isMalicious ? "suspicious-icon" : "safe-icon")
      });
    } else {
      // App is in background, show system notification
      scheduleNotification(title, body, notification);
    }
  };
  
  // Function to navigate to notifications screen using the global navigation variable
  const navigateToNotificationsScreen = (data) => {
    if (globalNavigation) {
      globalNavigation.navigate('Notifications', {
        isDarkMode: false,
        onToggleDarkMode: () => {},
        ...data
      });
      // Clear unread notifications when navigating to the Notifications screen
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
      
      {/* Notification Toast */}
      {inAppNotification && (
        <NotificationToast 
          notification={inAppNotification}
          onPress={(notification) => {
            if (globalNavigation) {
              globalNavigation.navigate('Notifications', {
                isDarkMode: false,
                onToggleDarkMode: () => {},
                notification: notification
              });
              setInAppNotification(null);
              setHasUnreadNotifications(false);
            }
          }}
          onDismiss={() => setInAppNotification(null)}
        />
      )}
    </>
  );
}

// Styles
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