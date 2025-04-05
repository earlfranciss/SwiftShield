import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { FontAwesome, Feather } from '@expo/vector-icons';

const EditProfileScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  return (
    <View className="flex-1 bg-black px-6 py-10">
      {/* Profile Image */}
      <View className="items-center">
        <Image
          source={{ uri: 'https://via.placeholder.com/150' }}
          className="w-32 h-32 rounded-full border-2 border-yellow-500"
        />
        <Text className="text-green-400 mt-2 text-lg">Change Profile</Text>
      </View>

      {/* Input Fields */}
      <View className="mt-8">
        <View className="flex-row items-center border border-yellow-500 rounded-lg px-4 py-2 mb-4">
          <FontAwesome name="user" size={20} color="green" />
          <TextInput
            className="flex-1 ml-3 text-white"
            placeholder="First Name"
            placeholderTextColor="gray"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View className="flex-row items-center border border-yellow-500 rounded-lg px-4 py-2 mb-4">
          <FontAwesome name="user" size={20} color="green" />
          <TextInput
            className="flex-1 ml-3 text-white"
            placeholder="Last Name"
            placeholderTextColor="gray"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <View className="flex-row items-center border border-yellow-500 rounded-lg px-4 py-2 mb-4">
          <Feather name="mail" size={20} color="green" />
          <TextInput
            className="flex-1 ml-3 text-white"
            placeholder="Email"
            placeholderTextColor="gray"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View className="flex-row items-center border border-yellow-500 rounded-lg px-4 py-2 mb-6">
          <Feather name="phone" size={20} color="green" />
          <TextInput
            className="flex-1 ml-3 text-white"
            placeholder="Contact Number"
            placeholderTextColor="gray"
            keyboardType="phone-pad"
            value={contactNumber}
            onChangeText={setContactNumber}
          />
        </View>
      </View>

      {/* Edit Button */}
      <TouchableOpacity className="bg-green-400 rounded-lg py-3 items-center">
        <Text className="text-black text-lg font-bold">EDIT</Text>
      </TouchableOpacity>
    </View>
  );
};

export default EditProfileScreen;
