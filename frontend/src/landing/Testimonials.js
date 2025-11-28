import React, { useSharedValue, withDelay, withSpring } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Card, Avatar } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { testimonials } from './constants';
import { commonStyles, colors, spacing, borderRadius, useResponsive } from './styles';

const { width } = Dimensions.get('window');

const Testimonials = () => {
  const { isMobile, isTablet } = useResponsive();

  // Animation values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);

  // Card animation values
  const cardAnimations = testimonials.map((_, index) => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(30),
  }));

  React.useEffect(() => {
    // Animate in title and subtitle
    titleOpacity.value = withDelay(100, withSpring(1));
    titleTranslateY.value = withDelay(100, withSpring(0));

    subtitleOpacity.value = withDelay(200, withSpring(1));
    subtitleTranslateY.value = withDelay(200, withSpring(0));

    // Animate in cards with stagger
    cardAnimations.forEach((card, index) => {
      const delay = 300 + (index * 150);

      card.opacity.value = withDelay(delay, withSpring(1));
      card.translateY.value = withDelay(delay, withSpring(0));
    });
  }, []);

  const numColumns = isMobile ? 1 : 3;
  const cardWidth = isMobile ? '100%' : (isTablet ? '50%' : '33.333%');

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
          <Text style={styles.title}>Trusted by <Text style={styles.gradientText}>Ninjas</Text></Text>
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            Join our community of smart spenders.
          </Animated.Text>
        </Animated.View>

        {/* Testimonials Grid */}
        <View style={styles.grid}>
          {testimonials.map((testimonial, index) => {
            const animatedStyle = {
              opacity: cardAnimations[index].opacity,
              transform: [{ translateY: cardAnimations[index].translateY }],
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
                <Card style={styles.card}>
                  <Card.Content style={styles.cardContent}>
                    {/* Avatar and Name */}
                    <View style={styles.avatarContainer}>
                      <Avatar.Text
                        size={48}
                        label={testimonial.initials}
                        style={styles.avatar}
                        labelStyle={styles.avatarText}
                      />
                      <View style={styles.nameContainer}>
                        <Text style={styles.name}>{testimonial.name}</Text>
                        <Text style={styles.role}>{testimonial.role}</Text>
                      </View>
                    </View>

                    {/* Testimonial Content */}
                    <Text style={styles.content}>"{testimonial.content}"</Text>
                  </Card.Content>
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: '100vh',
  },
  scrollContent: {
    flexGrow: 1,
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
  gradientText: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: width > 768 ? 18 : 16,
    color: colors.mutedForeground,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -spacing.sm,
  },
  cardContainer: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card + '50',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
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
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    backgroundColor: colors.primary + '20',
    borderWidth: 0,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  nameContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  role: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontFamily: 'Inter',
  },
  content: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    fontFamily: 'Inter',
    flex: 1,
  },
});

export default Testimonials;