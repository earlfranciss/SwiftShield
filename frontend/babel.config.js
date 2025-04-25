/*module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: ['react-native-reanimated/plugin'],
    };
  };*/

  module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // Add required plugins here:
        'expo-router/babel',              // <--- REQUIRED for Expo Router
        'nativewind/babel',             // <--- REQUIRED for NativeWind
        'react-native-reanimated/plugin', // <--- Keep for Reanimated
        // Add any other plugins you might need
      ],
    };
  };

  /*module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // Required for expo-router
        'expo-router/babel',
        // Other plugins like nativewind/babel, reanimated/plugin might be here too
        'nativewind/babel', // Assuming you set this up for NativeWind
      ],
    };
  };*/
  