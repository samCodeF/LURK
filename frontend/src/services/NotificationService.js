/**
 * Notification Service for Lurk - Push Notifications Management
 * Handles local notifications, scheduling, and push token management
 */

import {
  Platform,
  PermissionsAndroid,
  Alert,
  Linking,
  DeviceEventEmitter,
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messaging } from '@react-native-firebase/messaging';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.pushToken = null;
    this.notificationChannels = [
      {
        id: 'payment_reminders',
        name: 'Payment Reminders',
        description: 'Notifications about upcoming credit card payments',
        importance: 'high',
        vibrate: true,
        sound: true,
      },
      {
        id: 'payment_confirmations',
        name: 'Payment Confirmations',
        description: 'Confirmations for successful payments',
        importance: 'default',
        vibrate: true,
        sound: true,
      },
      {
        id: 'security_alerts',
        name: 'Security Alerts',
        description: 'Important security notifications',
        importance: 'high',
        vibrate: true,
        sound: true,
      },
      {
        id: 'marketing',
        name: 'Marketing & Updates',
        description: 'Promotional offers and app updates',
        importance: 'low',
        vibrate: false,
        sound: false,
      },
      {
        id: 'general',
        name: 'General Notifications',
        description: 'General app notifications',
        importance: 'default',
        vibrate: true,
        sound: true,
      },
    ];
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('Initializing Notification Service...');

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions denied');
        return false;
      }

      // Initialize local notifications
      await this.initializeLocalNotifications();

      // Initialize FCM
      await this.initializeFCM();

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      this.isInitialized = true;
      console.log('Notification Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Notification Service:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      if (Platform.OS === 'ios') {
        // iOS permissions
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('iOS notification permission status:', authStatus);
        return enabled;
      } else {
        // Android permissions
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // Android < 13 doesn't need explicit permission
          return true;
        }
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Initialize local notifications
   */
  async initializeLocalNotifications() {
    try {
      PushNotification.configure({
        // Called when a notification is received
        onNotification: (notification) => {
          console.log('Local notification received:', notification);

          if (notification.userInteraction) {
            // User tapped on notification
            this.handleNotificationPress(notification);
          }

          // Emit event for app to handle
          DeviceEventEmitter.emit('notificationReceived', notification);
        },

        // Called when notification is shown
        onAction: (notification) => {
          console.log('Notification action:', notification);
          this.handleNotificationAction(notification);
        },

        // Android specific
        onRegister: (token) => {
          console.log('Local notification token:', token);
        },

        // Android settings
        popInitialNotification: true,
        requestPermissions: false, // We handle permissions manually

        // iOS settings
        senderID: 'YOUR_SENDER_ID', // FCM sender ID
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // iOS presentation options
        presentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      });

      // Set default notification channel (Android)
      PushNotification.channelExists('default', (exists) => {
        if (!exists) {
          PushNotification.createChannel(
            {
              channelId: 'default',
              channelName: 'Default Channel',
              channelDescription: 'Default notification channel',
              playSound: true,
              soundName: 'default',
              importance: 4,
              vibrate: true,
            },
            (created) => console.log('Default channel created:', created)
          );
        }
      });
    } catch (error) {
      console.error('Error initializing local notifications:', error);
      throw error;
    }
  }

  /**
   * Initialize Firebase Cloud Messaging
   */
  async initializeFCM() {
    try {
      // Check if app has permission
      const authStatus = await messaging().hasPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('FCM permissions not granted');
        return;
      }

      // Get FCM token
      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);
      this.pushToken = fcmToken;

      // Store token locally
      await AsyncStorage.setItem('@lurk_fcm_token', fcmToken);

      // Listen for token refresh
      messaging().onTokenRefresh(async (token) => {
        console.log('FCM Token refreshed:', token);
        this.pushToken = token;
        await AsyncStorage.setItem('@lurk_fcm_token', token);

        // TODO: Send new token to backend
        // await ApiService.updatePushToken(token);
      });

      // Handle background/quit state messages
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('Message handled in the background!', remoteMessage);
        this.handleRemoteMessage(remoteMessage);
      });

      // Handle foreground messages
      messaging().onMessage(async (remoteMessage) => {
        console.log('Message in foreground!', remoteMessage);
        this.handleRemoteMessage(remoteMessage);
      });

      // Handle when app is opened from notification
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('App opened from notification:', remoteMessage);
        this.handleNotificationPress({
          data: remoteMessage.data,
          userInteraction: true,
        });
      });

      // Check if app was opened from notification
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('App opened from quit state:', initialNotification);
        this.handleNotificationPress({
          data: initialNotification.data,
          userInteraction: true,
        });
      }
    } catch (error) {
      console.error('Error initializing FCM:', error);
      throw error;
    }
  }

  /**
   * Create notification channels (Android)
   */
  createNotificationChannels() {
    this.notificationChannels.forEach((channel) => {
      PushNotification.createChannel(
        {
          channelId: channel.id,
          channelName: channel.name,
          channelDescription: channel.description,
          playSound: channel.sound,
          soundName: 'default',
          importance: channel.importance === 'high' ? 4 : channel.importance === 'low' ? 2 : 3,
          vibrate: channel.vibrate,
        },
        (created) => console.log(`Channel ${channel.id} created:`, created)
      );
    });
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(options) {
    try {
      const {
        id = Date.now().toString(),
        title,
        message,
        channelId = 'general',
        date,
        userInfo = {},
        actions = [],
        largeText,
        bigText,
        subText,
        sound = 'default',
        vibration = 300,
        priority = 'high',
      } = options;

      const notificationData = {
        id,
        title,
        message,
        channelId,
        playSound: sound !== 'silent',
        soundName: sound === 'silent' ? undefined : sound,
        vibrate: vibration > 0,
        vibration,
        priority,
        userInfo,
        actions,
        largeText,
        bigText,
        subText,
      };

      if (date) {
        // Schedule for specific date
        notificationData.date = date;
        PushNotification.localNotificationSchedule(notificationData);
      } else {
        // Show immediately
        PushNotification.localNotification(notificationData);
      }

      console.log('Local notification scheduled:', notificationData);
      return true;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return false;
    }
  }

  /**
   * Cancel local notification
   */
  async cancelLocalNotification(id) {
    try {
      PushNotification.cancelLocalNotifications({ id });
      console.log('Local notification cancelled:', id);
      return true;
    } catch (error) {
      console.error('Error cancelling local notification:', error);
      return false;
    }
  }

  /**
   * Cancel all local notifications
   */
  async cancelAllLocalNotifications() {
    try {
      PushNotification.cancelAllLocalNotifications();
      console.log('All local notifications cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling all local notifications:', error);
      return false;
    }
  }

  /**
   * Schedule payment reminder notification
   */
  async schedulePaymentReminder(payment) {
    try {
      const { id, card_name, due_date, minimum_due, payment_type } = payment;
      const dueDate = new Date(due_date);
      const now = new Date();

      // Calculate reminder times (3 days, 1 day, and 4 hours before due)
      const reminderTimes = [
        { days: 3, hours: 0, message: 'Payment due in 3 days' },
        { days: 1, hours: 0, message: 'Payment due tomorrow!' },
        { days: 0, hours: 4, message: 'Payment due in 4 hours!' },
      ];

      for (const reminder of reminderTimes) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - reminder.days);
        reminderDate.setHours(reminderDate.getHours() - reminder.hours);

        // Only schedule if reminder date is in the future
        if (reminderDate > now) {
          await this.scheduleLocalNotification({
            id: `${id}_reminder_${reminder.days}d_${reminder.hours}h`,
            title: 'Lurk - Payment Reminder',
            message: `${reminder.message}\n${card_name}: ₹${minimum_due}`,
            channelId: 'payment_reminders',
            date: reminderDate,
            userInfo: {
              type: 'payment_reminder',
              payment_id: id,
              card_name,
              minimum_due,
              due_date: dueDate.toISOString(),
            },
            actions: [
              { id: 'pay_now', title: 'Pay Now' },
              { id: 'dismiss', title: 'Dismiss' },
            ],
            priority: 'high',
            vibration: 500,
          });
        }
      }

      console.log('Payment reminders scheduled for:', card_name);
      return true;
    } catch (error) {
      console.error('Error scheduling payment reminder:', error);
      return false;
    }
  }

  /**
   * Schedule payment confirmation notification
   */
  async schedulePaymentConfirmation(payment) {
    try {
      const { id, card_name, amount, status, transaction_id } = payment;

      if (status === 'completed') {
        await this.scheduleLocalNotification({
          id: `${id}_confirmation`,
          title: 'Payment Successful! ✅',
          message: `Payment of ₹${amount} for ${card_name} completed successfully.`,
          channelId: 'payment_confirmations',
          userInfo: {
            type: 'payment_confirmation',
            payment_id: id,
            transaction_id,
          },
          priority: 'default',
        });
      } else if (status === 'failed') {
        await this.scheduleLocalNotification({
          id: `${id}_confirmation`,
          title: 'Payment Failed ❌',
          message: `Payment of ₹${amount} for ${card_name} failed. Please try again.`,
          channelId: 'payment_confirmations',
          userInfo: {
            type: 'payment_confirmation',
            payment_id: id,
            transaction_id,
          },
          priority: 'high',
          vibration: 500,
        });
      }

      console.log('Payment confirmation notification scheduled');
      return true;
    } catch (error) {
      console.error('Error scheduling payment confirmation:', error);
      return false;
    }
  }

  /**
   * Schedule security alert notification
   */
  async scheduleSecurityAlert(securityEvent) {
    try {
      const { type, message, device, timestamp } = securityEvent;

      await this.scheduleLocalNotification({
        id: `security_${type}_${Date.now()}`,
        title: '🔒 Security Alert',
        message: `${message}\nDevice: ${device || 'Unknown'}`,
        channelId: 'security_alerts',
        userInfo: {
          type: 'security_alert',
          event_type: type,
          device,
          timestamp,
        },
        priority: 'high',
        vibration: 700,
      });

      console.log('Security alert notification scheduled');
      return true;
    } catch (error) {
      console.error('Error scheduling security alert:', error);
      return false;
    }
  }

  /**
   * Handle notification press
   */
  handleNotificationPress(notification) {
    try {
      const { data, userInfo } = notification;
      const notificationData = data || userInfo || {};

      console.log('Notification pressed:', notificationData);

      // Handle different notification types
      switch (notificationData.type) {
        case 'payment_reminder':
          // Navigate to payment screen
          this.emitNavigationEvent('PaymentDetails', {
            paymentId: notificationData.payment_id,
          });
          break;

        case 'payment_confirmation':
          // Navigate to payment history
          this.emitNavigationEvent('PaymentHistory');
          break;

        case 'security_alert':
          // Navigate to security settings
          this.emitNavigationEvent('Settings', {
            tab: 'security',
          });
          break;

        case 'marketing':
          // Navigate to offers or specific screen
          if (notificationData.screen) {
            this.emitNavigationEvent(notificationData.screen, notificationData.params);
          }
          break;

        default:
          // Default behavior - navigate to home
          this.emitNavigationEvent('Dashboard');
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  }

  /**
   * Handle notification action
   */
  handleNotificationAction(notification) {
    try {
      const { action, userInfo } = notification;
      const notificationData = userInfo || {};

      console.log('Notification action:', action, notificationData);

      switch (action) {
        case 'pay_now':
          // Navigate to immediate payment screen
          this.emitNavigationEvent('PaymentDetails', {
            paymentId: notificationData.payment_id,
            action: 'pay_now',
          });
          break;

        case 'dismiss':
          // Just dismiss the notification
          break;

        default:
          // Handle custom actions
          break;
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }

  /**
   * Handle remote message from FCM
   */
  handleRemoteMessage(remoteMessage) {
    try {
      const { notification, data } = remoteMessage;

      // Extract notification data
      const title = notification?.title || 'Lurk';
      const body = notification?.body || 'You have a new notification';
      const notificationData = data || {};

      // Show local notification (for background/quit state)
      this.scheduleLocalNotification({
        title,
        message: body,
        channelId: notificationData.channelId || 'general',
        userInfo: notificationData,
        priority: notificationData.priority || 'default',
        vibration: notificationData.vibrate ? 300 : 0,
      });

      console.log('Remote message handled:', remoteMessage);
    } catch (error) {
      console.error('Error handling remote message:', error);
    }
  }

  /**
   * Emit navigation event for app to handle
   */
  emitNavigationEvent(screen, params = {}) {
    try {
      DeviceEventEmitter.emit('navigateTo', {
        screen,
        params,
      });
      console.log('Navigation event emitted:', { screen, params });
    } catch (error) {
      console.error('Error emitting navigation event:', error);
    }
  }

  /**
   * Get pending local notifications
   */
  async getPendingNotifications() {
    return new Promise((resolve) => {
      PushNotification.getDeliveredNotifications((notifications) => {
        resolve(notifications);
      });
    });
  }

  /**
   * Get notification settings from storage
   */
  async getNotificationSettings() {
    try {
      const settings = await AsyncStorage.getItem('@lurk_notification_settings');
      return settings ? JSON.parse(settings) : {
        payment_reminders: true,
        payment_confirmations: true,
        security_alerts: true,
        marketing: false,
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {};
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings) {
    try {
      await AsyncStorage.setItem('@lurk_notification_settings', JSON.stringify(settings));
      console.log('Notification settings updated:', settings);
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled() {
    try {
      const settings = await this.getNotificationSettings();
      return Object.values(settings).some(enabled => enabled);
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return false;
    }
  }

  /**
   * Clear notification badge count
   */
  async clearNotificationBadge() {
    try {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.setApplicationIconBadgeNumber(0);
      }
      console.log('Notification badge cleared');
      return true;
    } catch (error) {
      console.error('Error clearing notification badge:', error);
      return false;
    }
  }

  /**
   * Get push token
   */
  getPushToken() {
    return this.pushToken;
  }

  /**
   * Get stored push token
   */
  async getStoredPushToken() {
    try {
      return await AsyncStorage.getItem('@lurk_fcm_token');
    } catch (error) {
      console.error('Error getting stored push token:', error);
      return null;
    }
  }

  /**
   * Test notification
   */
  async testNotification() {
    try {
      await this.scheduleLocalNotification({
        title: 'Test Notification',
        message: 'This is a test notification from Lurk!',
        channelId: 'general',
        priority: 'high',
        vibration: 300,
      });
      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  /**
   * Schedule daily payment check
   */
  async scheduleDailyPaymentCheck() {
    try {
      const now = new Date();
      const checkTime = new Date(now);
      checkTime.setHours(9, 0, 0, 0); // 9:00 AM

      // If time has passed, schedule for tomorrow
      if (checkTime <= now) {
        checkTime.setDate(checkTime.getDate() + 1);
      }

      await this.scheduleLocalNotification({
        id: 'daily_payment_check',
        title: 'Daily Payment Check',
        message: 'Check for upcoming credit card payments today',
        channelId: 'payment_reminders',
        date: checkTime,
        userInfo: {
          type: 'daily_check',
        },
        priority: 'low',
        repeatType: 'day',
      });

      console.log('Daily payment check scheduled for:', checkTime);
      return true;
    } catch (error) {
      console.error('Error scheduling daily payment check:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;