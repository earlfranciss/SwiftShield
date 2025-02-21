import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Pressable
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import GradientScreen from '../components/GradientScreen';

// Separate component for each notification item
const NotificationItem = ({ item, index, onPress }) => {
  // Create a fade animation for this specific item
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Staggered animation delay based on index
    const delay = index * 150;
    Animated.timing(itemFadeAnim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true,
    }).start();
  }, [index]);
  
  return (
    <TouchableOpacity onPress={() => onPress(item)}>
      <Animated.View 
        style={[
          styles.notificationCard,
          item.read && styles.notificationCardRead, // Apply dimmed style if read
          { 
            opacity: itemFadeAnim,
            transform: [{ translateY: itemFadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })}] 
          }
        ]}
      >
        {/* Static icons with no animations */}
        <Image 
          source={item.image} 
          style={[
            styles.icon,
            item.tintColor && { tintColor: item.tintColor },
            item.read && styles.iconRead // Dim the icon if read
          ]} 
        />
        <Text style={[
          styles.notificationText,
          item.read && styles.notificationTextRead // Dim the text if read
        ]}>
          {item.message}
        </Text>
        <Text style={[
          styles.timeText,
          item.read && styles.timeTextRead // Dim the time if read
        ]}>
          {item.time}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function Notifications({ route, navigation }) {
  const { isDarkMode, onToggleDarkMode } = route.params;
  
  // Animation values - only keeping fadeAnim
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // State for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  // Extended list of notifications with more items to test scrolling
  // Added read:false to each notification
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      message: "www.safe.link - SMS",
      type: "safe",
      time: "15 mins. ago",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
      details: "This link was scanned and determined to be safe. No malicious content was detected.",
      read: false
    },
    {
      id: "2",
      message: "www.safe.link - Email",
      type: "safe",
      time: "15 mins. ago",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
      details: "Email from john.doe@example.com contained safe links. Message passed all security checks.",
      read: false
    },
    {
      id: "3",
      message: "www.safe.link - Facebook",
      type: "safe",
      time: "15 mins. ago",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
      details: "Facebook message containing this link was analyzed and confirmed safe.",
      read: false
    },
    {
      id: "4",
      message: "www.malicious.link - SMS",
      type: "alert",
      time: "15 mins. ago",
      image: require("../../../assets/images/suspicious-icon.png"),
      details: "WARNING: This link was detected as potentially malicious. It may attempt to steal your personal information. The link has been blocked.",
      read: false
    },
    {
      id: "5",
      message: "www.malicious.link - Email",
      type: "alert",
      time: "15 mins. ago",
      image: require("../../../assets/images/suspicious-icon.png"),
      details: "Suspicious email from unknown@suspicious-domain.com contained malicious links. The email has been quarantined.",
      read: false
    },
    // Additional notifications to test scrolling
    {
      id: "6",
      message: "www.safe.link - Twitter",
      type: "safe",
      time: "30 mins. ago",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
      details: "Twitter direct message link scanned and verified as safe.",
      read: false
    },
    {
      id: "7",
      message: "www.malicious.link - Facebook",
      type: "alert",
      time: "45 mins. ago",
      image: require("../../../assets/images/suspicious-icon.png"),
      details: "Detected potential phishing attempt via Facebook message. This link has been blocked for your safety.",
      read: false
    },
    // More notifications...
    {
      id: "8",
      message: "www.safe.link - Instagram",
      type: "safe",
      time: "1 hour ago",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
      details: "Instagram message link verified and confirmed safe.",
      read: false
    },
    {
      id: "9",
      message: "www.malicious.link - WhatsApp",
      type: "alert",
      time: "1 hour ago",
      image: require("../../../assets/images/suspicious-icon.png"),
      details: "WhatsApp message contained suspicious link trying to impersonate a banking website. Access has been blocked.",
      read: false
    },
    {
      id: "10",
      message: "www.safe.link - LinkedIn",
      type: "safe",
      time: "2 hours ago",
      image: require("../../../assets/images/safe-icon.png"),
      tintColor: "black",
      details: "LinkedIn message link scanned and verified as legitimate.",
      read: false
    },
    // ... more notifications as in your original list
  ]);

  // Function to handle notification press
  const handleNotificationPress = (notification) => {
    // Mark the notification as read
    setNotifications(
      notifications.map(item => 
        item.id === notification.id 
          ? { ...item, read: true } 
          : item
      )
    );
    
    // Set the selected notification (with read status updated)
    setSelectedNotification({...notification, read: true});
    setModalVisible(true);
  };

  // Function to handle notification deletion
  const handleDeleteNotification = () => {
    if (selectedNotification) {
      setNotifications(notifications.filter(item => item.id !== selectedNotification.id));
      setModalVisible(false);
      setSelectedNotification(null);
    }
  };

  // Start animations when component mounts
  useEffect(() => {
    // Fade in animation for the list
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

          {/* Back Button with subtle animation */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              // Animate fade out before navigation
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start(() => navigation.goBack());
            }}
          >
            <MaterialIcons name="keyboard-arrow-left" size={28} color={isDarkMode ? 'black' : '#3AED97'} />
          </TouchableOpacity>

          {/* Title with slide-in animation */}
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

          {/* Notification List with animated items */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
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
          />
          
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
                        source={selectedNotification.image} 
                        style={[
                          styles.modalIcon,
                          selectedNotification.tintColor && { tintColor: selectedNotification.tintColor }
                        ]} 
                      />
                      <Text style={styles.modalTitle}>{selectedNotification.message}</Text>
                    </View>
                    
                    <Text style={styles.modalTime}>{selectedNotification.time}</Text>
                    
                    <View style={styles.modalDivider} />
                    
                    <Text style={styles.modalDetails}>
                      {selectedNotification.details}
                    </Text>
                    
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
  // Dimmed style for read notifications
  notificationCardRead: {
    backgroundColor: "rgba(58, 237, 151, 0.6)", // Dimmed green background
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  // Dimmed icon for read notifications
  iconRead: {
    opacity: 0.6,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  // Dimmed text for read notifications
  notificationTextRead: {
    fontWeight: "normal",
    opacity: 0.7,
  },
  timeText: {
    fontSize: 12,
    color: "#000",
  },
  // Dimmed time text for read notifications
  timeTextRead: {
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