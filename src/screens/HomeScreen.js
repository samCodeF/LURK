/**
 * Home Screen - Main Dashboard
 * Financial dashboard for Lurk App
 */

import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Card, Button, Avatar} from 'react-native-paper';
import {useSelector} from 'react-redux';

import IconComponent from '../components/IconComponent';
import {AppIcons, FinancialIcons} from '../constants/icons';
import {colors} from '../constants/theme';

const HomeScreen = () => {
  const {user} = useSelector(state => state.auth);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar.Text
          size={50}
          label={user?.name?.charAt(0).toUpperCase() || 'U'}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <IconComponent
          {...AppIcons.notifications}
          onPress={() => console.log('Notifications pressed')}
        />
      </View>

      {/* Overview Card */}
      <Card style={styles.overviewCard}>
        <Card.Content>
          <View style={styles.overviewContent}>
            <View style={styles.overviewItem}>
              <IconComponent {...FinancialIcons.savings} />
              <Text style={styles.overviewLabel}>Total Saved</Text>
              <Text style={styles.overviewValue}>₹12,450</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.overviewItem}>
              <IconComponent {...FinancialIcons.trendingUp} />
              <Text style={styles.overviewLabel}>This Month</Text>
              <Text style={styles.overviewValue}>₹2,340</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.quickActionsCard}>
        <Card.Title title="Quick Actions" />
        <Card.Content>
          <View style={styles.quickActions}>
            <Button
              mode="contained"
              onPress={() => console.log('Add Card')}
              style={styles.actionButton}
              icon={() => <IconComponent {...AppIcons.addCard} />}>
              Add Card
            </Button>
            <Button
              mode="outlined"
              onPress={() => console.log('View Cards')}
              style={styles.actionButton}
              icon={() => <IconComponent {...AppIcons.creditCard} />}>
              View Cards
            </Button>
            <Button
              mode="outlined"
              onPress={() => console.log('View Analytics')}
              style={styles.actionButton}
              icon={() => <IconComponent {...AppIcons.analytics} />}>
              Analytics
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Recent Activity */}
      <Card style={styles.activityCard}>
        <Card.Title title="Recent Activity" />
        <Card.Content>
          <View style={styles.activityItem}>
            <IconComponent {...StatusIcons.success} />
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>HDFC Card Payment</Text>
              <Text style={styles.activityDescription}>Minimum due paid automatically</Text>
            </View>
            <Text style={styles.activityAmount}>₹1,500</Text>
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
    padding: 16,
    backgroundColor: colors.primary,
  },
  avatar: {
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  welcome: {
    color: colors.surface,
    fontSize: 14,
  },
  userName: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  overviewCard: {
    margin: 16,
    elevation: 2,
  },
  overviewContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    height: '60%',
    marginHorizontal: 16,
  },
  quickActionsCard: {
    margin: 16,
    elevation: 2,
  },
  quickActions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  activityCard: {
    margin: 16,
    marginBottom: 32,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityText: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
});

export default HomeScreen;