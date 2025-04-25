/*const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  maxWorkers: 2, // Reduce worker count to save memory
  resetCache: true,
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

// Learn more https://docs.expo.dev/guides/customizing-metro
/*const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} 
const config = getDefaultConfig(__dirname);

// Add any custom modifications here if needed, but start with the default.
// config.resolver.assetExts.push('...');
// config.transformer.getTransformOptions = async () => ({ ... });

module.exports = config;*/