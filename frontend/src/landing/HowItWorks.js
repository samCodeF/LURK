import React, { useSharedValue, withDelay, withSpring } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { steps } from './constants';
import { commonStyles, colors, spacing, borderRadius, useResponsive } from './styles';

const { width } = Dimensions.get('window');

const HowItWorks = () => {
  const { isMobile } = useResponsive();

  // Animation values
  const leftContentOpacity = useSharedValue(0);
  const leftContentTranslateY = useSharedValue(20);
  const rightContentOpacity = useSharedValue(0);
  const rightContentTranslateY = useSharedValue(40);

  // Step animation values
  const stepAnimations = steps.map((_, index) => ({
    opacity: useSharedValue(0),
    translateX: useSharedValue(-20),
    borderColor: useSharedValue(colors.border),
    textColor: useSharedValue(colors.mutedForeground),
  }));

  React.useEffect(() => {
    // Animate left content
    leftContentOpacity.value = withDelay(100, withSpring(1));
    leftContentTranslateY.value = withDelay(100, withSpring(0));

    // Animate right content
    rightContentOpacity.value = withDelay(300, withSpring(1));
    rightContentTranslateY.value = withDelay(300, withSpring(0));

    // Animate steps with stagger
    stepAnimations.forEach((step, index) => {
      const delay = 200 + (index * 150);

      step.opacity.value = withDelay(delay, withSpring(1));
      step.translateX.value = withDelay(delay, withSpring(0));
    });
  }, []);

  const handleStepHover = (index) => {
    stepAnimations[index].borderColor.value = withSpring(colors.primary);
    stepAnimations[index].textColor.value = withSpring(colors.primary);
  };

  const handleStepLeave = (index) => {
    stepAnimations[index].borderColor.value = withSpring(colors.border);
    stepAnimations[index].textColor.value = withSpring(colors.mutedForeground);
  };

  const handleStartClick = () => {
    console.log('Start lurking now clicked');
  };

  return (
    <View style={[styles.container, commonStyles.sectionContainer]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentContainer}>
          {/* Left Content */}
          <View style={styles.leftContent}>
            <Animated.View style={[
              styles.headerContainer,
              {
                opacity: leftContentOpacity,
                transform: [{ translateY: leftContentTranslateY }],
              },
            ]}>
              <Text style={styles.title}>
                Automate your {'\n'}
                <Text style={styles.gradientText}>financial defense.</Text>
              </Text>
              <Text style={styles.subtitle}>
                Setup takes less than 2 minutes. The peace of mind lasts forever.
                Join thousands of users who have stopped donating money to banks.
              </Text>
            </Animated.View>

            {/* Steps */}
            <View style={styles.stepsContainer}>
              {steps.map((step, index) => {
                const animatedStyle = {
                  opacity: stepAnimations[index].opacity,
                  transform: [{ translateX: stepAnimations[index].translateX }],
                };

                return (
                  <Animated.View key={index} style={[styles.stepContainer, animatedStyle]}>
                    <TouchableOpacity
                      style={styles.step}
                      activeOpacity={0.8}
                      onPressIn={() => handleStepHover(index)}
                      onPressOut={() => handleStepLeave(index)}
                    >
                      <Animated.View
                        style={[
                          styles.stepNumber,
                          {
                            borderColor: stepAnimations[index].borderColor,
                            backgroundColor: stepAnimations[index].borderColor,
                          },
                        ]}
                      >
                        <Animated.Text
                          style={[
                            styles.stepNumberText,
                            {
                              color: stepAnimations[index].textColor,
                            },
                          ]}
                        >
                          {step.number}
                        </Animated.Text>
                      </Animated.View>
                      <View style={styles.stepContent}>
                        <Animated.Text
                          style={[
                            styles.stepTitle,
                            {
                              color: stepAnimations[index].textColor,
                            },
                          ]}
                        >
                          {step.title}
                        </Animated.Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* CTA Button */}
            <Button
              mode="contained"
              onPress={handleStartClick}
              style={styles.ctaButton}
              contentStyle={styles.ctaButtonContent}
              labelStyle={styles.ctaButtonText}
            >
              Start Lurking Now
            </Button>
          </View>

          {/* Right Content - Visual Flow */}
          <Animated.View
            style={[
              styles.rightContent,
              {
                opacity: rightContentOpacity,
                transform: [{ translateY: rightContentTranslateY }],
              },
            ]}
          >
            <View style={styles.visualContainer}>
              {/* Background Gradient */}
              <LinearGradient
                colors={[colors.primary + '20', 'transparent']}
                style={styles.backgroundGradient}
                start={{ x: 0.5, y: 0.1 }}
                end={{ x: 0.5, y: 0.8 }}
              />

              {/* Flow Visualization */}
              <Card style={styles.flowCard}>
                {/* Header */}
                <View style={styles.flowHeader}>
                  <View style={styles.flowLine} />
                  <View style={styles.flowDot} />
                </View>

                {/* Content */}
                <View style={styles.flowContent}>
                  {/* Mock Card Items */}
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.flowItem}>
                      <View style={styles.flowItemIcon} />
                      <View style={styles.flowItemText}>
                        <View style={[styles.flowTextLine, { width: 80 + i * 20 }]} />
                        <View style={[styles.flowTextLine, { width: 60 + i * 10 }]} />
                      </View>
                      <View style={[styles.flowStatus, { backgroundColor: colors.success + '20' }]} />
                    </View>
                  ))}
                </View>

                {/* Footer */}
                <View style={styles.flowFooter}>
                  <View style={styles.flowTotalContainer}>
                    <Text style={styles.flowTotalLabel}>Total Saved</Text>
                    <Text style={styles.flowTotalValue}>₹45,200</Text>
                  </View>
                  <View style={styles.flowIcon}>
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primary} />
                  </View>
                </View>
              </Card>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    gap: spacing.xxxl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  leftContent: {
    flex: 1,
    alignItems: isMobile ? 'center' : 'flex-start',
  },
  rightContent: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 500,
  },
  headerContainer: {
    marginBottom: spacing.xl,
    maxWidth: 500,
    alignSelf: isMobile ? 'center' : 'flex-start',
  },
  title: {
    fontSize: width > 768 ? 48 : 36,
    fontWeight: '700',
    color: colors.foreground,
    lineHeight: width > 768 ? 54 : 42,
    marginBottom: spacing.lg,
    fontFamily: 'Inter',
    letterSpacing: -0.5,
    textAlign: isMobile ? 'center' : 'left',
  },
  gradientText: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: width > 768 ? 18 : 16,
    color: colors.mutedForeground,
    lineHeight: 24,
    fontFamily: 'Inter',
    textAlign: isMobile ? 'center' : 'left',
    maxWidth: 450,
  },
  stepsContainer: {
    width: '100%',
    marginVertical: spacing.xl,
    gap: spacing.lg,
  },
  stepContainer: {
    width: '100%',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    padding: spacing.sm,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontFamily: 'Inter',
  },
  stepDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  ctaButton: {
    backgroundColor: colors.foreground,
    borderRadius: borderRadius.full,
    marginTop: spacing.xl,
    alignSelf: isMobile ? 'center' : 'flex-start',
    width: isMobile ? '100%' : undefined,
  },
  ctaButtonContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  visualContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    opacity: 0.1,
  },
  flowCard: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card + '50',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  flowLine: {
    width: 80,
    height: 3,
    backgroundColor: colors.foreground + '10',
    borderRadius: 2,
  },
  flowDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.foreground + '10',
  },
  flowContent: {
    flex: 1,
    gap: spacing.lg,
  },
  flowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background + '40',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  flowItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.foreground + '10',
  },
  flowItemText: {
    flex: 1,
    gap: spacing.xs,
  },
  flowTextLine: {
    height: 8,
    backgroundColor: colors.foreground + '10',
    borderRadius: 4,
  },
  flowStatus: {
    width: 48,
    height: 24,
    borderRadius: 12,
  },
  flowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  flowTotalContainer: {
    flex: 1,
  },
  flowTotalLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    fontFamily: 'Inter',
  },
  flowTotalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Inter',
  },
  flowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HowItWorks;