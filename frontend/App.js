/**
 * Lurk - Never Pay Credit Card Interest Again
 * Main App Entry Point
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { ThemeProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Redux actions and selectors
import { loadUser, checkAuthStatus } from './src/store/slices/authSlice';
import { fetchCards } from './src/store/slices/cardsSlice';
import { fetchUpcomingPayments } from './src/store/slices/paymentsSlice';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CardsListScreen from './src/screens/CardsListScreen';
import PaymentAlertsScreen from './src/screens/PaymentAlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import KYCScreen from './src/screens/KYCScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import services
import { NotificationService } from './src/services/NotificationService';
import { StorageService } from './src/services/StorageService';
import { ApiService } from './src/services/ApiService';

// Import theme
import theme from './src/theme/theme';

// Create navigation stacks
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Onboarding Stack (for first-time users)
const OnboardingStack = createNativeStackNavigator();

const OnboardingNavigator = () => (
  <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} />
    <OnboardingStack.Screen name="KYC" component={KYCScreen} />
    <OnboardingStack.Screen name="Profile" component={ProfileScreen} />
  </OnboardingStack.Navigator>
);

// Auth Stack (for login/register)
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Main Tab Navigator
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Dashboard') iconName = 'home';
        else if (route.name === 'Cards') iconName = 'credit-card';
        else if (route.name === 'Payments') iconName = 'bell';
        else if (route.name === 'Settings') iconName = 'cog';
        return <TabIcon name={iconName} color={color} size={size} />;
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarStyle: {
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarLabel: 'Home',
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Cards"
      component={CardsListScreen}
      options={{
        tabBarLabel: 'Cards',
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Payments"
      component={PaymentAlertsScreen}
      options={{
        tabBarLabel: 'Alerts',
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarLabel: 'Settings',
        headerShown: false,
      }}
    />
  </Tab.Navigator>
);

// Main Stack (includes premium screens)
const MainNavigator = () => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    <MainStack.Screen name="MainTabs" component={TabNavigator} />
    <MainStack.Screen
      name="Premium"
      component={PremiumScreen}
      options={{
        presentation: 'modal',
        animationType: 'slide_from_bottom',
      }}
    />
  </MainStack.Navigator>
);

// Root App Component
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check authentication status on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check stored auth status
        const authStatus = await StorageService.getAuthStatus();
        const storedUser = await StorageService.getUserData();

        if (authStatus.isAuthenticated && storedUser) {
          setIsAuthenticated(true);
          setUser(storedUser);

          // Load user data into Redux
          store.dispatch(loadUser(storedUser));

          // Fetch initial data
          await Promise.all([
            store.dispatch(fetchCards()),
            store.dispatch(fetchUpcomingPayments())
          ]);
        }
      } catch (error) {
        console.error('App initialization error:', error);
        // Clear corrupted data
        await StorageService.clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Initialize notification service
  useEffect(() => {
    if (isAuthenticated) {
      NotificationService.initialize();

      // Handle notification interactions
      NotificationService.onNotificationPressed((notification) => {
        // Navigate to appropriate screen based on notification type
        handleNotificationNavigation(notification);
      });
    }
  }, [isAuthenticated]);

  // Handle notification navigation
  const handleNotificationNavigation = useCallback((notification) => {
    const { type, data } = notification;

    switch (type) {
      case 'payment_reminder':
        // Navigate to payment alerts
        break;
      case 'payment_successful':
        // Navigate to dashboard with celebration
        break;
      case 'card_synced':
        // Navigate to cards list
        break;
      case 'premium_upgrade':
        // Navigate to premium screen
        break;
      default:
        // Default to dashboard
        break;
    }
  }, []);

  // API error handling
  useEffect(() => {
    const unsubscribe = ApiService.onAuthError(() => {
      // Clear auth data and redirect to login
      setIsAuthenticated(false);
      setUser(null);
      StorageService.clearAuthData();
    });

    return unsubscribe;
  }, []);

  // Loading screen while checking auth
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <NavigationContainer>
            {isAuthenticated ? (
              <MainNavigator user={user} />
            ) : (
                <AuthNavigator />
            )}
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;