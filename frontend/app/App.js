import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Navigation from './Navigation'; // your navigation component
import { DarkModeProvider } from './screens/context/DarkModeContext'; // the context

export default function App() {
  return (
    // Only one NavigationContainer here, wrapping the entire app
    <NavigationContainer>
      <DarkModeProvider>
        <Navigation /> {/* Main navigation logic */}
      </DarkModeProvider>
    </NavigationContainer>
  );
}
