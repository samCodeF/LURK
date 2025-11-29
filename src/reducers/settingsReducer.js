/**
 * Settings Reducer
 * Manages app settings and preferences
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  settings: {
    notifications: {
      pushEnabled: true,
      emailEnabled: true,
      paymentReminders: true,
      marketingEmails: false,
    },
    security: {
      biometricEnabled: false,
      twoFactorAuth: false,
      autoLock: false,
    },
    preferences: {
      theme: 'light',
      language: 'en',
      currency: 'INR',
      dateFormat: 'DD MMM YYYY',
    },
    automation: {
      autoPayEnabled: true,
      autoPayMinDays: 3,
      emergencyStopEnabled: true,
    },
  },
  isLoading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    fetchSettingsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchSettingsSuccess: (state, action) => {
      state.isLoading = false;
      state.settings = action.payload;
      state.error = null;
    },
    fetchSettingsFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateNotificationSettings: (state, action) => {
      state.settings.notifications = {...state.settings.notifications, ...action.payload};
    },
    updateSecuritySettings: (state, action) => {
      state.settings.security = {...state.settings.security, ...action.payload};
    },
    updatePreferences: (state, action) => {
      state.settings.preferences = {...state.settings.preferences, ...action.payload};
    },
    updateAutomationSettings: (state, action) => {
      state.settings.automation = {...state.settings.automation, ...action.payload};
    },
    toggleTheme: (state) => {
      state.settings.preferences.theme =
        state.settings.preferences.theme === 'light' ? 'dark' : 'light';
    },
  },
});

export const {
  fetchSettingsStart,
  fetchSettingsSuccess,
  fetchSettingsFailure,
  updateNotificationSettings,
  updateSecuritySettings,
  updatePreferences,
  updateAutomationSettings,
  toggleTheme,
} = settingsSlice.actions;

export default settingsSlice.reducer;