/**
  * @format
*/  
import {AppRegistry} from 'react-native';
import App from './src/App'; 
import {name as appName} from './app.json';
import './FeatureFlagsSetup';

AppRegistry.registerComponent("SwiftShield", () => App);


//Testing
// import React from 'react';
// import { AppRegistry, SafeAreaView, Text, View } from 'react-native';

// // Minimal app for testing
// const App = () => {
//   return (
//     <SafeAreaView style={{ flex: 1 }}>
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <Text>Test App Running</Text>
//       </View>
//     </SafeAreaView>
//   );
// };

// // Register the app
// AppRegistry.registerComponent('swiftshield', () => App);

// import React from 'react';
// import { AppRegistry, SafeAreaView, Text, View, StyleSheet } from 'react-native';
// import { setUpGlobals } from 'react-native/Libraries/Core/setUpGlobals';
// setUpGlobals({
//   setBridgelessArchitectureEnabled: () => false
// });
// // Minimal app for testing
// const App = () => {
//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.content}>
//         <Text style={styles.title}>SwiftShield</Text>
//         <Text style={styles.subtitle}>Minimal Test Version</Text>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f9fa',
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 10,
//     color: '#3c4043',
//   },
//   subtitle: {
//     fontSize: 18,
//     color: '#5f6368',
//   },
// });

// // Register the app
// AppRegistry.registerComponent('swiftshield', () => App);


