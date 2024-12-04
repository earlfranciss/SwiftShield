import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Image } from 'react-native';
import React, { useState } from 'react';
import GradientScreen from './screens/components/GradientScreen';
import TopBar from './screens/components/TopBar';
import { NavigationContainer } from '@react-navigation/native';
//Screens
import Home from './screens/tabScreens/Home';
import Analytics from './screens/tabScreens/Analytics';
import Logs from './screens/tabScreens/Logs';
import Settings from './screens/tabScreens/Settings';
import Notifications from './screens/stackScreens/Notifications';
//Icons
import { Entypo } from "@expo/vector-icons";
import Octicons from "@expo/vector-icons/Octicons";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';



const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();



//Bottom Tab Bar Component
// TabGroup component
function TabGroup({ navigation }) {
  const [isDarkMode, setDarkMode] = useState(false);

  const handleToggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator 
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }) => {
            let iconName;
            let IconLibrary;

            if(route.name === "Home") {
              iconName = "home";
              IconLibrary = Entypo;
            } else if(route.name === "Analytics") {
              iconName = "graph";
              IconLibrary = Octicons;
            } else if(route.name === "Logs") {
              iconName = "list";
              IconLibrary = FontAwesome6;
            } else if(route.name === "Settings") {
              iconName = "settings-sharp";
              IconLibrary = Ionicons;
            }

            return (
              <View style={{ paddingTop: 5 }}>
                <IconLibrary name={iconName} size={22} color={color} />
              </View>
            );
          },
          tabBarLabel: ({ focused }) => (
            focused ? (
              <Text style={{ color: isDarkMode ? '#218555' : '#3AED97', fontSize: 12 }}>
                {route.name}
              </Text>
            ) : null
          ),

          tabBarActiveTintColor: isDarkMode ? "#00A757" : "#3AED97",
          tabBarInactiveTintColor: isDarkMode ? "#AAAAAA" : "#218555", 
          tabBarStyle: {
            backgroundColor: isDarkMode ? "#FFFFFF" : "#000000", 
            height: 56,
            borderTopWidth: 0,
          },
        })}>
        
        <Tab.Screen
          name="Home"
          options={{ headerShown: false }}
        >
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
                />
              }
            >
              <Home />
            </GradientScreen>
          )}
        </Tab.Screen>


        <Tab.Screen
          name="Analytics"
          options={{ headerShown: false }}
        >
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
                />
              }
            >
              <Analytics />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen 
          name="Logs" 
          options={{ headerShown: false }}
        >
          {() => (
            <GradientScreen
              onToggleDarkMode={handleToggleDarkMode}
              isDarkMode={isDarkMode}
              navigation={navigation}
              topBar={<TopBar 
                onToggleDarkMode={handleToggleDarkMode} 
                isDarkMode={isDarkMode} 
                navigation={navigation} />}
            >
              <Logs />
            </GradientScreen>
          )}
        </Tab.Screen>

        <Tab.Screen 
          name="Settings" 
          options={{ headerShown: false }}
        >
          {() => (
            <GradientScreen
              onToggleDarkMode={handleToggleDarkMode}
              isDarkMode={isDarkMode}
              navigation={navigation}
              topBar={<TopBar 
                onToggleDarkMode={handleToggleDarkMode} 
                isDarkMode={isDarkMode} 
                navigation={navigation} />}
            >
              <Settings />
            </GradientScreen>
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}


// Main Stack Navigator
function MainStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabGroup} />
        <Stack.Screen name="Notifications" component={Notifications} options={{ animation: 'slide_from_right' }}/>
      </Stack.Navigator>
    );
  }
  
  export default function Navigation() {
    return <MainStack />;
  }
  

// Styles
const styles = StyleSheet.create({
    topBar: {
      height: 60,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    logo: {
      width: 120,
      height: 30,
      resizeMode: 'contain',
    },
    topBarIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
  });