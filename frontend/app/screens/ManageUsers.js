import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// Remove the config import since we're using mock data
// import config from "../../config";

export default function ManageUsers({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for testing - in a real app, this would come from your API
  const mockUsers = [
    { id: 1, name: "John Doe", email: "johndoe@email.com", role: "admin" },
    { id: 2, name: "Jane Smith", email: "janesmith@email.com", role: "user" },
    { id: 3, name: "Bob Johnson", email: "bob@email.com", role: "user" },
    { id: 4, name: "Alice Brown", email: "alice@email.com", role: "user" },
  ];

  useEffect(() => {
    // Fetch users - in a real app, this would be an API call
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call like:
      // const response = await fetch(`${config.BASE_URL}/users`);
      // const data = await response.json();
      // setUsers(data);
      
      // For testing, we'll use mock data
      setTimeout(() => {
        setUsers(mockUsers);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load users");
    }
  };

  const handleRoleToggle = (userId) => {
    // Update user role - in a real app, this would be an API call
    setUsers(users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          role: user.role === "admin" ? "user" : "admin"
        };
      }
      return user;
    }));
    
    // In a real app:
    // try {
    //   await fetch(`${config.BASE_URL}/users/${userId}/role`, {
    //     method: "PUT",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ role: newRole }),
    //   });
    // } catch (error) {
    //   console.error("Error updating user role:", error);
    //   Alert.alert("Error", "Failed to update user role");
    // }
  };

  const handleDeleteUser = (userId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this user?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => {
            // Delete user - in a real app, this would be an API call
            setUsers(users.filter(user => user.id !== userId));
            
            // In a real app:
            // try {
            //   await fetch(`${config.BASE_URL}/users/${userId}`, {
            //     method: "DELETE",
            //   });
            // } catch (error) {
            //   console.error("Error deleting user:", error);
            //   Alert.alert("Error", "Failed to delete user");
            // }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={[
          styles.userRole, 
          item.role === "admin" ? styles.adminRole : styles.userRoleText
        ]}>
          {item.role.toUpperCase()}
        </Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleRoleToggle(item.id)}
        >
          <Ionicons 
            name={item.role === "admin" ? "person-remove" : "person-add"} 
            size={22} 
            color="#218555" 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteUser(item.id)}
        >
          <Ionicons name="trash-outline" size={22} color="#FF4D4F" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#3AED97" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={{ width: 24 }} /> {/* Empty view for spacing */}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3AED97" style={styles.loader} />
      ) : (
        <>
          <Text style={styles.userCount}>{users.length} Users</Text>
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3AED97",
  },
  userCount: {
    fontSize: 16,
    color: "#3AED97",
    marginBottom: 15,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 20,
  },
  userItem: {
    backgroundColor: "rgba(58, 237, 151, 0.2)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: "#FFF",
    marginBottom: 5,
  },
  userRole: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
  },
  adminRole: {
    color: "#3AED97",
  },
  userRoleText: {
    color: "#FCE", // Light color for user role
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
  },
});