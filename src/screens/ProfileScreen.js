/**
 * Profile Screen - User Profile and Settings
 * User account management for Lurk App
 */

import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Card, Button, List, Switch} from 'react-native-paper';

import IconComponent from '../components/IconComponent';
import {SettingsIcons, SecurityIcons, PremiumIcons} from '../constants/icons';
import {colors} from '../constants/theme';

const ProfileScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [biometricEnabled, setBiometricEnabled] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      {/* User Info Card */}
      <Card style={styles.userCard}>
        <Card.Content style={styles.userContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>JD</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userEmail}>john.doe@example.com</Text>
            <View style={styles.premiumBadge}>
              <IconComponent {...PremiumIcons.crown} size={16} />
              <Text style={styles.premiumText}>Gold Member</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <Card.Title title="Settings" />
        <Card.Content>
          <List.Item
            title="Push Notifications"
            description="Get payment reminders and updates"
            left={(props) => <IconComponent {...SettingsIcons.notifications} />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            )}
          />

          <List.Item
            title="Biometric Authentication"
            description="Use fingerprint or face ID"
            left={(props) => <IconComponent {...SecurityIcons.fingerprint} />}
            right={() => (
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
              />
            )}
          />

          <List.Item
            title="Privacy & Security"
            description="Manage your privacy settings"
            left={(props) => <IconComponent {...SettingsIcons.privacy} />}
            right={(props) => <IconComponent {...UIIcons.forward} />}
          />

          <List.Item
            title="Language"
            description="English"
            left={(props) => <IconComponent {...SettingsIcons.language} />}
            right={(props) => <IconComponent {...UIIcons.forward} />}
          />
        </Card.Content>
      </Card>

      {/* Support */}
      <Card style={styles.supportCard}>
        <Card.Title title="Support" />
        <Card.Content>
          <List.Item
            title="Help Center"
            description="Get help with using Lurk"
            left={(props) => <IconComponent {...SettingsIcons.help} />}
            right={(props) => <IconComponent {...UIIcons.forward} />}
          />

          <List.Item
            title="Share Feedback"
            description="Help us improve the app"
            left={(props) => <IconComponent {...SettingsIcons.feedback} />}
            right={(props) => <IconComponent {...UIIcons.forward} />}
          />

          <List.Item
            title="Rate App"
            description="Rate us on the app store"
            left={(props) => <IconComponent {...SettingsIcons.rate} />}
            right={(props) => <IconComponent {...UIIcons.forward} />}
          />
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => console.log('Share App')}
          style={styles.actionButton}
          icon={() => <IconComponent {...SocialIcons.share} />}>
          Share App
        </Button>

        <Button
          mode="text"
          onPress={() => console.log('Logout')}
          style={styles.actionButton}
          textColor={colors.error}
          icon={() => <IconComponent {...SettingsIcons.logout} />}>
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  userCard: {
    margin: 16,
    elevation: 2,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  premiumText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  settingsCard: {
    margin: 16,
    elevation: 2,
  },
  supportCard: {
    margin: 16,
    elevation: 2,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    marginVertical: 4,
  },
});

export default ProfileScreen;