import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StyleSheet,
  Animated,
  Modal,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import GradientScreen from '../components/GradientScreen';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import config from '../../config';

// Icon mapping for notification types
const iconMap = {
  "suspicious-icon": require("../../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../../assets/images/safe-icon.png"),
};

// Function to parse time string in format "YYYY-MM-DD HH:MM:SS"
const parseTimeString = (timeString) => {
  try {
    if (!timeString) return null;
    
    // Parse the date string (format: "2025-02-22 16:32:24")
    const [datePart, timePart] = timeString.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    
    // JavaScript months are 0-indexed, so subtract 1 from month
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    
    return date.getTime(); // Return timestamp in milliseconds
  } catch (error) {
    console.error("Error parsing time string:", error);
    return null;
  }
};

// Helper function to format time
const formatTimeAgo = (timestamp) => {
  try {
    // Check if timestamp is valid
    if (!timestamp) {
      return "Unknown time";
    }
    
    // Convert to Date object if it's not already
    const scanTime = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(scanTime.getTime())) {
      return "Unknown time";
    }
    
    const now = new Date();
    const diffMs = now - scanTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} mins. ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error("Error formatting time:", error);
    return "Unknown time";
  }
};

// Notification Item Component
const NotificationItem = ({ item, index, onPress }) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const delay = index * 50;
    Animated.timing(itemFadeAnim, {
      toValue: 1,
      duration: 700,
      delay,
      useNativeDriver: true,
    }).start();
  }, [index]);
  
  // Use either url or link property, depending on what's available
  const displayText = item.url || item.link;
  
  return (
    <TouchableOpacity onPress={() => onPress(item)}>
      <Animated.View 
        style={[
          styles.notificationCard,
          item.read && styles.notificationCardRead,
          { 
            opacity: itemFadeAnim,
            transform: [{ translateY: itemFadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })}] 
          }
        ]}
      >
        <Image 
          source={item.icon === "safe-icon" ? iconMap["safe-icon"] : iconMap["suspicious-icon"]} 
          style={[
            styles.icon,
            item.icon === "safe-icon" && { tintColor: "black" },
            item.read && styles.iconRead
          ]} 
        />
        <Text style={[
          styles.notificationText,
          item.read && styles.notificationTextRead
        ]}>
          {displayText}
        </Text>
        <Text style={[
          styles.timeText,
          item.read && styles.timeTextRead
        ]}>
          {formatTimeAgo(item.timestamp)}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function Notifications({ route, navigation }) {
  const { isDarkMode, onToggleDarkMode } = route.params;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // In-memory read status storage
  const readStatusMap = {};

  const loadReadStatus = async () => {
    return readStatusMap;
  };

  const saveReadStatus = async (readStatusObj) => {
    Object.assign(readStatusMap, readStatusObj);
  };

  // Add a mock data function with realistic data
  const getMockNotifications = () => {
    const now = new Date();
    return [
      {
        id: "1",
        url: "www.malicious.link - SMS",
        link: "www.malicious.link - SMS",
        icon: "suspicious-icon",
        timestamp: now.getTime() - 15 * 60 * 1000, // 15 minutes ago
        read: false,
        details: "WARNING: This link was detected as potentially malicious. It may attempt to steal your personal information."
      },
      {
        id: "2",
        url: "www.safe.link - Email",
        link: "www.safe.link - Email",
        icon: "safe-icon",
        timestamp: now.getTime() - 3 * 60 * 60 * 1000, // 3 hours ago
        read: false,
        details: "This link was scanned and determined to be safe. No malicious content detected."
      },
      {
        id: "3",
        url: "www.safe.link - Facebook",
        link: "www.safe.link - Facebook",
        icon: "safe-icon",
        timestamp: now.getTime() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        read: false,
        details: "This link was scanned and determined to be safe. No malicious content detected."
      }
    ];
  };

  // Generate appropriate details for notification based on scan result
  const generateDetails = (log, timestamp) => {
    const dateString = timestamp ? new Date(timestamp).toLocaleString() : "an unknown time";
    
    if (log.icon === "safe-icon") {
      return `This link was scanned at ${dateString} and determined to be safe. No malicious content detected.`;
    } else {
      return `WARNING: This link was detected as potentially malicious at ${dateString}. It may attempt to steal your personal information. Access has been blocked.`;
    }
  };

  // Function to fetch logs and convert them to notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Check if BASE_URL is defined
      if (!config || !config.BASE_URL) {
        console.log("BASE_URL is not defined in config, using mock data");
        setNotifications(getMockNotifications());
        return;
      }
      
      console.log("Fetching from URL:", `${config.BASE_URL}/logs`);
      const response = await fetch(`${config.BASE_URL}/logs`);
      const data = await response.json();
      console.log("API Response data:", data);
      
      const readStatus = await loadReadStatus();
      
      // Check if data is empty or invalid
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log("No data from API, using mock data");
        setNotifications(getMockNotifications());
        return;
      }
      
      // Convert logs to notifications format with read status - fixed field mapping
      const notificationsData = data.map(log => ({
        ...log,
        read: readStatus[log.id] || false,
        url: log.link, // Map 'link' to 'url'
        timestamp: parseTimeString(log.time), // Parse 'time' string to timestamp
        details: generateDetails(log, parseTimeString(log.time))
      }));
      
      console.log("Processed notification data:", notificationsData);
      setNotifications(notificationsData);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Use mock data if API fails
      console.log("API error, using mock data");
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch notifications when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  // Debug notifications state updates
  useEffect(() => {
    console.log("Notifications state updated:", notifications.length, "items");
  }, [notifications]);

  // Handle notification press
  const handleNotificationPress = async (notification) => {
    // Create updated read status
    const readStatus = await loadReadStatus();
    readStatus[notification.id] = true;
    await saveReadStatus(readStatus);
    
    // Update notifications state
    setNotifications(
      notifications.map(item => 
        item.id === notification.id 
          ? { ...item, read: true } 
          : item
      )
    );
    
    setSelectedNotification({ ...notification, read: true });
    setModalVisible(true);
  };

  // Handle notification deletion
  const handleDeleteNotification = async () => {
    if (selectedNotification) {
      // Update notifications state
      setNotifications(notifications.filter(item => item.id !== selectedNotification.id));
      
      // Remove from read status
      const readStatus = await loadReadStatus();
      delete readStatus[selectedNotification.id];
      await saveReadStatus(readStatus);
      
      setModalVisible(false);
      setSelectedNotification(null);
    }
  };

  // Start fade-in animation when component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <GradientScreen onToggleDarkMode={onToggleDarkMode} isDarkMode={isDarkMode}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start(() => navigation.goBack());
            }}
          >
            <MaterialIcons name="keyboard-arrow-left" size={28} color={isDarkMode ? 'black' : '#3AED97'} />
          </TouchableOpacity>

          {/* Title */}
          <Animated.Text 
            style={[
              styles.title, 
              { color: isDarkMode ? 'black' : '#3AED97' },
              { 
                opacity: fadeAnim,
                transform: [{ 
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  }) 
                }] 
              }
            ]}
          >
            Notifications
          </Animated.Text>

          {/* Notification List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3AED97" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <NotificationItem 
                  item={item} 
                  index={index}
                  onPress={handleNotificationPress}
                />
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              initialNumToRender={8}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="notifications-none" size={50} color="#3AED97" />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                  <Text style={styles.emptySubText}>Scan some URLs to see notifications here</Text>
                </View>
              }
            />
          )}
          
          {/* Notification Detail Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                {selectedNotification && (
                  <>
                    <View style={styles.modalHeader}>
                      <Image 
                        source={selectedNotification.icon === "safe-icon" ? iconMap["safe-icon"] : iconMap["suspicious-icon"]} 
                        style={[
                          styles.modalIcon,
                          selectedNotification.icon === "safe-icon" && { tintColor: "black" }
                        ]} 
                      />
                      <Text style={styles.modalTitle}>{selectedNotification.url || selectedNotification.link}</Text>
                    </View>
                    
                    <Text style={styles.modalTime}>{formatTimeAgo(selectedNotification.timestamp)}</Text>
                    
                    <View style={styles.modalDivider} />
                    
                    <Text style={styles.modalDetails}>
                      {selectedNotification.details}
                    </Text>

                    {selectedNotification.title && (
                      <Text style={styles.modalSource}>
                        Type: {selectedNotification.title}
                      </Text>
                    )}
                    
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.button, styles.buttonOkay]}
                        onPress={() => setModalVisible(!modalVisible)}
                      >
                        <Text style={styles.textStyle}>Okay</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.button, styles.buttonDelete]}
                        onPress={handleDeleteNotification}
                      >
                        <Text style={styles.textStyle}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>
          
        </Animated.View>
      </GradientScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 10,
    zIndex: 10,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#3AED97",
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 5,
  },
  notificationCardRead: {
    backgroundColor: "rgba(58, 237, 151, 0.6)",
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  iconRead: {
    opacity: 0.6,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  notificationTextRead: {
    fontWeight: "normal",
    opacity: 0.7,
  },
  timeText: {
    fontSize: 12,
    color: "#000",
  },
  timeTextRead: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#3AED97',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#3AED97',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubText: {
    color: '#3AED97',
    fontSize: 14,
    marginTop: 5,
    opacity: 0.7,
  },
  // Modal styles
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '80%',
    backgroundColor: "#000",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#3AED97",
    padding: 20,
    alignItems: "center",
    shadowColor: "#3AED97",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginBottom: 10,
  },
  modalIcon: {
    width: 28,
    height: 28,
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    color: "#3AED97",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalTime: {
    alignSelf: "flex-start",
    color: "#999",
    fontSize: 12,
    marginBottom: 15,
  },
  modalDivider: {
    height: 1,
    width: "100%",
    backgroundColor: "#3AED97",
    marginBottom: 15,
  },
  modalDetails: {
    color: "#fff",
    fontSize: 14,
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalSource: {
    color: "#999",
    fontSize: 12,
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    borderRadius: 10,
    padding: 10,
    width: "48%",
    elevation: 2,
    alignItems: "center",
  },
  buttonOkay: {
    backgroundColor: "#3AED97",
  },
  buttonDelete: {
    backgroundColor: "#FF3B30",
  },
  textStyle: {
    color: "black",
    fontWeight: "bold",
    textAlign: "center",
  },
});