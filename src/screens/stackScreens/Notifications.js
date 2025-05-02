import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  // Remove Modal import from react-native
  // Modal,
  ActivityIndicator,
  PanResponder,
  Alert
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import GradientScreen from '../../components/GradientScreen';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import config from '../../config/config';
// *** Import DetailsModal ***
import DetailsModal from '../../components/DetailsModal'; // Adjust path if necessary

// Icon mapping for notification types
const iconMap = {
  "suspicious-icon": require("../../assets/images/suspicious-icon.png"),
  "safe-icon": require("../../assets/images/safe-icon.png"),
};

// Function to parse time string - Updated to handle relative strings
const parseTimeString = (timeString) => {
  try {
    if (!timeString) return null;

    const relativeTimePattern = /ago|now|min|hour|day|week|month|year/i;
    if (relativeTimePattern.test(timeString)) {
      // Return null for relative strings, let display logic handle it
      return null;
    }

    if (timeString.includes('T') && (timeString.includes('Z') || timeString.includes('+') || timeString.includes('-'))) {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) return date.getTime();
    }

    const parts = timeString.split(' ');
    if (parts.length === 2) {
        const [datePart, timePart] = parts;
        if (datePart.includes('-') && timePart.includes(':')) {
            const [year, month, day] = datePart.split('-').map(Number);
            const [hours, minutes, seconds] = timePart.split(':').map(Number);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
                const date = new Date(year, month - 1, day, hours, minutes, seconds);
                 if (!isNaN(date.getTime())) return date.getTime();
            }
        }
    }
    console.warn("Unexpected time string format (unparseable) in parseTimeString:", timeString);
    return null;
  } catch (error) {
    console.error("Error parsing time string:", timeString, error);
    return null;
  }
};

