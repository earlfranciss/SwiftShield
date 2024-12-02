// NotificationScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function Notification({ navigation, isDarkMode }) {
  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#3AED97' : '#fff' }]}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialIcons name="keyboard-arrow-left" size={28} color={isDarkMode ? '#3AED97' : '#000'} />
      </TouchableOpacity>

      <Text style={[styles.text, { color: isDarkMode ? '#fff' : '#000' }]}>
        This is the Notifications Screen
      </Text>
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