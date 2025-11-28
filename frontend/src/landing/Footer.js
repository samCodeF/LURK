import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { commonStyles, colors, spacing, borderRadius, useResponsive } from './styles';

const { width } = Dimensions.get('window');

const Footer = () => {
  const { isMobile } = useResponsive();

  const handleLinkPress = (link) => {
    if (Platform.OS === 'web') {
      // Handle web navigation
      console.log(`Navigate to: ${link}`);
    } else {
      // Handle mobile navigation
      console.log(`Navigate to: ${link}`);
    }
  };

  const handleSocialPress = (platform) => {
    console.log(`Open ${platform} profile`);
  };

  const productLinks = [
    { title: 'Features', onPress: () => handleLinkPress('features') },
    { title: 'Pricing', onPress: () => handleLinkPress('pricing') },
    { title: 'Security', onPress: () => handleLinkPress('security') },
    { title: 'Roadmap', onPress: () => handleLinkPress('roadmap') },
  ];

  const companyLinks = [
    { title: 'About Us', onPress: () => handleLinkPress('about') },
    { title: 'Careers', onPress: () => handleLinkPress('careers') },
    { title: 'Legal', onPress: () => handleLinkPress('legal') },
    { title: 'Contact', onPress: () => handleLinkPress('contact') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentContainer}>
          {/* Brand Section */}
          <View style={[styles.section, styles.brandSection]}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>L</Text>
              </View>
              <Text style={styles.brandName}>Lurk</Text>
            </View>
            <Text style={styles.brandDescription}>
              The financial stealth app that kills credit card interest and automates your wealth.
            </Text>
            {/* Social Icons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialIcon}
                onPress={() => handleSocialPress('Twitter')}
              >
                <Text style={styles.socialIconText}>X</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialIcon}
                onPress={() => handleSocialPress('LinkedIn')}
              >
                <Text style={styles.socialIconText}>In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Links Section */}
          <View style={[styles.section, styles.linksSection]}>
            <Text style={styles.sectionTitle}>Product</Text>
            <View style={styles.linksContainer}>
              {productLinks.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.link}
                  onPress={link.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>{link.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, styles.linksSection]}>
            <Text style={styles.sectionTitle}>Company</Text>
            <View style={styles.linksContainer}>
              {companyLinks.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.link}
                  onPress={link.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>{link.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.copyright}>
            © 2024 Lurk Technologies. All rights reserved.
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity
              style={styles.legalLink}
              onPress={() => handleLinkPress('privacy')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legalLink}
              onPress={() => handleLinkPress('terms')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scrollContent: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  contentContainer: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: spacing.xl,
  },
  section: {
    flex: 1,
  },
  brandSection: {
    flex: isMobile ? 1 : 2,
    alignItems: isMobile ? 'center' : 'flex-start',
  },
  linksSection: {
    alignItems: isMobile ? 'center' : 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  brandDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    fontFamily: 'Inter',
    textAlign: isMobile ? 'center' : 'left',
    maxWidth: 300,
    marginBottom: spacing.lg,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.foreground + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.lg,
    fontFamily: 'Inter',
  },
  linksContainer: {
    gap: spacing.lg,
  },
  link: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontFamily: 'Inter',
    textAlign: isMobile ? 'center' : 'left',
  },
  bottomSection: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: isMobile ? spacing.md : 0,
  },
  copyright: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontFamily: 'Inter',
    textAlign: isMobile ? 'center' : 'left',
  },
  legalLinks: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  legalLink: {
    paddingVertical: spacing.xs,
  },
  legalLinkText: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontFamily: 'Inter',
  },
});

export default Footer;