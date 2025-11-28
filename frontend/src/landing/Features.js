import React, { useSharedValue, withDelay, withSpring } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import { Card } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { features } from './constants';
import { commonStyles, colors, spacing, borderRadius, useResponsive } from './styles';

const { width } = Dimensions.get('window');

const Features = () => {
  const { isMobile, isTablet } = useResponsive();

  // Animation values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);

  // Card animation values
  const cardAnimations = features.map((_, index) => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(30),
    scale: useSharedValue(0.95),
  }));

  React.useEffect(() => {
    // Animate in title and subtitle
    titleOpacity.value = withDelay(100, withSpring(1));
    titleTranslateY.value = withDelay(100, withSpring(0));

    subtitleOpacity.value = withDelay(200, withSpring(1));
    subtitleTranslateY.value = withDelay(200, withSpring(0));

    // Animate in cards with stagger
    cardAnimations.forEach((card, index) => {
      const delay = 300 + (index * 100);

      card.opacity.value = withDelay(delay, withSpring(1));
      card.translateY.value = withDelay(delay, withSpring(0));
      card.scale.value = withDelay(delay, withSpring(1));
    });
  }, []);

  const cardWidth = isMobile ? '100%' : (isTablet ? '50%' : '33.333%');
  const numColumns = isMobile ? 1 : (isTablet ? 2 : 3);

  return (
    <View style={[styles.container, commonStyles.sectionContainer]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section Header */}
        <Animated.View style={[
          styles.headerContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}>
          <Text style={styles.title}>Killer Feature Stack</Text>
          <Text style={styles.subtitle}>
            Tools designed to make you addicted to financial freedom.
            Lurk isn't just an app; it's your financial weapon.
          </Text>
        </Animated.View>

        {/* Features Grid */}
        <View style={styles.grid}>
          {features.map((feature, index) => {
            const animatedStyle = {
              opacity: cardAnimations[index].opacity,
              transform: [
                { translateY: cardAnimations[index].translateY },
                { scale: cardAnimations[index].scale },
              ],
            };

            return (
              <Animated.View
                key={index}
                style={[
                  styles.cardContainer,
                  { width: cardWidth },
                  animatedStyle,
                ]}
              >
                <Card style={[styles.card, { borderColor: feature.color + '50' }]}>
                  <View style={styles.cardContent}>
                    {/* Icon Container */}
                    <Animated.View style={[
                      styles.iconContainer,
                      {
                        backgroundColor: feature.color,
                      },
                    ]}>
                      {feature.icon}
                    </Animated.View>

                    {/* Card Title */}
                    <Text style={styles.cardTitle}>{feature.title}</Text>

                    {/* Card Description */}
                    <Text style={styles.cardDescription}>{feature.description}</Text>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    minHeight: '100vh',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    maxWidth: 800,
    alignSelf: 'center',
  },
  title: {
    fontSize: width > 768 ? 48 : 36,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: width > 768 ? 18 : 16,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter',
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -spacing.sm,
  },
  cardContainer: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.card + '30',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 0,
    height: '100%',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    padding: spacing.lg,
    height: '100%',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.md,
    fontFamily: 'Inter',
  },
  cardDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    fontFamily: 'Inter',
    flex: 1,
  },
});

export default Features;