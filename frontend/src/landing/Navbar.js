import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu, X } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { commonStyles, colors, spacing, useResponsive } from './styles';

const { width } = Dimensions.get('window');

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile } = useResponsive();

  // Animation values
  const menuSlideY = useSharedValue(-300);
  const navbarBg = useSharedValue(0);
  const navbarHeight = useSharedValue(96);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = Platform.OS === 'web' ? window.scrollY : 0;
      const scrolled = scrollY > 50;

      if (isScrolled !== scrolled) {
        setIsScrolled(scrolled);

        // Animate navbar background
        navbarBg.value = withSpring(scrolled ? 1 : 0);
        navbarHeight.value = withSpring(scrolled ? 64 : 96);
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isScrolled]);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    menuSlideY.value = withSpring(mobileMenuOpen ? -300 : 0, {
      damping: 20,
      stiffness: 300,
    });
  };

  // Animated styles
  const animatedNavbarStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(10, 10, 10, ${0.5 + navbarBg.value * 0.3})`,
    borderBottomWidth: 1,
    borderBottomColor: `rgba(255, 255, 255, ${navbarBg.value * 0.05})`,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    height: navbarHeight.value,
  }));

  const animatedMenuStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: menuSlideY.value }],
  }));

  const scrollToSection = (sectionId) => {
    if (Platform.OS === 'web') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
      menuSlideY.value = withSpring(-300);
    }
  };

  const handleWaitlistClick = () => {
    // This will be connected to waitlist functionality later
    console.log('Waitlist clicked');
  };

  const handleLoginClick = () => {
    // This will navigate to login in mobile app
    console.log('Login clicked');
  };

  return (
    <SafeAreaView style={commonStyles.safeContainer}>
      <Animated.View style={[styles.navbar, animatedNavbarStyle]}>
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>L</Text>
            </View>
            <Text style={styles.brandName}>Lurk</Text>
          </View>

          {/* Desktop Navigation */}
          {!isMobile && (
            <View style={styles.desktopNav}>
              <TouchableOpacity onPress={() => scrollToSection('features')}>
                <Text style={styles.navLink}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('how-it-works')}>
                <Text style={styles.navLink}>How it Works</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('testimonials')}>
                <Text style={styles.navLink}>Stories</Text>
              </TouchableOpacity>

              <View style={styles.desktopButtons}>
                <Button
                  mode="outlined"
                  onPress={handleLoginClick}
                  style={styles.loginButton}
                  labelStyle={styles.loginButtonText}
                >
                  Login
                </Button>
                <Button
                  mode="contained"
                  onPress={handleWaitlistClick}
                  style={styles.waitlistButton}
                  labelStyle={styles.waitlistButtonText}
                >
                  Get Early Access
                </Button>
              </View>
            </View>
          )}

          {/* Mobile Menu Toggle */}
          {isMobile && (
            <TouchableOpacity
              style={styles.menuToggle}
              onPress={toggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X size={24} color={colors.foreground} />
              ) : (
                <Menu size={24} color={colors.foreground} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Mobile Menu */}
        {isMobile && (
          <Animated.View style={[styles.mobileMenu, animatedMenuStyle]}>
            <View style={styles.mobileMenuContent}>
              <TouchableOpacity
                onPress={() => scrollToSection('features')}
                style={styles.mobileMenuItem}
              >
                <Text style={styles.mobileMenuText}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollToSection('how-it-works')}
                style={styles.mobileMenuItem}
              >
                <Text style={styles.mobileMenuText}>How it Works</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollToSection('testimonials')}
                style={styles.mobileMenuItem}
              >
                <Text style={styles.mobileMenuText}>Stories</Text>
              </TouchableOpacity>

              <View style={styles.mobileButtons}>
                <Button
                  mode="outlined"
                  onPress={handleLoginClick}
                  style={[styles.loginButton, styles.mobileButton]}
                  labelStyle={styles.loginButtonText}
                >
                  Login
                </Button>
                <Button
                  mode="contained"
                  onPress={handleWaitlistClick}
                  style={[styles.waitlistButton, styles.mobileButton]}
                  labelStyle={styles.waitlistButtonText}
                >
                  Get Early Access
                </Button>
              </View>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  navbar: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background,
    fontFamily: 'Inter',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  navLink: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
    fontFamily: 'Inter',
  },
  desktopButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loginButton: {
    borderColor: colors.primary,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  loginButtonText: {
    color: colors.primary,
  },
  waitlistButton: {
    backgroundColor: colors.primary,
  },
  waitlistButtonText: {
    color: colors.background,
  },
  menuToggle: {
    padding: spacing.sm,
  },
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mobileMenuContent: {
    padding: spacing.lg,
  },
  mobileMenuItem: {
    paddingVertical: spacing.sm,
  },
  mobileMenuText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
    fontFamily: 'Inter',
  },
  mobileButtons: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mobileButton: {
    width: '100%',
  },
});

export default Navbar;