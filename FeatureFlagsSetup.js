// FeatureFlagsSetup.js
import { NativeModules } from 'react-native';

// Disable bridgeless architecture feature
if (NativeModules.ReactNativeFeatureFlags) {
  NativeModules.ReactNativeFeatureFlags.setBridgelessArchitectureEnabled(false);
}