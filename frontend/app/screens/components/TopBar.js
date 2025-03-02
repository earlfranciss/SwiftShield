// components/TopBar.js

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function TopBar({ onToggleDarkMode, isDarkMode, navigation }) {
  return (
    <View style={styles.topBar}>
        {/* App Name */}
        <Text style={[styles.logoText, { color: isDarkMode ? 'black' : '#3AED97' }]}>
            SwiftShield
        </Text>
        <View style={styles.topBarIcons}>
            {/* Toggle on/off dark mode */}
            <TouchableOpacity onPress={onToggleDarkMode}>
                <Ionicons 
                    name={isDarkMode ? "sunny-outline" : "moon-outline"}
                    size={24} 
                    color={isDarkMode ? "black" : "#3AED97"}
                />
            </TouchableOpacity>
            
            {/* Open Notifications */}
            <TouchableOpacity onPress={() => navigation.navigate('Notifications', { isDarkMode, onToggleDarkMode })}>
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

const styles = StyleSheet.create({
  topBar: {
    height: 60,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default TopBar;
