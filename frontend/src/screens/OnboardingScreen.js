/**
 * Onboarding Screen - First-Time User Experience
 * Guides new users through app setup and key features
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Surface,
  Card,
  Title,
  Paragraph,
  Button,
  ProgressBar,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();

  // Local state
  const [currentPage, setCurrentPage] = useState(0);
  const [animValue] = useState(new Animated.Value(0));

  // Onboarding pages
  const onboardingPages = [
    {
      id: 'welcome',
      title: 'Welcome to Lurk',
      subtitle: 'Never Pay Credit Card Interest Again',
      icon: 'credit-card-multiple',
      iconSize: 80,
      color: '#4A90E2',
      description: 'Lurk automatically pays your credit card minimum dues before the due date, extending your interest-free credit period from 30-45 days to 57-60 days!',
      features: [
        '🎯 Automatic minimum due payments',
        '💰 Up to 60 days interest-free credit',
        '📊 Smart spending insights',
        '🔒 Bank-level security',
      ],
    },
    {
      id: 'how-it-works',
      title: 'How Lurk Works',
      subtitle: 'Smart Automation for Your Credit Cards',
      icon: 'cog-transfer',
      iconSize: 70,
      color: '#45B7D1',
      description: 'Our intelligent system monitors your credit cards and ensures you never miss a payment, saving you from hefty interest charges.',
      features: [
        'Connect your credit cards securely',
        'Set up automation preferences',
        'Monitor upcoming payments',
        'Enjoy interest-free credit extensions',
      ],
    },
    {
      id: 'benefits',
      title: 'Why Choose Lurk?',
      subtitle: 'Maximize Your Financial Benefits',
      icon: 'piggy-bank',
      iconSize: 75,
      color: '#FF6B6B',
      description: 'Join thousands of users who are saving thousands in interest charges and improving their financial health.',
      features: [
        '₹30,000+ average annual savings',
        '99.9% payment success rate',
        'Support for 10+ major banks',
        'Real-time payment tracking',
      ],
    },
    {
      id: 'security',
      title: 'Bank-Level Security',
      subtitle: 'Your Data is Always Protected',
      icon: 'shield-check',
      iconSize: 72,
      color: '#4CAF50',
      description: 'We use industry-leading encryption and security measures to keep your financial information safe and secure.',
      features: [
        '256-bit AES encryption',
        'Biometric authentication',
        'Read-only API access',
        'Regular security audits',
      ],
    },
    {
      id: 'get-started',
      title: 'Ready to Get Started?',
      subtitle: 'Join the Interest-Free Revolution',
      icon: 'rocket-launch',
      iconSize: 76,
      color: '#FF9800',
      description: 'Take control of your credit card payments and start saving on interest charges today. It only takes a few minutes to get started!',
      features: [
        'Quick and easy setup',
        'No setup fees',
        'Cancel anytime',
        '24/7 customer support',
      ],
      action: {
        label: 'Create Free Account',
        onPress: () => navigation.navigate('KYC'),
        primary: true,
      },
    },
  ];

  const totalPages = onboardingPages.length;

  // Animate page change
  const animateToPage = useCallback((newPage) => {
    Animated.timing(animValue, {
      toValue: newPage,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setCurrentPage(newPage);
  }, [animValue]);

  // Handle next page
  const handleNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      animateToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, animateToPage]);

  // Handle previous page
  const handlePrevious = useCallback(() => {
    if (currentPage > 0) {
      animateToPage(currentPage - 1);
    }
  }, [currentPage, animateToPage]);

  // Handle skip
  const handleSkip = useCallback(() => {
    animateToPage(totalPages - 1);
  }, [totalPages, animateToPage]);

  // Handle page indicator press
  const handlePageIndicator = useCallback((index) => {
    animateToPage(index);
  }, [animateToPage]);

  // Handle back navigation
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('goBack', () => {
        if (currentPage > 0) {
          handlePrevious();
        } else {
          // Exit onboarding if user presses back on first page
          navigation.navigate('Login');
        }
      });

      return unsubscribe;
    }, [navigation, currentPage, handlePrevious])
  );

  // Render onboarding page
  const renderPage = (page, index) => {
    const { title, subtitle, icon, iconSize, color, description, features, action } = page;

    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={(index + 1) / totalPages}
            color={color}
            style={styles.progressBar}
          />
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {index + 1} of {totalPages}
          </Text>
        </View>

        {/* Skip Button */}
        {index < totalPages - 1 && (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Icon name={icon} size={iconSize} color={color} />
          </View>

          {/* Title and Subtitle */}
          <Title style={[styles.title, { color: colors.text }]}>
            {title}
          </Title>
          <Text style={[styles.subtitle, { color: color }]}>
            {subtitle}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.text }]}>
            {description}
          </Text>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {features.map((feature, featureIndex) => (
              <View key={featureIndex} style={styles.featureItem}>
                <Icon
                  name="check-circle"
                  size={20}
                  color={color}
                  style={styles.featureIcon}
                />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Stats Card */}
          {index === 2 && ( // Benefits page
            <Surface style={[styles.statsCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: color }]}>
                    ₹30K+
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Avg. Annual Savings
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: color }]}>
                    99.9%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Success Rate
                  </Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: color }]}>
                    10+
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Banks Supported
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: color }]}>
                    50K+
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Happy Users
                  </Text>
                </View>
              </View>
            </Surface>
          )}

          {/* Trust Badges */}
          {index === 3 && ( // Security page
            <View style={styles.badgesContainer}>
              <Surface style={[styles.badge, { backgroundColor: colors.surface }]}>
                <Icon name="shield-check" size={24} color="#4CAF50" />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  Bank-Level Encryption
                </Text>
              </Surface>
              <Surface style={[styles.badge, { backgroundColor: colors.surface }]}>
                <Icon name="fingerprint" size={24} color="#2196F3" />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  Biometric Auth
                </Text>
              </Surface>
              <Surface style={[styles.badge, { backgroundColor: colors.surface }]}>
                <Icon name="privacy" size={24} color="#9C27B0" />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  Data Privacy
                </Text>
              </Surface>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {action ? (
            <Button
              mode="contained"
              onPress={action.onPress}
              style={[styles.actionButton, { backgroundColor: action.primary ? color : 'transparent' }]}
              contentStyle={styles.actionButtonContent}
              textColor={action.primary ? '#FFFFFF' : color}
              icon={action.primary ? 'rocket-launch' : 'arrow-right'}
            >
              {action.label}
            </Button>
          ) : (
            <>
              {index > 0 && (
                <Button
                  mode="outlined"
                  onPress={handlePrevious}
                  style={[styles.secondaryButton, { borderColor: color }]}
                  textColor={color}
                >
                  Previous
                </Button>
              )}

              <Button
                mode="contained"
                onPress={handleNext}
                style={[styles.primaryButton, { backgroundColor: color }]}
                icon="arrow-right"
              >
                {index === totalPages - 1 ? 'Get Started' : 'Next'}
              </Button>
            </>
          )}
        </View>
      </View>
    );
  };

  // Render page indicators
  const renderPageIndicators = () => {
    return (
      <View style={styles.indicatorsContainer}>
        {onboardingPages.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handlePageIndicator(index)}
            style={[
              styles.indicator,
              currentPage === index && [
                styles.activeIndicator,
                { backgroundColor: onboardingPages[currentPage]?.color }
              ]
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Page Indicators */}
      {renderPageIndicators()}

      {/* Current Page */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentPage(pageIndex);
        }}
        contentContainerStyle={styles.pagesContainer}
        style={styles.pagesScroll}
      >
        {onboardingPages.map((page, index) => (
          <View key={page.id} style={[styles.pageWrapper, { width }]}>
            {renderPage(page, index)}
          </View>
        ))}
      </ScrollView>

      {/* Gesture Indicators */}
      <View style={styles.gestureIndicators}>
        <TouchableOpacity style={styles.gestureLeft} onPress={handlePrevious}>
          <Icon
            name="chevron-left"
            size={32}
            color={colors.textSecondary}
            style={[
              styles.gestureIcon,
              currentPage === 0 && styles.gestureIconDisabled
            ]}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.gestureRight} onPress={handleNext}>
          <Icon
            name="chevron-right"
            size={32}
            color={colors.textSecondary}
            style={[
              styles.gestureIcon,
              currentPage === totalPages - 1 && styles.gestureIconDisabled
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicatorsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 24,
    height: 8,
  },
  pagesScroll: {
    flex: 1,
  },
  pagesContainer: {
    flexDirection: 'row',
  },
  pageWrapper: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  progressBar: {
    width: width * 0.6,
    height: 4,
    borderRadius: 2,
    marginVertical: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100, // Space for action buttons
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 28,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  statsCard: {
    borderRadius: 16,
    padding: 24,
    marginVertical: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginVertical: 24,
  },
  badge: {
    borderRadius: 12,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 100,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonContent: {
    paddingVertical: 14,
  },
  primaryButton: {
    flex: 2,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
  },
  gestureIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  gestureLeft: {
    padding: 8,
  },
  gestureRight: {
    padding: 8,
  },
  gestureIcon: {
    opacity: 0.6,
  },
  gestureIconDisabled: {
    opacity: 0.2,
  },
});

export default OnboardingScreen;