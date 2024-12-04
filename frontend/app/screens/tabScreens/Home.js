import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, Text, View, TextInput, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export default function Home() {
  const [url, setUrl] = useState('');

  const handleScan = () => {
    console.log('Scanning URL:', url);
    // Add your URL scanning logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Power Icon and Protection Status */}
      <View style={styles.iconContainer}>
        <Image
          source={require('../../../assets/images/enableButton.png')} // Replace with actual icon image URL
          style={styles.powerIcon}
        />
        <Text style={styles.protectionText}>Web Protection</Text>
        <Text style={styles.statusText}>Enabled</Text>
      </View>

      {/* Input and Scan Button */}
      <View style={styles.inputContainer}>
        <Text style={styles.scanLabel}>Scan URL:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="www.malicious.link"
          placeholderTextColor="#6c757d"
          onChangeText={(text) => setUrl(text)}
          value={url}
        />
        <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
          <Text style={styles.scanButtonText}>SCAN</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },

  powerIcon: {
    width: 130, // Adjust the size to match the UI
    height: 140,
    resizeMode: 'contain',
  },
  
  protectionText: {
    color: '#31EE9A',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
  },

  statusText: {
    color: '#31EE9A',
    fontSize: 16,
    fontWeight: '400',
    marginTop: 5,
  },

  inputContainer: {
    width: '80%',
    alignItems: 'flex-start',
  },

  scanLabel: {
    color: '#31EE9A',
    fontSize: 16,
    marginBottom: 10,
    marginLeft: 5,
  },

  textInput: {
    width: '100%',
    height: 50,
    borderColor: '#BCE26E',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#ffffff',
    backgroundColor: '#002b36',
    marginBottom: 20,
  },

  scanButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FCDE58', // Button background color
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },

  scanButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
