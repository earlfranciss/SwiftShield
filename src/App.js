import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import "react-native-gesture-handler";
import Navigation from "./navigation/Navigation";
import {
  NotificationProvider,
  useNotifications,
} from "./utils/NotificationContext";
import NotificationToast from "./components/NotificationToast";
import { ThemeProvider } from "./components/themeContext"; // <<< CORRECT IMPORT ADDED

const AppContent = () => {
  const { inAppNotification, setInAppNotification, setHasUnreadNotifications } =
    useNotifications();

  return (
    <>
      <ThemeProvider>
        <NavigationContainer>
          <Navigation />
        </NavigationContainer>
      </ThemeProvider>

      {/* Notification Toast */}
      {inAppNotification && (
        <NotificationToast
          notification={inAppNotification}
          onPress={(notification) => {
            // Handle navigation carefully
            console.log("Toast pressed, navigate if possible");
            // globalNavigation?.navigate(...);
            setInAppNotification(null);
            // setHasUnreadNotifications(false);
          }}
          onDismiss={() => setInAppNotification(null)}
        />
      )}
    </>
  );
};

const App = () => {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
};

export default App;

// import "react-native-gesture-handler";
// import Navigation from './navigation/Navigation';

// export default function App() {
//   return <Navigation />;
// }

//Version 2
// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import "react-native-gesture-handler";
// import Navigation from './navigation/Navigation';

// const App = () => {
//   console.log('App component with Navigation rendering');
//   return (
//     <NavigationContainer>
//       <Navigation />
//     </NavigationContainer>
//   );
// };

// export default App;

//Testing
// import React, { useEffect } from 'react';
// import { View, Text } from 'react-native';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { enableScreens } from 'react-native-screens';

// // Enable native screens - call this before components render
// enableScreens();

// const HomeScreen = () => (
//   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//     <Text>Home Screen</Text>
//   </View>
// );

// const Stack = createNativeStackNavigator();

// const App = () => {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator>
//         <Stack.Screen name="Home" component={HomeScreen} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// };

// export default App;
