const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
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
    extraNodeModules: {
      stream: require.resolve('readable-stream'),
      util: require.resolve('util'),
      fs: require.resolve('react-native-fs'),
      url: require.resolve('url'),
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify'),
      child_process: path.resolve(__dirname, 'child_process.js'),
      querystring: require.resolve('querystring-es3'),
      https: require.resolve('https-browserify'),
      http2: path.resolve(__dirname, 'http2.js'), // Add http2 placeholder
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      net: require.resolve('react-native-tcp'),
      tls: require.resolve('react-native-tcp'),
      assert: require.resolve('assert'),
      crypto: require.resolve('react-native-crypto'),
      process: require.resolve('process'),
      global: require.resolve('global'),
      'stream-browserify': require.resolve('stream-browserify'), // Add stream-browserify
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);