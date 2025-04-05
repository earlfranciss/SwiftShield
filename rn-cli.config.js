module.exports = {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      extraNodeModules: {
        'react-native-reanimated': {
          disableNativeBuild: true
        }
      }
    }
  };