import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
//Screens
import Home from './screens/tabScreens/Home';
import Analytics from './screens/tabScreens/Analytics';
import Logs from './screens/tabScreens/Logs';
import Settings from './screens/tabScreens/Settings';
import Notifications from './screens/stackScreens/Notifications';
//Icons
import { Entypo } from "@expo/vector-icons";
import Orticons from "@expo/vector-icons/Octicons";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';



const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Top Bar Component
function TopBar({ onToggleDarkMode, isDarkMode, navigation }) {
  return (
    <View style={styles.topBar}>
        {/* App Name */}
        <Text style={[styles.logoText, { color: isDarkMode ? 'black' : '#3AED97' }]}>
        SwiftShield
        </Text>
        <View style={styles.topBarIcons}>
            {/* Toggle on/off dark mode */}
            <TouchableOpacity onPress={() => onToggleDarkMode()}>
                <Ionicons 
                    name={isDarkMode ? "sunny-outline" : "moon-outline"}
                    size={24} 
                    color={isDarkMode ? "black" : "#3AED97"}
                />
            </TouchableOpacity>
            {/* Open Notifications */}
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Ionicons 
                    name="notifications-outline" 
                    size={24} 
                    color={isDarkMode ? "black" : "#3AED97"} 
                />
            </TouchableOpacity>
            
        </View>
    </View>
  );
}

//Gradient Screen
function GradientScreen({ children, onToggleDarkMode, isDarkMode, navigation }) {
    return (
      <LinearGradient
        colors={isDarkMode ? ["#F2F2F2", "#66F3AF"] : ["#000000", "#24B073"]}
        start = {{ x: 0.5, y: 0.5}}
        end = {{ x: 1.5, y: 1}}
        style={{ flex: 1 }}
      >
        <TopBar 
            onToggleDarkMode={onToggleDarkMode} 
            isDarkMode={isDarkMode} 
            navigation={navigation} />
        {children}
      </LinearGradient>
    );
  }


//Bottom Tab Bar Component
function TabGroup({ onToggleDarkMode, navigation }) {
    const [isDarkMode, setDarkMode] = useState(false);
    
    return (
        <View style={{ flex: 1 }}>
            
            <Tab.Navigator 
            screenOptions={({route, navigation}) => ({
                tabBarIcon: ({color, focused, size}) => {
                    let iconName;
                    let IconLibrary;

                    if(route.name === "Home") {
                        iconName = "home";
                        IconLibrary = Entypo;
                    } else if(route.name === "Analytics") {
                        iconName = "graph";
                        IconLibrary = Orticons;
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
                    )
                },
                tabBarLabel: ({ focused }) => (
                  focused ? (
                    <Text style={{ color: isDarkMode ? '#218555' : '#3AED97', fontSize: 12 }}>
                      {route.name}
                    </Text>
                  ) : null
                ),
                tabBarActiveTintColor: isDarkMode ? "#00A757" : "#3AED97", // Green for dark mode, light color for light mode
                tabBarInactiveTintColor: isDarkMode ? "#AAAAAA" : "#218555", // Darker inactive color for dark mode
                tabBarStyle: {
                    backgroundColor: isDarkMode ? "#FFFFFF" : "#000000", // Black background for dark mode, white for light mode
                    height: 56,
                    borderTopWidth: 0,
                },
            })}>
            
                
                <Tab.Screen 
                    name="Home" 
                    options={{ headerShown: false}}
                    >

                    {() => <GradientScreen onToggleDarkMode={() => 
                                setDarkMode(!isDarkMode)} 
                                isDarkMode={isDarkMode} 
                                navigation={navigation}>
                            <Home />
                            </GradientScreen>}
                </Tab.Screen>

                <Tab.Screen 
                    name="Analytics" 
                    options={{ headerShown: false}}
                    >
                    {() => <GradientScreen onToggleDarkMode={() => 
                                setDarkMode(!isDarkMode)} 
                                isDarkMode={isDarkMode} 
                                navigation={navigation}>
                            <Analytics />
                            </GradientScreen>}
                </Tab.Screen>

                <Tab.Screen 
                    name="Logs" 
                    options={{ headerShown: false}}
                    >
                    {() => <GradientScreen onToggleDarkMode={() => 
                                setDarkMode(!isDarkMode)} 
                                isDarkMode={isDarkMode} 
                                navigation={navigation}>
                            <Logs />
                            </GradientScreen>}
                </Tab.Screen>

                <Tab.Screen 
                    name="Settings" 
                    options={{ headerShown: false}}
                    >

                    {() => <GradientScreen onToggleDarkMode={() => 
                                setDarkMode(!isDarkMode)} 
                                isDarkMode={isDarkMode} 
                                navigation={navigation}>
                            <Settings />
                            </GradientScreen>}
                </Tab.Screen>
            </Tab.Navigator>
        </View>
    )
}

// Main Stack Navigator
function MainStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabGroup} />
        <Stack.Screen name="Notifications" component={Notifications} />
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