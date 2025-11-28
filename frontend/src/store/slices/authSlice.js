/**
 * Auth Slice - User Authentication State Management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import services
import { ApiService } from '../../services/ApiService';
import { StorageService } from '../../services/StorageService';

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,
  kycStatus: null,
  biometricEnabled: false,
  loginAttempts: 0,
};

// Async thunks for authentication actions
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/auth/login', {
        email,
        password,
      });

      // Store tokens securely
      if (response.access_token) {
        await StorageService.storeTokens({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        });
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/auth/register', userData);

      // Store tokens if returned (auto-login)
      if (response.access_token) {
        await StorageService.storeTokens({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        });
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const storedTokens = await StorageService.getTokens();

      if (!storedTokens.refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const response = await ApiService.post('/auth/refresh', {
        refresh_token: storedTokens.refreshToken,
      });

      // Update stored tokens
      if (response.access_token) {
        await StorageService.storeTokens({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        });
      }

      return response;
    } catch (error) {
      // Clear invalid tokens
      await StorageService.clearTokens();
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const storedTokens = await StorageService.getTokens();

      if (storedTokens.accessToken) {
        await ApiService.post('/auth/logout', null, {
          headers: {
            Authorization: `Bearer ${storedTokens.accessToken}`,
          },
        });
      }

      // Clear stored data
      await StorageService.clearTokens();
      await StorageService.clearUserData();

      return { success: true };
    } catch (error) {
      // Even if logout API fails, clear local data
      await StorageService.clearTokens();
      await StorageService.clearUserData();
      return { success: true };
    }
  }
);

export const verifyKyc = createAsyncThunk(
  'auth/verifyKyc',
  async ({ aadhaarNumber, otp }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/auth/kyc/verify', {
        aadhaar_number: aadhaarNumber,
        otp: otp,
      });

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'KYC verification failed');
    }
  }
);

export const setupBiometric = createAsyncThunk(
  'auth/setupBiometric',
  async (biometricData, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/auth/biometric/setup', biometricData);

      // Store biometric setup data
      await StorageService.storeBiometricData({
        enabled: true,
        deviceId: biometricData.device_id,
        biometricType: biometricData.biometric_type,
      });

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Biometric setup failed');
    }
  }
);

export const verifyBiometric = createAsyncThunk(
  'auth/verifyBiometric',
  async (biometricData, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/auth/biometric/verify', biometricData);

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Biometric verification failed');
    }
  }
);

// Create slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Load user from storage
    loadUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },

    // Update token
    updateToken: (state, action) => {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Update KYC status
    updateKycStatus: (state, action) => {
      if (state.user) {
        state.user.kyc_verified = action.payload.verified;
        state.user.kyc_aadhaar_last4 = action.payload.last4;
        state.user.kyc_verified_at = action.payload.verifiedAt;
      }
    },

    // Reset login attempts
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
    },

    // Increment login attempts
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1;
    },

    // Update biometric status
    updateBiometricStatus: (state, action) => {
      state.biometricEnabled = action.payload.enabled;
    },

    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.loginAttempts = 0;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.loginAttempts += 1;
      })

      // Register user
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.access_token) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.access_token;
          state.refreshToken = action.payload.refresh_token;
        }
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Refresh token
      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Clear auth state on refresh failure
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })

      // Logout user
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.kycStatus = null;
        state.biometricEnabled = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even on API error, clear local state
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.kycStatus = null;
        state.biometricEnabled = false;
      })

      // Verify KYC
      .addCase(verifyKyc.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyKyc.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user.kyc_verified = true;
          state.user.kyc_aadhaar_last4 = action.payload.verified
            ? action.payload.user?.kyc_aadhaar_last4
            : state.user.kyc_aadhaar_last4;
          state.user.kyc_verified_at = action.payload.verifiedAt;
        }
        state.kycStatus = 'verified';
        state.error = null;
      })
      .addCase(verifyKyc.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.kycStatus = 'failed';
      })

      // Setup biometric
      .addCase(setupBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setupBiometric.fulfilled, (state, action) => {
        state.isLoading = false;
        state.biometricEnabled = true;
        state.error = null;
      })
      .addCase(setupBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.biometricEnabled = false;
      })

      // Verify biometric
      .addCase(verifyBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyBiometric.fulfilled, (state, action) => {
        state.isLoading = false;
        // Biometric verification success - user is authenticated
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(verifyBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // Handle rehydrate
      .addCase('persist/REHYDRATE', (state, action) => {
        const authData = action.payload?.auth;
        if (authData) {
          return { ...state, ...authData };
        }
        return state;
      });
  },
});

// Export actions
export const {
  loadUser,
  updateToken,
  clearError,
  updateKycStatus,
  resetLoginAttempts,
  incrementLoginAttempts,
  updateBiometricStatus,
  setLoading,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectToken = (state) => state.auth.token;
export const selectAuthError = (state) => state.auth.error;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectKycStatus = (state) => state.auth.user?.kyc_verified;
export const selectBiometricEnabled = (state) => state.auth.biometricEnabled;

// Export reducer
export default authSlice.reducer;