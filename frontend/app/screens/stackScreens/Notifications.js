import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import GradientScreen from '../components/GradientScreen';  // Correct import

export default function Notification({ navigation, route }) {
  const { isDarkMode, onToggleDarkMode } = route.params;
  
  return (
    <View style={{ flex: 1 }}>
      {/* Apply GradientScreen as a wrapper for content */}
      <GradientScreen
        onToggleDarkMode={onToggleDarkMode}
        isDarkMode={isDarkMode}
      >
        <View style={styles.container}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="keyboard-arrow-left" size={28} color={isDarkMode ? 'black' : 'green'} />
          </TouchableOpacity>

          <Text style={[styles.text, { color: isDarkMode ? 'black' : 'green' }]}>
            This is the Notifications Screen
          </Text>
        </View>
      </GradientScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
  },
});
