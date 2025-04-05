module.exports = {
    dependencies: {
      // Override autolinking for packages where it guesses wrong.
      // Provide the correct Java/Kotlin package import path and how to instantiate it.
      'react-native-android-sms-listener': {
        platforms: {
          android: {
            // Correct path to the main package class
            packageImportPath: 'import com.centaurwarchief.smslistener.SmsListenerPackage;',
            // How to create an instance (matches manual addition)
            packageInstance: 'new SmsListenerPackage()',
          },
        },
      },
      'react-native-linear-gradient': {
        platforms: {
          android: {
            packageImportPath: 'import com.BV.LinearGradient.LinearGradientPackage;',
            packageInstance: 'new LinearGradientPackage()',
          },
        },
      },
      'react-native-push-notification': {
        platforms: {
          android: {
            packageImportPath: 'import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;',
            packageInstance: 'new ReactNativePushNotificationPackage()',
          },
        },
      },
      // --- IMPORTANT ---
      // You might also need to NULL out the default config for others
      // if they were patched and autolinking still conflicts, OR if
      // they don't need specific linking (like pure JS libs wrongly detected).
      // Example (only if needed):
      // 'some-other-library': {
      //   platforms: {
      //     android: null, // disable Android autolinking for this lib
      //     ios: null, // disable iOS autolinking for this lib
      //   },
      // },
    },
    // assets: ['./src/assets/fonts/'], // Keep if needed for fonts
  };