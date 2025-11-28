/**
 * Analytics Slice - Financial Analytics and Insights State
 * Handles spending analysis, savings tracking, and financial recommendations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Import services
import { ApiService } from '../../services/ApiService';

// Initial state
const initialState = {
  // Overview statistics
  overview: {
    total_saved: 0,
    total_interest_saved: 0,
    total_fees_prevented: 0,
    total_payments_processed: 0,
    average_monthly_savings: 0,
    cards_automated: 0,
    active_cards: 0,
    total_credit_limit: 0,
    current_utilization: 0,
    payment_success_rate: 0,
  },

  // Monthly data
  monthly: [],

  // Category breakdown
  categories: [
    { name: 'Shopping', amount: 0, percentage: 0, color: '#FF6B6B', icon: 'shopping-bag' },
    { name: 'Food & Dining', amount: 0, percentage: 0, color: '#4ECDC4', icon: 'food' },
    { name: 'Transportation', amount: 0, percentage: 0, color: '#45B7D1', icon: 'car' },
    { name: 'Bills & Utilities', amount: 0, percentage: 0, color: '#96CEB4', icon: 'lightning-bolt' },
    { name: 'Entertainment', amount: 0, percentage: 0, color: '#FFEAA7', icon: 'movie' },
    { name: 'Healthcare', amount: 0, percentage: 0, color: '#74B9FF', icon: 'medical-bag' },
    { name: 'Education', amount: 0, percentage: 0, color: '#A29BFE', icon: 'school' },
    { name: 'Travel', amount: 0, percentage: 0, color: '#FD79A8', icon: 'airplane' },
    { name: 'Shopping Online', amount: 0, percentage: 0, color: '#FDCB6E', icon: 'cart' },
    { name: 'Others', amount: 0, percentage: 0, color: '#6C5CE7', icon: 'dots-horizontal' },
  ],

  // Card performance
  cardPerformance: [],

  // Payment patterns
  paymentPatterns: {
    average_payment_day: 15,
    most_common_payment_amount: 0,
    payment_frequency: 'monthly',
    on_time_payment_rate: 0,
    late_payment_count: 0,
    total_late_fees_paid: 0,
  },

  // Savings trends
  savingsTrends: {
    monthly: [],
    yearly: [],
    cumulative: [],
  },

  // Utilization trends
  utilizationTrends: {
    monthly: [],
    daily: [],
    by_card: [],
  },

  // Spending insights
  insights: [],

  // Recommendations
  recommendations: [],

  // Goals and targets
  goals: {
    monthly_savings_target: 0,
    utilization_target: 30,
    payment_automation_target: 100,
    emergency_fund_target: 0,
  },

  // Financial health score
  financialHealthScore: {
    score: 0,
    payment_history_score: 0,
    utilization_score: 0,
    diversification_score: 0,
    automation_score: 0,
    last_updated: null,
  },

  // Reports
  reports: {
    monthly: [],
    yearly: [],
    custom: [],
  },

  // Export data
  exportData: null,

  // State
  loading: false,
  refreshing: false,
  error: null,
};

// Async thunks
export const fetchAnalyticsOverview = createAsyncThunk(
  'analytics/fetchOverview',
  async ({ period = 'current_month' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/overview', { period });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch analytics overview');
    }
  }
);

export const fetchMonthlyAnalytics = createAsyncThunk(
  'analytics/fetchMonthly',
  async ({ year = new Date().getFullYear(), limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/monthly', { year, limit });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch monthly analytics');
    }
  }
);

export const fetchCategoryBreakdown = createAsyncThunk(
  'analytics/fetchCategoryBreakdown',
  async ({ period = 'current_month' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/categories', { period });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch category breakdown');
    }
  }
);

export const fetchCardPerformance = createAsyncThunk(
  'analytics/fetchCardPerformance',
  async ({ period = 'current_month' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/card-performance', { period });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch card performance');
    }
  }
);

export const fetchPaymentPatterns = createAsyncThunk(
  'analytics/fetchPaymentPatterns',
  async ({ period = 'last_6_months' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/payment-patterns', { period });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment patterns');
    }
  }
);

export const fetchSavingsTrends = createAsyncThunk(
  'analytics/fetchSavingsTrends',
  async ({ period = 'last_12_months' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/savings-trends', { period });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch savings trends');
    }
  }
);

export const fetchUtilizationTrends = createAsyncThunk(
  'analytics/fetchUtilizationTrends',
  async ({ period = 'last_6_months', cardId = null }, { rejectWithValue }) => {
    try {
      const params = { period };
      if (cardId) params.card_id = cardId;

      const response = await ApiService.get('/analytics/utilization-trends', params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch utilization trends');
    }
  }
);

export const fetchInsights = createAsyncThunk(
  'analytics/fetchInsights',
  async ({ type = 'all', limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/insights', { type, limit });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch insights');
    }
  }
);

export const fetchRecommendations = createAsyncThunk(
  'analytics/fetchRecommendations',
  async ({ category = 'all', priority = 'all' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/recommendations', { category, priority });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recommendations');
    }
  }
);

export const fetchFinancialHealthScore = createAsyncThunk(
  'analytics/fetchFinancialHealthScore',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/analytics/financial-health-score');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch financial health score');
    }
  }
);

export const generateReport = createAsyncThunk(
  'analytics/generateReport',
  async ({ type, period, format = 'pdf', includeCharts = true }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/analytics/reports/generate', {
        type,
        period,
        format,
        include_charts: includeCharts,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate report');
    }
  }
);

export const exportData = createAsyncThunk(
  'analytics/exportData',
  async ({ type = 'full', format = 'json', dateRange = {} }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/analytics/export', {
        type,
        format,
        date_range: dateRange,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export data');
    }
  }
);

export const setFinancialGoals = createAsyncThunk(
  'analytics/setFinancialGoals',
  async ({ goals }, { rejectWithValue }) => {
    try {
      const response = await ApiService.put('/analytics/goals', { goals });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set financial goals');
    }
  }
);

export const trackFinancialEvent = createAsyncThunk(
  'analytics/trackEvent',
  async ({ event, properties = {} }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/analytics/events', {
        event,
        properties,
        timestamp: new Date().toISOString(),
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to track event');
    }
  }
);

export const dismissInsight = createAsyncThunk(
  'analytics/dismissInsight',
  async ({ insightId, action = 'dismissed' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post(`/analytics/insights/${insightId}/dismiss`, { action });
      return { insightId, action, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to dismiss insight');
    }
  }
);

export const acceptRecommendation = createAsyncThunk(
  'analytics/acceptRecommendation',
  async ({ recommendationId, action = 'accepted' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post(`/analytics/recommendations/${recommendationId}/accept`, { action });
      return { recommendationId, action, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept recommendation');
    }
  }
);

// Create slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Set refreshing state
    setRefreshing: (state, action) => {
      state.refreshing = action.payload;
    },

    // Update overview locally
    updateOverview: (state, action) => {
      state.overview = { ...state.overview, ...action.payload };
    },

    // Update categories locally
    updateCategories: (state, action) => {
      state.categories = action.payload;
    },

    // Update goals locally
    updateGoals: (state, action) => {
      state.goals = { ...state.goals, ...action.payload };
    },

    // Add custom category
    addCustomCategory: (state, action) => {
      const existingIndex = state.categories.findIndex(cat => cat.name === action.payload.name);
      if (existingIndex !== -1) {
        state.categories[existingIndex] = { ...state.categories[existingIndex], ...action.payload };
      } else {
        state.categories.push(action.payload);
      }
    },

    // Remove category
    removeCategory: (state, action) => {
      state.categories = state.categories.filter(cat => cat.name !== action.payload);
    },

    // Add custom insight
    addCustomInsight: (state, action) => {
      state.insights.unshift({
        id: `custom_${Date.now()}`,
        ...action.payload,
        created_at: new Date().toISOString(),
        type: 'custom',
      });
    },

    // Update export data
    updateExportData: (state, action) => {
      state.exportData = action.payload;
    },

    // Clear export data
    clearExportData: (state) => {
      state.exportData = null;
    },

    // Reset analytics state
    resetAnalyticsState: (state) => {
      return { ...initialState };
    },

    // Update financial health score locally
    updateFinancialHealthScore: (state, action) => {
      state.financialHealthScore = { ...state.financialHealthScore, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    // Fetch overview
    builder
      .addCase(fetchAnalyticsOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload.overview || initialState.overview;
        state.paymentPatterns = action.payload.payment_patterns || initialState.paymentPatterns;
        state.financialHealthScore = action.payload.financial_health_score || initialState.financialHealthScore;
        state.error = null;
      })
      .addCase(fetchAnalyticsOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch monthly analytics
    builder
      .addCase(fetchMonthlyAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.monthly = action.payload.monthly_data || [];
        state.savingsTrends = action.payload.savings_trends || initialState.savingsTrends;
        state.utilizationTrends = action.payload.utilization_trends || initialState.utilizationTrends;
        state.error = null;
      })
      .addCase(fetchMonthlyAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch category breakdown
    builder
      .addCase(fetchCategoryBreakdown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryBreakdown.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.categories || initialState.categories;
        state.error = null;
      })
      .addCase(fetchCategoryBreakdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch card performance
    builder
      .addCase(fetchCardPerformance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCardPerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.cardPerformance = action.payload.card_performance || [];
        state.error = null;
      })
      .addCase(fetchCardPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch payment patterns
    builder
      .addCase(fetchPaymentPatterns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentPatterns.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentPatterns = { ...state.paymentPatterns, ...action.payload };
        state.error = null;
      })
      .addCase(fetchPaymentPatterns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch savings trends
    builder
      .addCase(fetchSavingsTrends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavingsTrends.fulfilled, (state, action) => {
        state.loading = false;
        state.savingsTrends = { ...state.savingsTrends, ...action.payload };
        state.error = null;
      })
      .addCase(fetchSavingsTrends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch utilization trends
    builder
      .addCase(fetchUtilizationTrends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUtilizationTrends.fulfilled, (state, action) => {
        state.loading = false;
        state.utilizationTrends = { ...state.utilizationTrends, ...action.payload };
        state.error = null;
      })
      .addCase(fetchUtilizationTrends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch insights
    builder
      .addCase(fetchInsights.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.loading = false;
        state.insights = action.payload.insights || [];
        state.error = null;
      })
      .addCase(fetchInsights.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch recommendations
    builder
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendations = action.payload.recommendations || [];
        state.error = null;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch financial health score
    builder
      .addCase(fetchFinancialHealthScore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinancialHealthScore.fulfilled, (state, action) => {
        state.loading = false;
        state.financialHealthScore = { ...state.financialHealthScore, ...action.payload };
        state.error = null;
      })
      .addCase(fetchFinancialHealthScore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Generate report
    builder
      .addCase(generateReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = {
          ...state.reports,
          [action.payload.type]: [...(state.reports[action.payload.type] || []), action.payload]
        };
        state.error = null;
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Export data
    builder
      .addCase(exportData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportData.fulfilled, (state, action) => {
        state.loading = false;
        state.exportData = action.payload;
        state.error = null;
      })
      .addCase(exportData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Set financial goals
    builder
      .addCase(setFinancialGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setFinancialGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.goals = { ...state.goals, ...action.payload };
        state.error = null;
      })
      .addCase(setFinancialGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Track financial event
    builder
      .addCase(trackFinancialEvent.pending, (state) => {
        // Don't set loading for event tracking
      })
      .addCase(trackFinancialEvent.fulfilled, (state, action) => {
        // Event tracked successfully - no state change needed
        state.error = null;
      })
      .addCase(trackFinancialEvent.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Dismiss insight
    builder
      .addCase(dismissInsight.fulfilled, (state, action) => {
        state.insights = state.insights.filter(insight => insight.id !== action.payload.insightId);
        state.error = null;
      })
      .addCase(dismissInsight.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Accept recommendation
    builder
      .addCase(acceptRecommendation.fulfilled, (state, action) => {
        state.recommendations = state.recommendations.filter(
          rec => rec.id !== action.payload.recommendationId
        );
        state.error = null;
      })
      .addCase(acceptRecommendation.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Handle rehydration
    builder
      .addCase('persist/REHYDRATE', (state, action) => {
        // Rehydrate persisted analytics data
        return {
          ...state,
          overview: action.payload?.overview || initialState.overview,
          monthly: action.payload?.monthly || initialState.monthly,
          categories: action.payload?.categories || initialState.categories,
          goals: action.payload?.goals || initialState.goals,
          financialHealthScore: action.payload?.financialHealthScore || initialState.financialHealthScore,
        };
      });
  },
});

// Export actions and selectors
export const {
  clearError,
  setLoading,
  setRefreshing,
  updateOverview,
  updateCategories,
  updateGoals,
  addCustomCategory,
  removeCategory,
  addCustomInsight,
  updateExportData,
  clearExportData,
  resetAnalyticsState,
  updateFinancialHealthScore,
} = analyticsSlice.actions;

// Selectors
export const selectAnalyticsOverview = (state) => state.analytics.overview;
export const selectMonthlyAnalytics = (state) => state.analytics.monthly;
export const selectCategoryBreakdown = (state) => state.analytics.categories;
export const selectCardPerformance = (state) => state.analytics.cardPerformance;
export const selectPaymentPatterns = (state) => state.analytics.paymentPatterns;
export const selectSavingsTrends = (state) => state.analytics.savingsTrends;
export const selectUtilizationTrends = (state) => state.analytics.utilizationTrends;
export const selectInsights = (state) => state.analytics.insights;
export const selectRecommendations = (state) => state.analytics.recommendations;
export const selectFinancialHealthScore = (state) => state.analytics.financialHealthScore;
export const selectGoals = (state) => state.analytics.goals;
export const selectReports = (state) => state.analytics.reports;
export const selectExportData = (state) => state.analytics.exportData;
export const selectAnalyticsLoading = (state) => state.analytics.loading;
export const selectAnalyticsRefreshing = (state) => state.analytics.refreshing;
export const selectAnalyticsError = (state) => state.analytics.error;

// Computed selectors
export const selectTotalSavings = (state) => state.analytics.overview.total_saved;
export const selectCurrentUtilization = (state) => state.analytics.overview.current_utilization;
export const selectPaymentSuccessRate = (state) => state.analytics.overview.payment_success_rate;
export const selectTotalInterestSaved = (state) => state.analytics.overview.total_interest_saved;

// Goal progress selectors
export const selectSavingsGoalProgress = (state) => {
  const { monthly_savings_target } = state.analytics.goals;
  const currentSavings = state.analytics.overview.average_monthly_savings || 0;
  return monthly_savings_target > 0 ? (currentSavings / monthly_savings_target) * 100 : 0;
};

export const selectUtilizationGoalProgress = (state) => {
  const { utilization_target } = state.analytics.goals;
  const currentUtilization = state.analytics.overview.current_utilization || 0;
  return currentUtilization > utilization_target ? 0 : 100;
};

export const selectAutomationGoalProgress = (state) => {
  const { payment_automation_target } = state.analytics.goals;
  const currentAutomation = state.analytics.overview.cards_automated || 0;
  const totalCards = state.analytics.overview.active_cards || 1;
  const automationRate = (currentAutomation / totalCards) * 100;
  return payment_automation_target > 0 ? (automationRate / payment_automation_target) * 100 : automationRate;
};

// Health score category selectors
export const selectHealthScoreCategory = (state) => {
  const score = state.analytics.financialHealthScore.score || 0;
  if (score >= 800) return 'Excellent';
  if (score >= 700) return 'Good';
  if (score >= 600) return 'Fair';
  if (score >= 500) return 'Poor';
  return 'Very Poor';
};

export const selectHealthScoreColor = (state) => {
  const score = state.analytics.financialHealthScore.score || 0;
  if (score >= 800) return '#4CAF50'; // Green
  if (score >= 700) return '#8BC34A'; // Light Green
  if (score >= 600) return '#FFC107'; // Amber
  if (score >= 500) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

export default analyticsSlice.reducer;