import React from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert // Import Alert for feedback (optional)
} from "react-native";
// *** 1. Import AsyncStorage ***
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Settings({ navigation, isDarkMode, isAdmin }) {
    // Log received isAdmin prop for debugging
    console.log(">>> Settings Component RENDER: Received isAdmin Prop:", isAdmin, "(Type:", typeof isAdmin + ")");

    // --- Handlers ---

    // *** 2. Modify handleSignOut ***
    const handleSignOut = async () => { // Make the function async
        console.log("LOGOUT: handleSignOut function initiated.");
        try {
            console.log("LOGOUT: Attempting to remove 'userData' from AsyncStorage...");
            await AsyncStorage.removeItem('userData'); // Remove the user data key
            console.log("LOGOUT: Successfully removed 'userData'. Navigating to Login.");
            // Navigate to Login screen AFTER successfully removing data
            // Replace ensures the user can't press 'back' to get into the settings again
            navigation.replace("Login");
        } catch (error) {
            console.error("LOGOUT ERROR: Failed to remove 'userData' from AsyncStorage:", error);
            // Show an error message to the user (optional but good practice)
            Alert.alert("Logout Error", "Could not clear session data. Please try again.");
            // Still attempt to navigate to Login even if clearing failed,
            // but the stale data might still be there on next launch.
            navigation.replace("Login");
        }
    };

    // Other handlers remain the same
    const handleProfilePress = () => navigation.navigate("EditProfile");
    const handleManageUsersPress = () => navigation.navigate("ManageUsers"); // Ensure this screen exists in SettingsStackNav
    const handlePushNotificationsPress = () => navigation.navigate('PushNotifications'); // Ensure this screen exists
    const handleConnectedAppsPress = () => navigation.navigate('ConnectedApps'); // Ensure this screen exists
    const handleHowToUsePress = () => console.log("How to use pressed (Implement navigation if needed)");
    const handleHelpSupportPress = () => navigation.navigate("Reports", { isDarkMode }); // Ensure Reports screen exists
    const handlePrivacyPolicyPress = () => console.log("Privacy Policy pressed (Implement navigation if needed)");
    // --- End Handlers ---


    // --- Conditional Rendering Logic ---
    // Keep the explicit check for debugging purposes for now
    let showManageUsersButton = false;
    if (isAdmin === true) {
         console.log(">>> Settings Component RENDER: Condition (isAdmin === true) MET. Rendering 'Manage Users' button.");
         showManageUsersButton = true;
    } else {
         // Log why the button isn't showing if isAdmin is not strictly true
         console.log(">>> Settings Component RENDER: Condition (isAdmin === true) NOT MET. 'Manage Users' button will be hidden.");
    }
    // --- End Conditional Rendering Logic ---


    // --- JSX Structure ---
    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Profile Section */}
            <TouchableOpacity style={styles.profileSection} onPress={handleProfilePress} activeOpacity={0.7}>
                 <View style={styles.avatar}><Text style={styles.avatarIcon}>👤</Text></View>
                 <View>
                    {/* TODO: Replace placeholders with actual user data from state/context */}
                    <Text style={styles.name}>John Doe</Text>
                    <Text style={styles.email}>johndoe@email.com</Text>
                 </View>
            </TouchableOpacity>

            {/* Top Options Section */}
            <View style={styles.optionsGroup}>
                <TouchableOpacity style={styles.optionButton} onPress={handlePushNotificationsPress}>
                    <Text style={styles.optionText}>Push Notifications</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionButton} onPress={handleConnectedAppsPress}>
                    <Text style={styles.optionText}>Connected Apps</Text>
                </TouchableOpacity>
            </View>

            {/* Footer Options Section */}
            <View style={styles.footerOptionsGroup}>

                {/* Conditionally Render Manage Users Button */}
                {showManageUsersButton && (
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={handleManageUsersPress}
                    >
                        <Text style={styles.optionText}>Manage Users</Text>
                    </TouchableOpacity>
                )}
                {/* End Manage Users Button */}


                <TouchableOpacity style={styles.optionButton} onPress={handleHowToUsePress}>
                    <Text style={styles.optionText}>How to use the app</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionButton} onPress={handleHelpSupportPress}>
                    <Text style={styles.optionText}>Help and Support</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionButton} onPress={handlePrivacyPolicyPress}>
                    <Text style={styles.optionText}>Privacy Policy</Text>
                </TouchableOpacity>

                {/* Log out Button */}
                {/* Ensure the onPress points to the modified handleSignOut */}
                <TouchableOpacity style={styles.logOutButton} onPress={handleSignOut}>
                    <Text style={styles.logOutText}>Log out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: "center",
        paddingVertical: 20,
        paddingHorizontal: '5%',
        backgroundColor: '#000', // Match your theme
    },
    profileSection: {
        backgroundColor: "#3AED97",
        width: "100%",
        borderRadius: 15,
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        marginBottom: 20,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#000",
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
     avatarIcon: { fontSize: 28, color: '#3AED97' },
    name: { fontSize: 16, fontWeight: "bold", color: "#000" },
    email: { fontSize: 13, color: "#000" },
    optionsGroup: { width: '100%', marginBottom: 20, },
    footerOptionsGroup: {
        width: '100%',
        marginTop: 'auto', // Pushes this group towards the bottom
        paddingTop: 80, // Adjusted spacing
        alignItems: 'center',
        paddingBottom: 20, // Add padding at the bottom
    },
    optionButton: {
        backgroundColor: "#3AED97",
        width: "100%",
        borderRadius: 15,
        paddingVertical: 18,
        paddingHorizontal: 20,
        alignItems: "flex-start",
        marginVertical: 8,
    },
    optionText: { color: "#000", fontSize: 14, fontWeight: "500" },
    logOutButton: {
        backgroundColor: "#FF0000", // Red for logout
        width: "100%",
        borderRadius: 15,
        paddingVertical: 18,
        alignItems: "center", // Center text
        marginTop: 15, // More space above logout
    },
    logOutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});