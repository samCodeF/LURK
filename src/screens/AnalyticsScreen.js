/**
 * Analytics Screen - Financial Analytics
 * Spending analysis and insights for Lurk App
 */

import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Card, Button} from 'react-native-paper';

import IconComponent from '../components/IconComponent';
import {FinancialIcons, StatusIcons} from '../constants/icons';
import {colors} from '../constants/theme';

const AnalyticsScreen = () => {
  const mockAnalytics = {
    totalSavings: '45,230',
    thisMonthSavings: '8,450',
    avoidedInterest: '12,780',
    creditScore: '785',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Button
          mode="text"
          onPress={() => console.log('Export')}
          icon={() => <IconComponent {...ActionIcons.download} />}>
          Export
        </Button>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewCards}>
        <Card style={styles.overviewCard}>
          <Card.Content style={styles.cardContent}>
            <IconComponent {...FinancialIcons.savings} size={32} />
            <Text style={styles.overviewLabel}>Total Savings</Text>
            <Text style={styles.overviewValue}>₹{mockAnalytics.totalSavings}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.overviewCard}>
          <Card.Content style={styles.cardContent}>
            <IconComponent {...StatusIcons.success} size={32} />
            <Text style={styles.overviewLabel}>This Month</Text>
            <Text style={styles.overviewValue}>₹{mockAnalytics.thisMonthSavings}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Detailed Stats */}
      <Card style={styles.statsCard}>
        <Card.Title title="Performance Metrics" />
        <Card.Content>
          <View style={styles.statItem}>
            <IconComponent {...FinancialIcons.profit} />
            <View style={styles.statText}>
              <Text style={styles.statLabel}>Avoided Interest</Text>
              <Text style={styles.statValue}>₹{mockAnalytics.avoidedInterest}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <IconComponent {...StatusIcons.verified} />
            <View style={styles.statText}>
              <Text style={styles.statLabel}>Credit Score Impact</Text>
              <Text style={styles.statValue}>{mockAnalytics.creditScore}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Insights */}
      <Card style={styles.insightsCard}>
        <Card.Title title="AI Insights" />
        <Card.Content>
          <View style={styles.insightItem}>
            <IconComponent {...GamificationIcons.lightning} />
            <View style={styles.insightText}>
              <Text style={styles.insightTitle}>Optimization Opportunity</Text>
              <Text style={styles.insightDescription}>
                Consider increasing automation on HDFC card for additional ₹450/month savings
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  overviewCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    elevation: 2,
  },
  cardContent: {
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  statsCard: {
    margin: 16,
    elevation: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statText: {
    flex: 1,
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  insightsCard: {
    margin: 16,
    elevation: 2,
  },
  insightItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  insightText: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  insightDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
});

export default AnalyticsScreen;