import React, { useSharedValue, withDelay, withSpring } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { commonStyles, colors, spacing, borderRadius, useResponsive } from './styles';

const { width } = Dimensions.get('window');

const Hero = () => {
  const { isMobile } = useResponsive();

  // Animation values
  const badgeOpacity = useSharedValue(0);
  const badgeTranslateY = useSharedValue(20);
  const headingOpacity = useSharedValue(0);
  const headingTranslateY = useSharedValue(20);
  const subheadingOpacity = useSharedValue(0);
  const subheadingTranslateY = useSharedValue(20);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(20);
  const dashboardOpacity = useSharedValue(0);
  const dashboardTranslateY = useSharedValue(40);

  // Start animations on mount
  React.useEffect(() => {
    badgeOpacity.value = withDelay(100, withSpring(1));
    badgeTranslateY.value = withDelay(100, withSpring(0));

    headingOpacity.value = withDelay(200, withSpring(1));
    headingTranslateY.value = withDelay(200, withSpring(0));

    subheadingOpacity.value = withDelay(300, withSpring(1));
    subheadingTranslateY.value = withDelay(300, withSpring(0));

    buttonsOpacity.value = withDelay(400, withSpring(1));
    buttonsTranslateY.value = withDelay(400, withSpring(0));

    dashboardOpacity.value = withDelay(600, withSpring(1));
    dashboardTranslateY.value = withDelay(600, withSpring(0));
  }, []);

  const handleWaitlistClick = () => {
    console.log('Join waitlist clicked');
  };

  const handleDemoClick = () => {
    console.log('Watch demo clicked');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <LinearGradient
        colors={['#22c55e20', '#a855f720', 'transparent']}
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <LinearGradient
        colors={['#a855f720', '#a855f710', 'transparent']}
        style={styles.bottomGradient}
        start={{ x: 0.8, y: 0.1 }}
        end={{ x: 0.8, y: 0.8 }}
      />

      {/* Content Container */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge */}
        <Animated.View style={[
          styles.badge,
          {
            opacity: badgeOpacity,
            transform: [{ translateY: badgeTranslateY }],
          },
        ]}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Waitlist is now open for early access</Text>
        </Animated.View>

        {/* Hero Heading */}
        <Animated.View style={[
          styles.headingContainer,
          {
            opacity: headingOpacity,
            transform: [{ translateY: headingTranslateY }],
          },
        ]}>
          <Text style={styles.heroHeading}>
            Never pay credit card {'\n'}
            <Text style={styles.gradientText}>interest again.</Text>
          </Text>
        </Animated.View>

        {/* Hero Subheading */}
        <Animated.View style={[
          styles.subheadingContainer,
          {
            opacity: subheadingOpacity,
            transform: [{ translateY: subheadingTranslateY }],
          },
        ]}>
          <Text style={styles.heroSubheading}>
            Lurk automates your credit card payments, optimizes your cash flow, and helps you profit from the banks. Join the financial stealth revolution.
          </Text>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View style={[
          styles.buttonsContainer,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          },
        ]}>
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={handleWaitlistClick}
              style={styles.primaryButton}
              contentStyle={styles.primaryButtonContent}
              labelStyle={styles.primaryButtonText}
            >
              Join the Waitlist
            </Button>
            <Button
              mode="outlined"
              onPress={handleDemoClick}
              style={styles.secondaryButton}
              contentStyle={styles.secondaryButtonContent}
              labelStyle={styles.secondaryButtonText}
            >
              Watch Demo
            </Button>
          </View>
        </Animated.View>

        {/* Dashboard Mockup */}
        <Animated.View style={[
          styles.dashboardContainer,
          {
            opacity: dashboardOpacity,
            transform: [{ translateY: dashboardTranslateY }],
          },
        ]}>
          <View style={styles.dashboard}>
            {/* Overlay gradient */}
            <LinearGradient
              colors={['transparent', colors.background]}
              style={styles.dashboardOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            {/* Dashboard Content */}
            <View style={styles.dashboardContent}>
              {/* Cards Grid */}
              <View style={styles.cardsGrid}>
                {/* Interest Saved Card */}
                <View style={[styles.dashboardCard, styles.cardPrimary]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, styles.iconPrimary]}>
                      <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.cardLabel}>Interest Saved</Text>
                  </View>
                  <Text style={styles.cardValue}>₹12,450</Text>
                  <Text style={styles.cardChange}>+12% this month</Text>
                </View>

                {/* Active Cards Card */}
                <View style={[styles.dashboardCard, styles.cardSecondary]}>
                  <LinearGradient
                    colors={['#a855f720', 'transparent']}
                    style={styles.cardGradient}
                  />
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, styles.iconSecondary]}>
                      <MaterialCommunityIcons name="credit-card" size={20} color={colors.secondary} />
                    </View>
                    <Text style={styles.cardLabel}>Active Cards</Text>
                  </View>
                  <View style={styles.cardList}>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardItemText}>HDFC Millennia</Text>
                      <Text style={styles.cardItemStatus}>Paid</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardItemText}>ICICI Amazon</Text>
                      <Text style={styles.cardItemStatus}>Paid</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardItemText}>SBI Elite</Text>
                      <Text style={styles.cardItemStatusPending}>Due in 2d</Text>
                    </View>
                  </View>
                </View>

                {/* Ninja Score Card */}
                <View style={[styles.dashboardCard, styles.cardTertiary]}>
                  <View style={styles.ninjaScoreContainer}>
                    <View style={styles.ninjaScoreCircle}>
                      <Text style={styles.ninjaScoreValue}>780</Text>
                      <View style={styles.ninjaScoreGlow} />
                    </View>
                    <Text style={styles.ninjaScoreLabel}>Ninja Score</Text>
                    <Text style={styles.ninjaScoreStatus}>Excellent</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* System Status */}
            <View style={styles.systemStatus}>
              <Text style={styles.systemStatusText}>System Status</Text>
              <View style={styles.systemStatusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>LURK MODE ACTIVE</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    minHeight: '100vh',
    backgroundColor: colors.background,
  },
  topGradient: {
    position: 'absolute',
    top: -height * 0.2,
    left: width * 0.1,
    width: width * 0.8,
    height: height * 0.4,
    borderRadius: 9999,
    opacity: 0.3,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: width * 0.6,
    height: height * 0.3,
    borderRadius: 9999,
    opacity: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card + '20',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
    backdropFilter: 'blur(10px)',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    color: colors.primary + 'cc',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  headingContainer: {
    alignSelf: 'center',
  },
  heroHeading: {
    fontSize: width > 768 ? 72 : 48,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: width > 768 ? 70 : 46,
    fontFamily: 'Inter',
    letterSpacing: -1,
    marginBottom: spacing.xl,
  },
  gradientText: {
    color: colors.primary,
  },
  subheadingContainer: {
    maxWidth: 600,
    alignSelf: 'center',
  },
  heroSubheading: {
    fontSize: width > 768 ? 20 : 16,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: 'Inter',
    marginBottom: spacing.xxl,
  },
  buttonsContainer: {
    alignSelf: 'center',
  },
  buttonRow: {
    flexDirection: width > 640 ? 'row' : 'column',
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    height: 56,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonContent: {
    height: 56,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    height: 56,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonContent: {
    height: 56,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  dashboardContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    marginTop: spacing.xxxl,
  },
  dashboard: {
    position: 'relative',
    backgroundColor: colors.card + '50',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xxl,
    aspectRatio: width > 768 ? 21/9 : 16/9,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dashboardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  dashboardContent: {
    flex: 1,
    padding: spacing.xl,
  },
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    flex: 1,
  },
  dashboardCard: {
    flex: 1,
    backgroundColor: colors.background + '40',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardPrimary: {
    // Default styling
  },
  cardSecondary: {
    // Default styling
  },
  cardTertiary: {
    // Default styling
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPrimary: {
    backgroundColor: colors.primary + '20',
  },
  iconSecondary: {
    backgroundColor: colors.secondary + '20',
  },
  cardLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'Inter',
    marginBottom: spacing.sm,
  },
  cardChange: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  cardList: {
    gap: spacing.sm,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  cardItemText: {
    fontSize: 12,
    color: colors.foreground,
    fontFamily: 'Inter',
  },
  cardItemStatus: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  cardItemStatusPending: {
    fontSize: 12,
    color: '#facc15',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  ninjaScoreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ninjaScoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  ninjaScoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'Inter',
  },
  ninjaScoreGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 48,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  ninjaScoreLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: 'Inter',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  ninjaScoreStatus: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  systemStatus: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  systemStatusText: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontFamily: 'Inter',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  systemStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e10',
    borderWidth: 1,
    borderColor: '#22c55e20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});

export default Hero;