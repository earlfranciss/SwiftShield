import { useEffect } from "react";
import { Alert } from "react-native";
import SmsListener from "react-native-android-sms-listener";

const SMSReader = () => {
    useEffect(() => {
        const subscription = SmsListener.addListener(message => {
            console.log("Received SMS:", message);
            Alert.alert("New SMS", message.body);

            // Send the SMS data to Flask backend
            fetch(`${config.BASE_URL}/sms/receive-sms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from: message.originatingAddress, body: message.body })
            });
        });

        // Cleanup the listener when unmounting
        return () => subscription.remove();
    }, []);

    return null; // This component doesn't render anything
};

export default SMSReader;
