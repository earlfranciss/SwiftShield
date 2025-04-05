module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
      //"nativewind/babel", 
      'react-native-reanimated/plugin', 
      "@babel/plugin-transform-template-literals",
    ],
  };
};