// Helper function to format time (only used if timestamp exists)
const formatTimeAgo = (timestamp) => {
  try {
    if (!timestamp) return "Unknown time"; // Should not happen if logic is correct
    const scanTime = new Date(timestamp);
    if (isNaN(scanTime.getTime())) return "Invalid Date";

    const now = new Date();
    const diffMs = now - scanTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins. ago`;
    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(diffMins / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "Error";
  }
};

// Notification Item Component - Modified to display original time string if parsing failed
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
  const deleteButtonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (openSwipeId !== item.id && swipeAnim._value !== 0) {
      Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true }).start();
      Animated.timing(deleteButtonOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [openSwipeId]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isMultiSelectMode,
      onMoveShouldSetPanResponder: (_, gestureState) => !isMultiSelectMode && Math.abs(gestureState.dx) > 5,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.min(0, gestureState.dx);
        const limitedX = Math.max(-80, newX);
        swipeAnim.setValue(limitedX);
        deleteButtonOpacity.setValue(Math.min(Math.abs(limitedX) / 80, 1));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          setOpenSwipeId(item.id);
          Animated.spring(swipeAnim, { toValue: -80, friction: 6, useNativeDriver: true }).start();
          Animated.timing(deleteButtonOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        } else {
          setOpenSwipeId(null);
          Animated.spring(swipeAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
          Animated.timing(deleteButtonOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    const delay = index * 50;
    Animated.timing(itemFadeAnim, { toValue: 1, duration: 700, delay, useNativeDriver: true }).start();
  }, [index]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(selectionScale, { toValue: isSelected ? 0.95 : 1, duration: 150, useNativeDriver: true }),
      Animated.spring(selectionScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();
  }, [isSelected]);

  const displayText = item.url || item.link || "No URL";

  const handleLongPress = () => { if (!isMultiSelectMode) onSelect(item.id); };
  const handlePress = () => {
    if (isMultiSelectMode) onSelect(item.id);
    else if (item && item.id) onPress(item);
    else {
      console.error("Press on item without ID:", item);
      Alert.alert("Error", "Cannot open details.");
    }
  };

  // *** Use item.timeDisplay for showing time ***
  const timeToDisplay = item.timeDisplay || "Unknown time";

  return (
    <Animated.View
      style={[ styles.notificationItemContainer, { opacity: itemFadeAnim, transform: [{ translateY: itemFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] } ]} >
      <Animated.View style={[ styles.deleteButtonContainer, { opacity: deleteButtonOpacity } ]} >
        <TouchableOpacity style={styles.deleteButton} onPress={() => { if (item && item.id) onDelete(item.id); else Alert.alert("Error", "Cannot delete item."); }} >
          <MaterialIcons name="delete" size={18} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[ styles.notificationCardWrapper, { transform: [{ translateX: swipeAnim }] } ]} {...(isMultiSelectMode ? {} : panResponder.panHandlers)} >
        <TouchableOpacity onPress={handlePress} onLongPress={handleLongPress} delayLongPress={300} activeOpacity={0.8} >
         <Animated.View style={[ styles.notificationCard, item.icon === "suspicious-icon" ? styles.notificationCardMalicious : styles.notificationCardSafe, item.read && (item.icon === "suspicious-icon" ? styles.notificationCardMaliciousRead : styles.notificationCardRead), isSelected && (item.icon === "suspicious-icon" ? styles.notificationCardMaliciousSelected : styles.notificationCardSelected) ]} >
            {isMultiSelectMode && (
              <View style={styles.checkboxContainer}>
                <View style={[ styles.checkbox, isSelected && styles.checkboxSelected ]}>
                  {isSelected && ( <MaterialIcons name="check" size={16} color="#fff" /> )}
                </View>
              </View>
            )}
            <Image source={iconMap[item.icon] || iconMap["safe-icon"]} style={[ styles.icon, item.icon === "safe-icon" && { tintColor: "black" }, item.read && styles.iconRead ]} />
            <Text style={[ styles.notificationText, item.read && styles.notificationTextRead ]} numberOfLines={1} ellipsizeMode="tail" > 
              {displayText} 
            </Text>
            {/* *** Display the calculated time string *** */}
            <Text style={[ styles.timeText, item.read && styles.timeTextRead ]}>
              {timeToDisplay}
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
  // *** Rename state for clarity with DetailsModal ***
  const [selectedScanResult, setSelectedScanResult] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  // *** Add loading state for modal details (though not used here yet) ***
  const [modalLoading, setModalLoading] = useState(false);

  const [isMultiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const multiSelectAnim = useRef(new Animated.Value(0)).current;

  const readStatusMap = useRef({});
  const loadReadStatus = async () => readStatusMap.current;
  const saveReadStatus = async (readStatusObj) => { readStatusMap.current = readStatusObj; };

  const getMockNotifications = () => {
    const now = new Date();
    return [
      {
        id: "mock-1", detection_id: "mock-1", url: "www.malicious-mock.link - SMS", link: "www.malicious-mock.link - SMS", icon: "suspicious-icon", time: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), timestamp: now.getTime() - 15 * 60 * 1000, read: false, title: "SMS Scan", details: "WARNING: This link was detected as potentially malicious...", severity: "critical", platform: "SMS", phishing_percentage: 95, recommended_action: "Do not visit" // Add more fields
      },
      {
        id: "mock-2", detection_id: "mock-2", url: "www.safe-mock.link - Email", link: "www.safe-mock.link - Email", icon: "safe-icon", time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), timestamp: now.getTime() - 3 * 60 * 60 * 1000, read: false, title: "Email Scan", details: "This link was scanned and determined to be safe.", severity: "safe", platform: "Email", phishing_percentage: 5, recommended_action: "Safe to visit"
      },
    ];
  };

  // fetchNotifications - Modified to create timeDisplay
  const fetchNotifications = async () => {
    console.log("[Notifications.js] Fetching notifications...");
    try {
      setLoading(true);
      if (!config?.BASE_URL) {
        console.warn("[Notifications.js] BASE_URL missing, using mock data");
        setNotifications(getMockNotifications()); return;
      }
      const fetchUrl = `${config.BASE_URL}/logs`;
      const response = await fetch(fetchUrl);
      const data = await response.json();

      if (data?.error) {
        console.error("[Notifications.js] API error:", data.error);
        console.warn("[Notifications.js] Falling back to mock data due to API error.");
        setNotifications(getMockNotifications()); return;
      }
      if (!Array.isArray(data)) {
        console.error("[Notifications.js] API response not an array:", data);
        console.warn("[Notifications.js] Falling back to mock data due to invalid format.");
        setNotifications(getMockNotifications()); return;
      }

      console.log(`[Notifications.js] Received ${data.length} items.`);
      const readStatus = await loadReadStatus();

      const notificationsData = data.map(log => {
        const timestamp = parseTimeString(log.time || log.date_scanned);
        const notificationId = log.detection_id || log.id;
        if (!notificationId) {
             console.warn("[Notifications.js] Log item missing ID:", log); return null;
        }

        // *** Determine display time string ***
        const originalTimeString = log.time || log.date_scanned || "Unknown time";
        // Use formatted time if timestamp is valid, otherwise use the original string
        const displayTime = timestamp ? formatTimeAgo(timestamp) : originalTimeString;

        // Simplified generateDetails (can be expanded later)
        const details = log.icon === "safe-icon"
          ? `Link (${log.url || 'N/A'}) scanned at ${displayTime} appears safe.`
          : `WARNING: Link (${log.url || 'N/A'}) scanned at ${displayTime} detected as potentially malicious.`;


        return {
          id: notificationId.toString(),
          detection_id: notificationId.toString(),
          read: readStatus[notificationId.toString()] || false,
          url: log.url || "No URL provided",
          link: log.url || "No URL provided",
          icon: log.icon || (log.severity === 'safe' ? 'safe-icon' : 'suspicious-icon'),
          title: log.title || log.platform || "Scan Result",
          timestamp: timestamp, // Parsed timestamp (can be null)
          time: log.time || log.date_scanned, // Original time string
          details: details, // Basic details for now
          // Fields needed by DetailsModal (add fallbacks if necessary)
          severity: log.severity || (log.icon === 'safe-icon' ? 'safe' : 'unknown'),
          platform: log.platform || "Unknown",
          phishing_percentage: typeof log.phishing_percentage === 'number' ? log.phishing_percentage : (log.icon === 'safe-icon' ? 5 : 90), // Example fallback
          recommended_action: log.recommended_action || (log.icon === 'safe-icon' ? 'Safe to visit' : 'Proceed with caution'),
          // *** Add timeDisplay field ***
          timeDisplay: displayTime,
          // Ensure date_scanned is in a format DetailsModal might expect (ISO string or keep original)
          date_scanned: log.date_scanned || log.time,
          log_id: notificationId.toString() // Pass the ID as log_id for DetailsModal delete
        };
      }).filter(Boolean);

      console.log("[Notifications.js] Processed notifications:", notificationsData.length);
      // Sort by timestamp if available, otherwise keep original order or sort by original time string?
      // Simple sort (newest first based on timestamp, nulls last):
      setNotifications(notificationsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));

    } catch (error) {
      console.error("[Notifications.js] Error fetching:", error);
      console.warn("[Notifications.js] Falling back to mock data due to fetch error.");
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
      console.log("[Notifications.js] Fetching finished.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      if (isMultiSelectMode) exitMultiSelectMode();
    }, [])
  );

  useEffect(() => { console.log("[Notifications.js] State updated:", notifications.length, "items"); }, [notifications]);
  useEffect(() => { Animated.timing(multiSelectAnim, { toValue: isMultiSelectMode ? 1 : 0, duration: 300, useNativeDriver: true }).start(); }, [isMultiSelectMode]);

  // *** UPDATED handleNotificationPress for DetailsModal ***
  const handleNotificationPress = async (notification) => {
    if (!notification?.id) {
       console.error("[Notifications.js] Invalid notification pressed:", notification);
       Alert.alert("Error", "Cannot open details."); return;
    }

    const currentReadStatus = await loadReadStatus();
    if (!currentReadStatus[notification.id]) {
        currentReadStatus[notification.id] = true;
        await saveReadStatus(currentReadStatus);
        setNotifications(prev => prev.map(item => item.id === notification.id ? { ...item, read: true } : item));
    }

    // *** Prepare data for DetailsModal (scanResult format) ***
    // Make sure all fields required by DetailsModal are present
    const scanResultForModal = {
        log_id: notification.id, // Use notification's ID as log_id for delete
        url: notification.url,
        date_scanned: notification.date_scanned || notification.time, // Use the original time string or ISO date
        severity: notification.severity,
        phishing_percentage: notification.phishing_percentage,
        recommended_action: notification.recommended_action,
        platform: notification.platform,
        // Add any other fields DetailsModal expects
        // Note: DetailsModal might generate its own 'details' text based on severity etc.
        // We pass the basic notification object as well for fallback/display
        ...notification // Include other notification fields if needed by modal directly
    };

    // *** Set the state for DetailsModal ***
    setSelectedScanResult({ ...scanResultForModal, read: true }); // Mark as read for modal context
    setModalVisible(true); // Show DetailsModal
    // setModalLoading(false); // Assuming no extra loading needed just to show cached data
  };


  // Handle notification deletion (triggered by swipe or DetailsModal)
  const handleDeleteNotification = async (idToDelete) => {
    if (!idToDelete) {
        console.error("[Notifications.js] handleDeleteNotification called without ID");
        return;
    }
    const notificationId = idToDelete.toString(); // Ensure string comparison
    console.log(`[Notifications.js] Deleting notification ID: ${notificationId}`);

    // --- Optional: Backend Delete Call ---
    /* try {
         const response = await fetch(`${config.BASE_URL}/logs/${notificationId}`, { method: 'DELETE' });
         if (!response.ok) { throw new Error(`Backend delete failed: ${response.status}`); }
         console.log(`[Notifications.js] Backend delete success for ${notificationId}`);
       } catch (error) {
         console.error(`[Notifications.js] Backend delete error for ${notificationId}:`, error);
         Alert.alert("Deletion Failed", "Could not delete item on server. Please try again.");
         return; // Stop UI update if backend fails
       }
    */
    // --- End Optional Backend Delete ---

    // Update UI optimistically (or after backend success)
    setNotifications(prev => prev.filter(item => item.id !== notificationId));

    // Update read status store
    const currentReadStatus = await loadReadStatus();
    if (currentReadStatus[notificationId]) {
        delete currentReadStatus[notificationId];
        await saveReadStatus(currentReadStatus);
    }

    // Close modal if it was showing the deleted item
    // *** Use selectedScanResult state ***
    if (modalVisible && selectedScanResult?.log_id === notificationId) {
      setModalVisible(false);
      setSelectedScanResult(null);
    }
    if (openSwipeId === notificationId) setOpenSwipeId(null);
  };


  // Multi-select functions (Mostly unchanged, ensure ID usage is correct)
  const handleSelectItem = (id) => {
     if (!id) return;
    if (!isMultiSelectMode) {
      setMultiSelectMode(true);
      setSelectedIds([id]);
    } else {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id] );
    }
  };
  
  const handleSelectAll = () => {
    const allValidIds = notifications.map(item => item.id).filter(Boolean);
    if (selectedIds.length === allValidIds.length) setSelectedIds([]);
    else setSelectedIds(allValidIds);
  };
  
  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.length === 0) return;
    const currentReadStatus = await loadReadStatus();
    let changed = false;
    selectedIds.forEach(id => { if (!currentReadStatus[id]) { currentReadStatus[id] = true; changed = true; } });
    if (changed) {
        await saveReadStatus(currentReadStatus);
        setNotifications(prev => prev.map(item => selectedIds.includes(item.id) ? { ...item, read: true } : item ));
    }
    exitMultiSelectMode();
   };
   
  const handleDeleteSelected = () => {
     if (selectedIds.length === 0) return;
    Alert.alert( 
      "Delete Notifications", 
      `Delete ${selectedIds.length} notification(s)?`,
      [ 
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            console.log(`[Notifications.js] Deleting selected IDs:`, selectedIds);
             // --- Optional: Backend Batch Delete ---
            // const backendSuccess = await batchDeleteOnBackend(selectedIds); // Example function call
            // if (!backendSuccess) return; // Stop if backend fails
            // --- End Optional Call ---
            setNotifications(prev => prev.filter(item => !selectedIds.includes(item.id)));
            const currentReadStatus = await loadReadStatus();
            let changedReadStatus = false;
            selectedIds.forEach(id => { if (currentReadStatus[id]) { delete currentReadStatus[id]; changedReadStatus = true; } });
            if (changedReadStatus) await saveReadStatus(currentReadStatus);
            exitMultiSelectMode();
          }
        }
      ]
    );
   };
   
  const exitMultiSelectMode = () => {
    setMultiSelectMode(false);
    setSelectedIds([]);
    setOpenSwipeId(null);
  };

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start(); }, []);

  // *** Close handler for DetailsModal ***
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedScanResult(null); // Clear the selected scan result
  };

  return (
    <View style={{ flex: 1 }}>
      <GradientScreen onToggleDarkMode={onToggleDarkMode} isDarkMode={isDarkMode}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          {/* Header section (Unchanged) */}
          <View style={styles.headerSection}>
             {/* Back/Close Button */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => { 
                if (isMultiSelectMode) exitMultiSelectMode(); 
                else Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => navigation.goBack()); 
              }} 
            >
                <MaterialIcons name={isMultiSelectMode ? "close" : "keyboard-arrow-left"} size={28} color={isDarkMode ? 'black' : '#3AED97'} />
            </TouchableOpacity>
             {/* Animated Title */}
            <Animated.View style={styles.titleContainer}>
              <Animated.Text 
                style={[ 
                  styles.title, 
                  { color: isDarkMode ? 'black' : '#3AED97' }, 
                  { 
                    opacity: multiSelectAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), 
                    transform: [{ translateY: multiSelectAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] 
                  } 
                ]} 
                numberOfLines={1}
              > 
                Notifications 
              </Animated.Text>
              <Animated.Text 
                style={[ 
                  styles.title, 
                  { color: isDarkMode ? 'black' : '#3AED97' }, 
                  { 
                    position: 'absolute', 
                    opacity: multiSelectAnim, 
                    transform: [{ translateY: multiSelectAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
                  } 
                ]} 
                numberOfLines={1}
              > 
                {selectedIds.length === 0 ? "Select Items" : `${selectedIds.length} Selected`} 
              </Animated.Text>
            </Animated.View>
             {/* Multi-select Actions */}
             <View style={styles.multiSelectActionsContainer}>
                {isMultiSelectMode && (
                  <Animated.View style={[styles.multiSelectActions, { opacity: multiSelectAnim }]}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleSelectAll}>
                      <MaterialIcons 
                        name={selectedIds.length === notifications.filter(n => n.id).length ? "deselect" : "select-all"} 
                        size={22} 
                        color="#3AED97" 
                      />
                    </TouchableOpacity>
                    {selectedIds.length > 0 && (
                      <>
                        <TouchableOpacity style={styles.actionButton} onPress={handleMarkSelectedAsRead}> 
                          <MaterialIcons name="done-all" size={22} color="#3AED97" /> 
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleDeleteSelected}> 
                          <MaterialIcons name="delete" size={22} color="#FF3B30" /> 
                        </TouchableOpacity>
                      </>
                    )}
                  </Animated.View>
                )}
             </View>
          </View>

          {/* Notification List (Unchanged) */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3AED97" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={({ item, index }) => {
                 if (!item?.id) return null;
                 return (
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
                 );
              }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10} 
              maxToRenderPerBatch={10} 
              windowSize={21}
              ListEmptyComponent={
                <View style={styles.emptyContainer}> 
                  <MaterialIcons name="notifications-none" size={50} color="#3AED97" /> 
                  <Text style={styles.emptyText}>No notifications yet</Text> 
                  <Text style={styles.emptySubText}>Scan results will appear here.</Text> 
                </View>
              }
            />
          )}

          {/* *** Use DetailsModal Component *** */}
          <DetailsModal
            visible={modalVisible}
            onClose={handleCloseModal}
            // Pass the delete handler - DetailsModal expects onDeletePress
            // It will call this function with the log_id of the item to delete
            onDeletePress={handleDeleteNotification}
            scanResult={selectedScanResult} // Pass the prepared scan result object
            navigation={navigation} // Pass navigation if DetailsModal needs it
            loading={modalLoading} // Pass loading state if DetailsModal shows indicator
          />

        </Animated.View>
      </GradientScreen>
    </View>
  );
}

// Styles definition - Remove old inline modal styles if present
const styles = StyleSheet.create({
    container: { /* ... */ flex: 1, paddingHorizontal: 15, paddingTop: 10, },
    headerSection: { /* ... */ flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 10, height: 40, },
    backButton: { /* ... */ padding: 5, marginRight: 5, },
    titleContainer: { /* ... */ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden', },
    title: { /* ... */ fontSize: 20, fontWeight: "bold", textAlign: "center", },
    multiSelectActionsContainer: { /* ... */ minWidth: 100, justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'row', },
    multiSelectActions: { /* ... */ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', },
    actionButton: { /* ... */ marginLeft: 12, padding: 6, },
    notificationItemContainer: { /* ... */ marginVertical: 4, borderRadius: 12, overflow: 'hidden', backgroundColor: '#555', },
    notificationCardWrapper: { /* ... */ width: '100%', zIndex: 2, backgroundColor: 'transparent', },
    deleteButtonContainer: { /* ... */ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, justifyContent: 'center', alignItems: 'center', zIndex: 1, opacity: 0, },
    deleteButton: { /* ... */ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', elevation: 3, },
    notificationCard: { /* ... */ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, height: 65, overflow: 'hidden', },
    notificationCardSafe: { /* ... */ backgroundColor: '#3AED97', },
    notificationCardMalicious: { /* ... */ backgroundColor: "#FFF8E1", },
    notificationCardRead: { /* ... */ backgroundColor: "rgba(58, 237, 151, 0.6)", },
    notificationCardMaliciousRead: { /* ... */ backgroundColor: "rgba(255, 248, 225, 0.6)", },
    notificationCardSelected: { /* ... */ borderWidth: 2, borderColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 8, },
    notificationCardMaliciousSelected: { /* ... */ borderWidth: 2, borderColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 8, },
    checkboxContainer: { /* ... */ marginRight: 10, alignSelf: 'center', },
    checkbox: { /* ... */ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#000", justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.3)', },
    checkboxSelected: { /* ... */ backgroundColor: "#000", borderColor: "#fff", },
    icon: { /* ... */ width: 28, height: 28, marginRight: 12, resizeMode: 'contain', },
    iconRead: { /* ... */ opacity: 0.5, },
    notificationText: { /* ... */ flex: 1, fontSize: 14, fontWeight: "600", color: "#000", marginRight: 8, },
    notificationTextRead: { /* ... */ fontWeight: "400", opacity: 0.7, },
    timeText: { /* ... */ fontSize: 11, color: "#333", fontWeight: '500', },
    timeTextRead: { /* ... */ opacity: 0.7, },
    loadingContainer: { /* ... */ flex: 1, justifyContent: 'center', alignItems: 'center', },
    loadingText: { /* ... */ marginTop: 10, color: '#3AED97', fontSize: 16, },
    emptyContainer: { /* ... */ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: '30%', paddingHorizontal: 20, },
    emptyText: { /* ... */ color: '#3AED97', fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center', },
    emptySubText: { /* ... */ color: '#aaa', fontSize: 14, marginTop: 8, textAlign: 'center', },

    // *** REMOVE OLD INLINE MODAL STYLES ***
    // centeredView, modalView, modalHeader, modalIcon, modalTitle,
    // modalTime, modalDivider, modalDetails, modalSource,
    // modalButtons, button, buttonOkay, buttonDelete, textStyle
    // (These are no longer needed as DetailsModal has its own styling)
});