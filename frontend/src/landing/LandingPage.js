import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import HowItWorks from './HowItWorks';
import Testimonials from './Testimonials';
import Footer from './Footer';
import { commonStyles, colors, useResponsive } from './styles';

const { height } = Dimensions.get('window');

const LandingPage = () => {
  const { isWeb } = useResponsive();
  const [scrollY, setScrollY] = useState(0);

  // Handle smooth scrolling for web
  useEffect(() => {
    if (isWeb) {
      const handleScroll = () => {
        setScrollY(window.scrollY);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isWeb]);

  // Scroll to section function for web
  const scrollToSection = (sectionId) => {
    if (isWeb) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // For mobile, use scroll view
      console.log(`Navigate to section: ${sectionId}`);
    }
  };

  // Handle waitlist signup
  const handleWaitlistSignup = () => {
    Alert.alert(
      'Join the Waitlist',
      'Enter your email to get early access to Lurk.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Up',
          onPress: () => {
            // This would connect to the waitlist service
            console.log('Waitlist signup initiated');
          },
        },
      ],
      'plain-text'
    );
  };

  // Handle demo click
  const handleWatchDemo = () => {
    Alert.alert(
      'Watch Demo',
      'See how Lurk helps you never pay credit card interest again.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Fixed Navbar */}
        <Navbar
          onScrollToSection={scrollToSection}
          onWaitlistClick={handleWaitlistSignup}
          scrollY={scrollY}
        />

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (isWeb) {
              setScrollY(event.nativeEvent.contentOffset.y);
            }
          }}
        >
          {/* Hero Section */}
          <View nativeID="hero" style={styles.section}>
            <Hero
              onWaitlistClick={handleWaitlistSignup}
              onWatchDemo={handleWatchDemo}
            />
          </View>

          {/* Features Section */}
          <View nativeID="features" style={styles.section}>
            <Features />
          </View>

          {/* How It Works Section */}
          <View nativeID="how-it-works" style={styles.section}>
            <HowItWorks />
          </View>

          {/* Testimonials Section */}
          <View nativeID="testimonials" style={styles.section}>
            <Testimonials />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Footer />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    minHeight: '100vh',
    scrollSnapAlign: 'start',
  },
  footer: {
    minHeight: 'auto',
  },
});

export default LandingPage;