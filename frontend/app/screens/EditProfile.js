import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView // Import KeyboardAvoidingView
} from 'react-native';
// Removed unused MaterialIcons import
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// --- IMPORTANT ---
// 1. For **Android Emulator**: Use 'http://10.0.2.2:5000/api'
// 2. For **iOS Simulator**: Use 'http://localhost:5000/api'
// 3. For **PHYSICAL DEVICE**: Replace '10.0.2.2' or 'localhost' with your
//    COMPUTER'S local network IP address (e.g., 'http://192.168.1.100:5000/api').
//    Ensure your device is on the same Wi-Fi network as your computer running the server.
const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000', // Base URL for Android Emulator
  ios: 'http://localhost:5000',    // Base URL for iOS Simulator
  default: 'hhttp://localhost:5000', // Replace with your IP for physical device
});
const API_URL = `${API_BASE_URL}/api`; // Append /api path

// --- Make sure you have a default image in your assets ---
const DEFAULT_AVATAR = require('../../assets/images/ts.png'); // Adjust path if needed

export default function EditProfile({ route }) { // Remove navigation from props if not used elsewhere
  const router = useRouter(); // Get the router object
  const userId = route?.params?.userId || null; // Keep accessing route params
  // ... rest of your state and useEffect hooks ...

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState(null); // Store full image URI (including base URL if from server)
  const [profileImagePath, setProfileImagePath] = useState(null); // Store relative path for sending to backend
  const [isLoading, setIsLoading] = useState(false); // For update/upload operations
  const [isFetching, setIsFetching] = useState(true); // For initial data load

  // Fetch initial profile data
  useEffect(() => {
    fetchProfileData();
  }, [userId]); // Re-fetch if userId changes (though unlikely in this context)

  // Function to fetch data from backend
  const fetchProfileData = async () => {
    setIsFetching(true);
    setProfileImage(null); // Reset image while fetching
    setProfileImagePath(null);
    try {
      // Backend endpoint should ideally identify user via token/session,
      // but can use userId if explicitly passed for specific scenarios.
      const endpoint = userId ? `${API_URL}/profile/${userId}` : `${API_URL}/profile`; // Adjust if your default endpoint needs auth
      const response = await fetch(endpoint); // Add auth headers if needed

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch profile data (Status: ${response.status}): ${errorText}`);
      }

      const result = await response.json();
      if (result.success && result.profile) {
        const { firstName, lastName, email, phoneNumber, profileImage: imagePath } = result.profile;
        setFirstName(firstName || '');
        setLastName(lastName || '');
        setEmail(email || '');
        setPhoneNumber(phoneNumber || '');

        // If profileImage path exists and starts with '/', assume it's a relative server path
        if (imagePath && typeof imagePath === 'string' && imagePath.startsWith('/')) {
           setProfileImage(`${API_BASE_URL}${imagePath}`); // Set full URL for display
           setProfileImagePath(imagePath); // Store relative path for update payload
        } else {
          setProfileImage(null); // No valid image path from server
          setProfileImagePath(null);
        }
      } else {
        throw new Error(result.message || 'Failed to parse profile data');
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert('Error', `Could not load profile data: ${error.message}`);
      // Keep existing data or clear fields? Depending on desired UX.
    } finally {
      setIsFetching(false);
    }
  };

  // Request permission and pick image
  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }
    }

    try {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8, // Compress image slightly
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            // Immediately show the locally selected image for better UX
            setProfileImage(result.assets[0].uri);
            // Upload the image to the server
            uploadProfileImage(result.assets[0].uri);
        }
    } catch (error) {
        console.error("ImagePicker Error: ", error);
        Alert.alert('Error', 'Could not pick image.');
    }
  };

  // Upload profile image to server
  const uploadProfileImage = async (imageUri) => {
    setIsLoading(true); // Indicate upload activity
    try {
      const formData = new FormData();
      const uriParts = imageUri.split('/');
      const fileName = uriParts[uriParts.length - 1];

      let fileType = fileName.split('.').pop(); // Get extension
      // Basic mime type mapping
      const mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;

      formData.append('profileImage', {
        uri: imageUri,
        name: fileName,
        type: mimeType, // Dynamically set mime type
      });

      // Backend endpoint should identify user via token/session for upload
      const uploadEndpoint = userId ?
        `${API_URL}/profile/upload/${userId}` :
        `${API_URL}/profile/upload`; // Adjust if your default endpoint needs auth

      const uploadResponse = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        headers: {
          // 'Content-Type': 'multipart/form-data', // This header is usually set automatically by fetch with FormData
          // Add authentication headers if required
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to upload image (Status: ${uploadResponse.status}): ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      if (uploadResult.success && uploadResult.profileImage) {
        // Server returns the *new* relative path
        const newImagePath = uploadResult.profileImage;
        if (newImagePath.startsWith('/')) {
             setProfileImage(`${API_BASE_URL}${newImagePath}`); // Update display URI
             setProfileImagePath(newImagePath); // Update path to be saved later
             Alert.alert('Success', 'Profile picture updated!');
        } else {
             throw new Error('Server returned an invalid image path.');
        }
      } else {
        throw new Error(uploadResult.message || 'Failed to process uploaded image');
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert('Error', `Could not upload profile image: ${error.message}`);
      // Optional: Revert profileImage state to previous value if upload fails
      // fetchProfileData(); // Or refetch to get the last known good state
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile update (text fields + image path)
  const handleUpdateProfile = async () => {
    // Basic validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Missing Information', 'Please fill in First Name, Last Name, and Email.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      // Backend endpoint should identify user via token/session
      const updateEndpoint = userId ?
        `${API_URL}/profile/${userId}` :
        `${API_URL}/profile`; // Adjust if default endpoint needs auth

      const response = await fetch(updateEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if required
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          // Send the *relative* image path stored in state, or null if no image
          profileImage: profileImagePath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => response.text()); // Try JSON, fallback text
        console.error("Update failed response:", errorData);
        throw new Error(`Failed to update profile. Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', result.message || 'Profile updated successfully!');
        // Optionally navigate back after successful update
        // navigation.goBack();
      } else {
        throw new Error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert('Error', `Could not update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed goToSettings function as it's replaced by navigation.goBack()

  // Display loading indicator while fetching initial data
  if (isFetching) {
    return (
      <LinearGradient
        colors={['#000000', '#0A3815']} // Target gradient
        style={[styles.container, styles.loadingContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ActivityIndicator size="large" color="#3AED97" />
      </LinearGradient>
    );
  }

  return (
    // Added KeyboardAvoidingView
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
    >
      <LinearGradient
        colors={['#000000', '#0A3815']} // Target gradient
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Custom Header */}
            <View style={styles.header}>
              {/* Use router.back() for Expo Router */}
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={20} color="#3AED97" />
               </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={{ width: 10 }} /> {/* Spacer */}
            </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Profile Picture Section */}
          <View style={styles.profilePicSection}>
          <TouchableOpacity onPress={pickImage}>
            <View style={styles.avatarContainer}>
              <Image
                source={profileImage ? { uri: profileImage } : require('../../assets/images/ts.png')}
                style={styles.avatar}
              />
             
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.changeProfileText}>Change Profile</Text>
          </TouchableOpacity>
        </View>

          {/* Input Fields Section */}
          {/* Using Platform specific padding for input container */}
          <View style={[styles.inputContainer, Platform.OS === 'ios' && styles.inputContainerIOS]}>
            <Ionicons name="person-outline" size={20} color="#3AED97" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="rgba(49, 238, 154, 0.66)"
              value={firstName}
              onChangeText={setFirstName}
              selectionColor="#3AED97"
              returnKeyType="next"
            />
          </View>

          <View style={[styles.inputContainer, Platform.OS === 'ios' && styles.inputContainerIOS]}>
            <Ionicons name="person-outline" size={20} color="#3AED97" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="rgba(49, 238, 154, 0.66)"
              value={lastName}
              onChangeText={setLastName}
              selectionColor="#3AED97"
              returnKeyType="next"
            />
          </View>

          <View style={[styles.inputContainer, Platform.OS === 'ios' && styles.inputContainerIOS]}>
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
            />
          </View>

          <View style={[styles.inputContainer, Platform.OS === 'ios' && styles.inputContainerIOS]}>
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
            />
          </View>

          {/* Update Button */}
          <TouchableOpacity
             onPress={handleUpdateProfile}
             disabled={isLoading} // Disable button during loading states
             style={styles.updateButtonWrapper}
             
             >
            <LinearGradient
              // Target gradient: Green to Yellowish
              colors={['#3AED97', '#FFDD00']} // Adjusted yellow to match target better
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.updateButton}
            >
              {isLoading && !isFetching ? ( // Show spinner only for update/upload, not initial fetch
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.updateButtonText}>UPDATE</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

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
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 15 : 20, // More space for notch/status bar
    paddingBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: 'transparent', // Let gradient show through
  },
  backButton: {
    padding: 5, // Hit area
  },
  headerTitle: {
    color: '#3AED97',
    fontSize: 17,
    fontWeight: 'bold',
    paddingVertical: 5,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 50, // Space at the bottom
    paddingHorizontal: 25, // Consistent horizontal padding
  },
  profilePicSection: {
    alignItems: 'center',
    marginVertical: 20, // Vertical space around profile pic
  },
  // Removed avatarContainer style
  avatar: {
    width: 130, // Match target image size
    height: 130,
    borderRadius: 65, // Make it circular
    borderWidth: 0, // Apply border directly to image
    borderColor: '#3AED97', // Match target border color
  },
  // Removed editIconOverlay style
  changeProfileText: {
    color: '#3AED97',
    fontSize: 14,
    marginTop: 10, // Margin applied to wrapper TouchableOpacity now
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'Transparent', // Dark input background like target
    borderRadius: 12, // Rounded corners
    borderWidth: 1.5, // Thicker border
    borderColor: '#3AED97', // Bright green border
    paddingHorizontal: 15,
    marginVertical: 10, // Space between inputs
    width: '100%', // Use full width within scroll content padding
    height: 50, // Consistent input height
  },
  inputContainerIOS: { // Optional iOS specific adjustments
     // e.g., paddingVertical: 18,
  },
  inputIcon: {
    marginRight: 10, // Space between icon and text input
  },
  input: {
    flex: 1,
    height: 55, // Fill height
    color: '#FFFFFF', // White text
    fontSize: 16,
  },
  updateButtonWrapper: {
    width: '70%', // Button width relative to container
    marginTop: 30, // Space above button
    marginBottom: 10, // Space below button
    alignSelf: 'center', // Center the button wrapper
     shadowColor: "#000", // Optional shadow like target
     shadowOffset: {
         width: 0,
         height: 3,
     },
     shadowOpacity: 0.27,
     shadowRadius: 4.65,
     elevation: 6,
  },
  updateButton: {
    paddingVertical: 15, // Button height
    borderRadius: 10, // Match input rounding
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#000000', // Black text
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});