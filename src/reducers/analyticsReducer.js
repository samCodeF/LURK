/**
 * Analytics Reducer
 * Manages financial analytics and insights
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  analytics: {
    totalSavings: 0,
    thisMonthSavings: 0,
    avoidedInterest: 0,
    creditScore: 0,
    spendingByCategory: [],
    monthlyTrends: [],
    upcomingPayments: [],
  },
  isLoading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    fetchAnalyticsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchAnalyticsSuccess: (state, action) => {
      state.isLoading = false;
      state.analytics = action.payload;
      state.error = null;
    },
    fetchAnalyticsFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateSavings: (state, action) => {
      state.analytics.totalSavings += action.payload;
    },
    addMonthlyTrend: (state, action) => {
      state.analytics.monthlyTrends.push(action.payload);
    },
    addUpcomingPayment: (state, action) => {
      state.analytics.upcomingPayments.push(action.payload);
    },
  },
});

export const {
  fetchAnalyticsStart,
  fetchAnalyticsSuccess,
  fetchAnalyticsFailure,
  updateSavings,
  addMonthlyTrend,
  addUpcomingPayment,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;