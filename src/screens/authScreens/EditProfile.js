import React, { useState, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView 
} from 'react-native';
// --- CLI Replacements ---
import LinearGradient from 'react-native-linear-gradient'; 
import { launchImageLibrary } from 'react-native-image-picker'; 
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; 
// --- End CLI Replacements ---
import config from '../../config/config'; // Assuming this config is correct for BASE_URL

// --- Default Avatar ---
const DEFAULT_AVATAR = require('../../assets/images/ts.png'); // Make sure path is correct

// --- Component ---
// Receive navigation prop from React Navigation
export default function EditProfile({ route, navigation }) {
  // Get userId from route params passed by navigation
  // Assume user ID comes from logged-in state or previous screen, not hardcoded
  const userId = route?.params?.userId || null; // Or get from auth context if available

  if (!userId) {
    console.error('No userId provided');
    return null; // or show fallback UI
  }
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState(null); // URI for display (local or remote)
  const [profileImagePath, setProfileImagePath] = useState(null); // Relative server path for saving
  const [isLoading, setIsLoading] = useState(false); // For update/upload operations
  const [isFetching, setIsFetching] = useState(true); // For initial data load

  // Fetch initial profile data
  useEffect(() => {
    if (userId) { // Only fetch if we have a userId
      fetchProfileData();
    } else {
       console.error("EditProfile: No userId provided.");
       Alert.alert("Error", "Could not load profile. User not identified.");
       setIsFetching(false); // Stop loading state
       // Optionally navigate back if user ID is essential
       // navigation.goBack();
    }
  }, [userId]); // Dependency array ensures fetch runs if userId changes


  // Function to fetch data from backend
  const fetchProfileData = async () => {
    // Ensure you have the correct config object and BASE_URL
     if (!config || !config.BASE_URL) {
       console.error("Config or BASE_URL is missing!");
       Alert.alert("Configuration Error", "Cannot connect to the server.");
       setIsFetching(false);
       return;
     }

    setIsFetching(true);
    setProfileImage(null); // Reset image while fetching
    setProfileImagePath(null);
    try {
      // Use your specific backend endpoint for fetching user profile
      // This usually requires authentication (e.g., sending a token)
      const endpoint = `${config.BASE_URL}/profile/${userId}`; // Assuming endpoint structure
      console.log("Fetching profile from:", endpoint);

      // --- TODO: Add Authentication Headers ---
      // Example: const token = await AsyncStorage.getItem('userToken');
      // const headers = { 'Authorization': `Bearer ${token}` };
      const headers = { 'Content-Type': 'application/json' }; // Placeholder

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch profile data (Status: ${response.status}): ${errorText}`);
      }

      const result = await response.json();
      // Adjust based on your actual backend response structure
      if (result && result.firstName) { // Check if data looks valid
        setFirstName(result.firstName || '');
        setLastName(result.lastName || '');
        setEmail(result.email || '');
        setPhoneNumber(result.phoneNumber || ''); // Assuming key is 'phoneNumber'

        // Handle image path from server
        const imagePath = result.profileImage; // Assuming key is 'profileImage'
        if (imagePath && typeof imagePath === 'string') {
           // Assuming imagePath is relative like '/uploads/profile/user123.jpg'
           setProfileImage(`${config.BASE_URL}${imagePath}`); // Construct full URL
           setProfileImagePath(imagePath); // Store relative path
        } else {
          setProfileImage(null); // No image set
          setProfileImagePath(null);
        }
      } else {
        throw new Error(result.message || 'Invalid profile data received');
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
      Alert.alert('Error', `Could not load profile data: ${error.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  // Request permission and pick image using react-native-image-picker
  const pickImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8, // Image quality (0 to 1)
      includeBase64: false, // Don't include base64 unless needed
      // allowsEditing: true, // Not directly supported, handled by OS gallery usually
      // aspect: [1, 1], // Not directly supported
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', `Image Picker Error: ${response.errorMessage}`);
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        console.log('Image selected:', source.uri);
        // Show selected image immediately
        setProfileImage(source.uri);
        // Upload the image
        uploadProfileImage(source.uri);
      } else {
         console.log("Image picker response missing assets:", response);
      }
    });
  };

  // Upload profile image to server
  const uploadProfileImage = async (imageUri) => {
    // Ensure config is available
     if (!config || !config.BASE_URL) {
       console.error("Config or BASE_URL is missing for upload!");
       Alert.alert("Configuration Error", "Cannot connect to the server.");
       return;
     }

    setIsLoading(true);
    const formData = new FormData();
    const uriParts = imageUri.split('/');
    const fileName = uriParts.pop() || 'profile.jpg'; // Default filename if split fails
    const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpeg'; // Default type
    const mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;

    formData.append('profileImage', { // Match backend expected field name
      uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
      name: fileName,
      type: mimeType,
    });

    try {
      // Endpoint for uploading profile image (usually needs auth)
      const uploadEndpoint = `${config.BASE_URL}/profile/upload/${userId}`; // Assuming this endpoint
      console.log("Uploading image to:", uploadEndpoint);

      // --- TODO: Add Authentication Headers ---
      // Example: const token = await AsyncStorage.getItem('userToken');
      // const headers = { 'Authorization': `Bearer ${token}` };
      const headers = {}; // Placeholder - IMPORTANT: add auth if needed

      const uploadResponse = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        headers: {
          ...headers, // Include auth headers
          // 'Content-Type': 'multipart/form-data', // Let fetch set this automatically for FormData
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`Image Upload Error Response (${uploadResponse.status}):`, errorText);
        throw new Error(`Failed to upload image (Status: ${uploadResponse.status})`);
      }

      const uploadResult = await uploadResponse.json();
      // Adjust based on your backend response structure
      if (uploadResult && uploadResult.profileImage) {
        const newImagePath = uploadResult.profileImage;
        console.log("Upload successful, new image path:", newImagePath);
        if (typeof newImagePath === 'string') {
             setProfileImage(`${config.BASE_URL}${newImagePath}`); // Update display URI
             setProfileImagePath(newImagePath); // Store relative path
             Alert.alert('Success', 'Profile picture updated!');
        } else {
             throw new Error('Server returned an invalid image path format.');
        }
      } else {
        throw new Error(uploadResult.message || 'Server did not return image path after upload');
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert('Error', `Could not upload profile image: ${error.message}`);
      // Optional: Revert profileImage state if upload fails
      // setProfileImage(null); // Or refetch: fetchProfileData();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile update (text fields + image path)
  const handleUpdateProfile = async () => {
    // Ensure config is available
     if (!config || !config.BASE_URL) {
       console.error("Config or BASE_URL is missing for update!");
       Alert.alert("Configuration Error", "Cannot connect to the server.");
       return;
     }
    // Basic validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) { /* ... */ return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { /* ... */ return; }

    setIsLoading(true);
    try {
      // Endpoint for updating profile (needs auth)
      const updateEndpoint = `${config.BASE_URL}/profile/${userId}`; // Assuming this endpoint
      console.log("Updating profile at:", updateEndpoint);

      // --- TODO: Add Authentication Headers ---
      // Example: const token = await AsyncStorage.getItem('userToken');
      // const headers = { 'Authorization': `Bearer ${token}` };
      const headers = { 'Content-Type': 'application/json' }; // Placeholder

      const response = await fetch(updateEndpoint, {
        method: 'PUT', // Use PUT or PATCH as appropriate for your backend
        headers: headers,
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          // Send the relative image path stored in state
          profileImage: profileImagePath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
        console.error("Update failed response:", errorData);
        throw new Error(errorData.message || `Failed to update profile. Status: ${response.status}`);
      }

      const result = await response.json();
      // Adjust based on your backend response
      if (result) { // Check if result is truthy
        Alert.alert('Success', result.message || 'Profile updated successfully!');
        // Optionally navigate back
        navigation.goBack();
      } else {
        throw new Error('Failed to update profile (invalid response)');
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert('Error', `Could not update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Display loading indicator while fetching initial data
  if (isFetching) {
    return (
        <LinearGradient // Use imported LinearGradient
          colors={['#000000', '#0A3815']}
          style={[styles.container, styles.loadingContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ActivityIndicator size="large" color="#3AED97" />
        </LinearGradient>
    );
  }

  // --- Render Logic ---
  return (
    <SafeAreaView style={{flex: 1}}> 
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -150} // Adjust offset if needed
        >
          <LinearGradient // Use imported LinearGradient
            colors={['#000000', '#0A3815']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Custom Header */}
                <View style={styles.header}>
                  {/* Use navigation.goBack() from React Navigation */}
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#3AED97" />
                  </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                  <View style={{ width: 24 }} /> {/* Spacer */}
                </View>

            <ScrollView
               contentContainerStyle={styles.scrollContent}
               keyboardShouldPersistTaps="handled" // Better tap handling with keyboard open
               showsVerticalScrollIndicator={false}
             >
              {/* Profile Picture Section */}
              <View style={styles.profilePicSection}>
                <TouchableOpacity onPress={pickImage} disabled={isLoading}>
                    <Image
                      // Use DEFAULT_AVATAR if profileImage is null/empty
                      source={profileImage ? { uri: profileImage } : DEFAULT_AVATAR}
                      style={styles.avatar}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} disabled={isLoading}>
                    <Text style={styles.changeProfileText}>Change Profile</Text>
                </TouchableOpacity>
              </View>

              {/* Input Fields Section */}
              {/* Removed Platform specific styles, adjust if needed */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#3AED97" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="rgba(49, 238, 154, 0.66)"
                  value={firstName}
                  onChangeText={setFirstName}
                  selectionColor="#3AED97"
                  returnKeyType="next"
                  editable={!isLoading} // Disable input during loading
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#3AED97" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="rgba(49, 238, 154, 0.66)"
                  value={lastName}
                  onChangeText={setLastName}
                  selectionColor="#3AED97"
                  returnKeyType="next"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#3AED97" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="rgba(49, 238, 154, 0.66)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  selectionColor="#3AED97"
                  returnKeyType="next"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="phone-outline" size={20} color="#3AED97" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="rgba(49, 238, 154, 0.66)"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  selectionColor="#3AED97"
                  returnKeyType="done"
                  editable={!isLoading}
                />
              </View>

              {/* Update Button */}
              <TouchableOpacity
                 onPress={handleUpdateProfile}
                 disabled={isLoading || isFetching} // Disable during any loading
                 style={styles.updateButtonWrapper}
                 >
                <LinearGradient
                  colors={['#3AED97', '#FFDD00']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.updateButton}
                >
                  {isLoading ? ( // Show spinner only for update/upload
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.updateButtonText}>UPDATE</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', // Space between back, title, and spacer
      paddingTop: Platform.OS === 'android' ? 25 : 50, // Adjust top padding
      paddingBottom: 15,
      paddingHorizontal: 15, // Horizontal padding
      backgroundColor: 'transparent',
    },
    backButton: {
      padding: 5,
    },
    headerTitle: {
      color: '#3AED97',
      fontSize: 18, // Slightly larger title
      fontWeight: 'bold',
    },
    scrollContent: {
      alignItems: 'center',
      paddingTop: 10, // Add some padding at the top of scrollview
      paddingBottom: 50,
      paddingHorizontal: 25,
    },
    profilePicSection: {
      alignItems: 'center',
      marginVertical: 25, // More vertical space
    },
    avatar: {
      width: 130,
      height: 130,
      borderRadius: 65, // Half of width/height for circle
      // Removed border here, add if needed for styling
    },
    changeProfileText: {
      color: '#3AED97',
      fontSize: 14,
      marginTop: 12, // More space below image
      fontWeight: '500',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(58, 237, 151, 0.1)', // Subtle background tint
      borderRadius: 12,
      borderWidth: 1, // Use border instead of background for outline
      borderColor: '#3AED97',
      paddingHorizontal: 15,
      marginVertical: 10,
      width: '100%',
      height: 55, // Slightly taller input
    },
    inputIcon: {
      marginRight: 12, // More space for icon
    },
    input: {
      flex: 1,
      height: '100%', // Take full height
      color: '#FFFFFF',
      fontSize: 16,
    },
    updateButtonWrapper: {
      width: '80%', // Wider button
      marginTop: 35, // More space above
      marginBottom: 20,
      alignSelf: 'center',
       // Removed shadow for cleaner look, add back if needed
    },
    updateButton: {
      paddingVertical: 16, // Taller button
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    updateButtonText: {
      color: '#000000',
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 1.5, // Adjust spacing
    },
});