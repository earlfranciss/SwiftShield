import React, { useEffect } from "react";
import { Alert, PermissionsAndroid } from "react-native";
import SmsListener from "react-native-android-sms-listener";

const SMSListener = () => {
  useEffect(() => {
    requestSMSPermission();

    // ✅ Start listening for SMS when component mounts
    const subscription = SmsListener.addListener((message) => {
      console.log("Received SMS:", message.body);

      // ✅ Show full SMS content in an alert
      Alert.alert("New SMS Received", message.body);
    });

    return () => subscription.remove(); // ✅ Cleanup listener when unmounting
  }, []);

  const requestSMSPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        {
          title: "SMS Permission",
          message: "This app requires SMS access to display incoming messages.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Permission Denied", "Cannot read incoming SMS.");
      }
    } catch (err) {
      console.warn(err);
    }
  };

  return null; // ✅ No UI needed, background SMS listener
};

export default SMSListener;
