import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GradientScreen from "../../components/GradientScreen";

export default function SwiftShieldOnboarding() {
  const navigation = useNavigation();
  // Replace these with your actual image paths
  const logoPath = require("../../assets/images/logo.png");
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Content for each slide with corresponding images
  const slides = [
    {
      title: "Your AI-Driven Phishing Detection and Prevention App",
      description: "SwiftShield protects you from phishing threats in two smart ways:",
      image: require("../../assets/images/logo.png") // Main logo for first slide
    },
    {
      title: "Manual Scan",
      description: "Copy and paste any URL into the SwiftShield scanner to instantly check if it's safe or phishing.",
      image: require("../../assets/images/ManualScan.png") // Image showing manual scan feature
    },
    {
      title: "Automated Scan",
      description: "Enable connected apps like SMS and Gmail, and SwiftShield will automatically scan messages for suspicious links and alert you in real time.",
      image: require("../../assets/images/AutomatedScan.png") // Image showing automated scan feature
    }
  ];
  
  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // If we're on the last slide, navigate to Home screen
      navigation.navigate('Tabs');
    }
  };
  
  const handleSkip = () => {
    console.log("Onboarding skipped");
    // Navigate directly to Home screen
    navigation.navigate('Tabs');
  };
  
  return (
    <GradientScreen
      colors={['#000000', '#001510', '#002820']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          {/* Image that changes with the slide */}
          <Image 
            source={slides[currentSlide].image}
            style={styles.slideImage}
            resizeMode="contain"
          />
          
          <Text style={styles.tagline}>
            {slides[currentSlide].title}
          </Text>
          
          <Text style={styles.description}>
            {slides[currentSlide].description}
          </Text>
        </View>
        
        <View style={styles.pagination}>
          {[0, 1, 2].map((index) => (
            <View 
              key={index} 
              style={[
                styles.dot,
                index === currentSlide && styles.activeDot
              ]}
            />
          ))}
        </View>
      </View>
      
      <View style={styles.navigation}>
        <TouchableOpacity 
          onPress={handleSkip}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleNext}
          style={styles.nextButton}
        >
          <Text style={styles.nextText}>
            {currentSlide === 2 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  slideImage: {
    width: 300,
    height: 300,
  },
  tagline: {
    textAlign: 'center',
    fontFamily: "Inter",
    marginTop: 0,
    color: '#00DC82',
    fontSize: 18,
    maxWidth: 350,
  },
  description: {
    textAlign: 'center',
    marginTop: 20,
    color: '#ccc',
    fontSize: 14,
    maxWidth: 300,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 50,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#555',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  skipButton: {
    padding: 12,
  },
  skipText: {
    color: '#ccc',
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: '#00DC82',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
});