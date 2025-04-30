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
  ActivityIndicator,
  PanResponder,
  Alert
} from 'react-native';
// Replace Expo vector icons with react-native-vector-icons
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import GradientScreen from '../../components/GradientScreen';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import config from '../../config/config';
import DetailsModal from '../../components/DetailsModal';

// Icon mapping for notification types
const iconMap = {
  "suspicious-icon": require("../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../assets/images/safe-icon.png"),
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

// Notification Item Component with swipe functionality
const NotificationItem = ({ 
  item, 
  index, 
  onPress, 
  onDelete, 
  isSelected,
  onSelect,
  isMultiSelectMode,
  openSwipeId,
  setOpenSwipeId
}) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const selectionScale = useRef(new Animated.Value(1)).current;
  
  // Add a fade animation for the delete button
  const deleteButtonOpacity = useRef(new Animated.Value(0)).current;
  
  // Reset swipe position when another notification is swiped
  useEffect(() => {
    if (openSwipeId !== item.id && swipeAnim._value !== 0) {
      Animated.spring(swipeAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      
      // Hide delete button
      Animated.timing(deleteButtonOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [openSwipeId]);

  // Configure pan responder for swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isMultiSelectMode,
      onMoveShouldSetPanResponder: (_, gestureState) => 
        !isMultiSelectMode && Math.abs(gestureState.dx) > 5,
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx)
        const newX = Math.min(0, gestureState.dx);
        // Limit maximum swipe distance
        const limitedX = Math.max(-80, newX);
        swipeAnim.setValue(limitedX);
        
        // Gradually show delete button based on swipe distance
        const normalizedSwipe = Math.min(Math.abs(limitedX) / 80, 1);
        deleteButtonOpacity.setValue(normalizedSwipe);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) { // If swiped far enough left
          setOpenSwipeId(item.id); // Track this as the open swipe
          Animated.spring(swipeAnim, {
            toValue: -80,
            friction: 6,
            useNativeDriver: true,
          }).start();
          
          // Show delete button
          Animated.timing(deleteButtonOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else {
          setOpenSwipeId(null);
          Animated.spring(swipeAnim, {
            toValue: 0,
            friction: 6,
            useNativeDriver: true,
          }).start();
          
          // Hide delete button
          Animated.timing(deleteButtonOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Main animation for item appearance
  useEffect(() => {
    const delay = index * 50;
    Animated.timing(itemFadeAnim, {
      toValue: 1,
      duration: 700,
      delay,
      useNativeDriver: true,
    }).start();
  }, [index]);
  
  // Animation for selection
  useEffect(() => {
    Animated.sequence([
      Animated.timing(selectionScale, {
        toValue: isSelected ? 0.95 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(selectionScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();
  }, [isSelected]);
  
  // Use either url or link property, depending on what's available
  const displayText = item.url || item.link;
  
  const handleLongPress = () => {
    if (!isMultiSelectMode) {
      onSelect(item.id); // This will also trigger setMultiSelectMode(true)
    }
  };

  const handlePress = () => {
    if (isMultiSelectMode) {
      onSelect(item.id);
    } else {
      onPress(item);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.notificationItemContainer,
        { 
          opacity: itemFadeAnim,
          transform: [
            { translateY: itemFadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }
          ]
        }
      ]}
    >
      {/* Delete button (circular) */}
      <Animated.View 
        style={[
          styles.deleteButtonContainer,
          { opacity: deleteButtonOpacity }
        ]}
      >
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <MaterialIcons name="delete" size={18} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      
      {/* Main notification card with swipe animation */}
      <Animated.View 
        style={[
          styles.notificationCardWrapper,
          { transform: [{ translateX: swipeAnim }] }
        ]}
        {...(isMultiSelectMode ? {} : panResponder.panHandlers)}
      >
        <TouchableOpacity 
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={300}
          activeOpacity={0.8}
        >
         {/* Style order: base, read status, type-specific, combined for read+type, selection */}
         <Animated.View 
            style={[
              styles.notificationCard,
              // First apply base type-specific styling
              item.icon === "suspicious-icon" ? styles.notificationCardMalicious : null,
              // Then apply read status
              item.read && (item.icon === "suspicious-icon" 
                ? styles.notificationCardMaliciousRead 
                : styles.notificationCardRead),
              // Then apply selection styling that preserves the type distinction
              isSelected && (item.icon === "suspicious-icon" 
                ? styles.notificationCardMaliciousSelected 
                : styles.notificationCardSelected)
            ]}
          >
            {isMultiSelectMode && (
              <View style={styles.checkboxContainer}>
                <View style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected
                ]}>
                  {isSelected && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </View>
              </View>
            )}
            
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
      </Animated.View>
    </Animated.View>
  );
};

export default function Notifications({ route, navigation }) {
  const { isDarkMode, onToggleDarkMode } = route.params;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-select mode state
  const [isMultiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // State to track which notification has an open swipe action
  const [openSwipeId, setOpenSwipeId] = useState(null);
  
  // Animation for multi-select mode transition
  const multiSelectAnim = useRef(new Animated.Value(0)).current;
  
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
        details: "WARNING: This link was detected as potentially malicious. It may attempt to steal your personal information.",
        severity: "critical",
        phishing_percentage: 95,
        recommended_action: "Do not visit this site",
        platform: "SMS"
      },
      {
        id: "2",
        url: "www.safe.link - Email",
        link: "www.safe.link - Email",
        icon: "safe-icon",
        timestamp: now.getTime() - 3 * 60 * 60 * 1000, // 3 hours ago
        read: false,
        details: "This link was scanned and determined to be safe. No malicious content detected.",
        severity: "safe",
        phishing_percentage: 5,
        recommended_action: "Safe to visit",
        platform: "Email"
      },
      {
        id: "3",
        url: "www.safe.link - Facebook",
        link: "www.safe.link - Facebook",
        icon: "safe-icon",
        timestamp: now.getTime() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        read: false,
        details: "This link was scanned and determined to be safe. No malicious content detected.",
        severity: "low",
        phishing_percentage: 15,
        recommended_action: "Safe to visit with caution",
        platform: "Facebook"
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
        details: generateDetails(log, parseTimeString(log.time)),
        date_scanned: log.time, // Add date_scanned for DetailsModal
        log_id: log.id, // Add log_id for DetailsModal to use in delete operations
        severity: log.icon === "safe-icon" ? "safe" : "critical", // Map icon to severity
        phishing_percentage: log.icon === "safe-icon" ? 5 : 95, // Map icon to percentage
        recommended_action: log.icon === "safe-icon" ? "Safe to visit" : "Do not visit this site", // Map icon to action
        platform: log.title || "Unknown" // Use title as platform or default to Unknown
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
      // Exit multi-select mode when screen comes into focus
      exitMultiSelectMode();
    }, [])
  );

  // Debug notifications state updates
  useEffect(() => {
    console.log("Notifications state updated:", notifications.length, "items");
  }, [notifications]);

  // Animation for multi-select mode
  useEffect(() => {
    Animated.timing(multiSelectAnim, {
      toValue: isMultiSelectMode ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isMultiSelectMode]);

  // Handle notification press - Updated to work with DetailsModal
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
    
    // Convert notification to format expected by DetailsModal
    const scanResult = {
      log_id: notification.id,
      url: notification.url || notification.link,
      date_scanned: notification.timestamp ? new Date(notification.timestamp).toISOString() : null,
      severity: notification.severity || (notification.icon === "safe-icon" ? "safe" : "critical"),
      phishing_percentage: notification.phishing_percentage || (notification.icon === "safe-icon" ? 5 : 95),
      recommended_action: notification.recommended_action || 
                        (notification.icon === "safe-icon" ? "Safe to visit" : "Do not visit this site"),
      platform: notification.platform || notification.title || "Unknown"
    };
    
    setSelectedNotification({ ...notification, ...scanResult, read: true });
    setModalVisible(true);
  };

  // Handle notification deletion (single item)
  const handleDeleteNotification = async (id) => {
    // If coming from modal, use selectedNotification.id
    const notificationId = id || (selectedNotification && selectedNotification.id);
    
    if (notificationId) {
      // Animate the item out before removing it
      const itemIndex = notifications.findIndex(item => item.id === notificationId);
      if (itemIndex !== -1) {
        // Create a copy of the notifications
        const updatedNotifications = [...notifications];
        
        // Remove the item
        updatedNotifications.splice(itemIndex, 1);
        
        // Update state
        setNotifications(updatedNotifications);
        
        // Remove from read status
        const readStatus = await loadReadStatus();
        delete readStatus[notificationId];
        await saveReadStatus(readStatus);
      }
      
      // If a modal is open, close it
      if (modalVisible) {
        setModalVisible(false);
        setSelectedNotification(null);
      }
      
      // Reset the open swipe id
      setOpenSwipeId(null);
    }
  };

  // Handle selection toggle for an item
  const handleSelectItem = (id) => {
    if (!isMultiSelectMode) {
      setMultiSelectMode(true);
      setSelectedIds([id]);
    } else {
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(itemId => itemId !== id)
          : [...prev, id]
      );
    }
  };

  // Handle "Select All" action
  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      // If all are selected, deselect all
      setSelectedIds([]);
    } else {
      // Otherwise, select all
      setSelectedIds(notifications.map(item => item.id));
    }
  };

  // Handle "Mark as Read" for selected items
  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.length === 0) return;
    
    // Update read status
    const readStatus = await loadReadStatus();
    selectedIds.forEach(id => {
      readStatus[id] = true;
    });
    await saveReadStatus(readStatus);
    
    // Update notifications state
    setNotifications(
      notifications.map(item => 
        selectedIds.includes(item.id) 
          ? { ...item, read: true } 
          : item
      )
    );
    
    // Exit multi-select mode
    exitMultiSelectMode();
  };

  // Handle "Delete Selected" action
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    
    // Confirm deletion
    Alert.alert(
      "Delete Notifications",
      `Are you sure you want to delete ${selectedIds.length} notifications?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Filter out the selected items
            const updatedNotifications = notifications.filter(
              item => !selectedIds.includes(item.id)
            );
            
            // Update notifications state
            setNotifications(updatedNotifications);
            
            // Update read status storage
            const readStatus = await loadReadStatus();
            selectedIds.forEach(id => {
              delete readStatus[id];
            });
            await saveReadStatus(readStatus);
            
            // Exit multi-select mode
            exitMultiSelectMode();
          }
        }
      ]
    );
  };

  // Exit multi-select mode
  const exitMultiSelectMode = () => {
    setMultiSelectMode(false);
    setSelectedIds([]);
  };

  // Start fade-in animation when component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Close modal handler
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedNotification(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <GradientScreen onToggleDarkMode={onToggleDarkMode} isDarkMode={isDarkMode}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          {/* Header section */}
          <View style={styles.headerSection}>
            {/* Back Button (hidden in multi-select mode) */}
            {!isMultiSelectMode ? (
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
            ) : (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={exitMultiSelectMode}
              >
                <MaterialIcons name="close" size={28} color={isDarkMode ? 'black' : '#3AED97'} />
              </TouchableOpacity>
            )}

            {/* Title transforms to selection count in multi-select mode */}
            <Animated.View style={styles.titleContainer}>
              <Animated.Text 
                style={[
                  styles.title, 
                  { color: isDarkMode ? 'black' : '#3AED97' },
                  {
                    opacity: multiSelectAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 0, 0]
                    }),
                    transform: [{ 
                      translateY: multiSelectAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -30]
                      }) 
                    }]
                  }
                ]}
              >
                Notifications
              </Animated.Text>

              <Animated.Text 
                style={[
                  styles.title, 
                  { color: isDarkMode ? 'black' : '#3AED97' },
                  {
                    position: 'absolute',
                    opacity: multiSelectAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0, 1]
                    }),
                    transform: [{ 
                      translateY: multiSelectAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0]
                      }) 
                    }]
                  }
                ]}
              >
                {selectedIds.length === 0 
                  ? "Select Items" 
                  : `${selectedIds.length} Selected`}
              </Animated.Text>
            </Animated.View>

            {/* Action buttons for multi-select mode */}
            {isMultiSelectMode && (
              <View style={styles.multiSelectActions}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleSelectAll}
                >
                  <MaterialIcons 
                    name={selectedIds.length === notifications.length ? "deselect" : "select-all"} 
                    size={22} 
                    color="#3AED97" 
                  />
                </TouchableOpacity>
                
                {selectedIds.length > 0 && (
                  <>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={handleMarkSelectedAsRead}
                    >
                      <MaterialIcons name="done-all" size={22} color="#3AED97" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={handleDeleteSelected}
                    >
                      <MaterialIcons name="delete" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

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
                  onDelete={handleDeleteNotification}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={handleSelectItem}
                  isMultiSelectMode={isMultiSelectMode}
                  openSwipeId={openSwipeId}
                  setOpenSwipeId={setOpenSwipeId}
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
          
          {/* Using DetailsModal instead of the custom modal */}
          <DetailsModal
            visible={modalVisible}
            onClose={handleCloseModal}
            onDeletePress={handleDeleteNotification}
            scanResult={selectedNotification}
            navigation={navigation}
            loading={false}
          />
          
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
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
    height: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 30,
    overflow: 'hidden',
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  multiSelectActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 15,
    padding: 5,
  },
  backButton: {
    paddingHorizontal: 5,
  },
  notificationItemContainer: {
    position: 'relative',
    marginVertical: 5,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
  },
  notificationCardWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    zIndex: 2
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -18, // Half of the button height
    zIndex: 1,
    opacity: 0, // Start hidden
  },
  notificationItemWrapper: {
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  swipeableContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#3AED97',
    borderRadius: 10,
    height: 60
  },
  notificationCardSelected: {
    backgroundColor: "rgba(58, 237, 151, 0.9)", // Brighter green for selected safe
    borderWidth: 1,
    borderColor: "#fff",
  },
  notificationCardMalicious: {
    backgroundColor: "#FFF8E1", // Amber color for malicious notifications
  },
  notificationCardRead: {
    backgroundColor: "rgba(58, 237, 151, 0.6)", // Dimmed green for read safe notifications
  },
  notificationCardMaliciousRead: {
    backgroundColor: "rgba(255, 248, 225, 0.6)", // Dimmed amber for read malicious notifications
    // This style will be applied when both read and malicious conditions are true
  },
  notificationCardMaliciousSelected: {
    backgroundColor: "rgba(255, 248, 225, 0.9)", // Brighter amber for selected malicious
    borderWidth: 1,
    borderColor: "#fff",
  },
  checkboxContainer: {
    marginRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: "#000",
    borderColor: "#fff",
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
    marginLeft: 5,
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