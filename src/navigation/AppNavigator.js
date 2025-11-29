/**
 * App Navigator - Main Navigation Structure
 * React Navigation setup for Lurk App
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Provider as PaperProvider} from 'react-native-paper';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CardsScreen from '../screens/CardsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Icons
import IconComponent from '../components/IconComponent';
import {TabBarIcons, NavigationIcons} from '../constants/icons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;
          let iconType = 'MaterialIcons';

          switch (route.name) {
            case 'Home':
              iconName = TabBarIcons.home.name;
              iconType = TabBarIcons.home.type;
              break;
            case 'Cards':
              iconName = TabBarIcons.cards.name;
              iconType = TabBarIcons.cards.type;
              break;
            case 'Analytics':
              iconName = TabBarIcons.analytics.name;
              iconType = TabBarIcons.analytics.type;
              break;
            case 'Profile':
              iconName = TabBarIcons.profile.name;
              iconType = TabBarIcons.profile.type;
              break;
            default:
              iconName = 'home';
              iconType = 'MaterialIcons';
          }

          return (
            <IconComponent
              name={iconName}
              type={iconType}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Dashboard'}}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{title: 'Cards'}}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{title: 'Analytics'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
    </Tab.Navigator>
  );
};

// Stack Navigator
const AppNavigator = () => {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{headerShown: false}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default AppNavigator;