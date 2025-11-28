/**
 * Redux Store Configuration for Lurk App
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { combineReducers } from '@reduxjs/toolkit';

// Import reducers
import authReducer from './slices/authSlice';
import cardsReducer from './slices/cardsSlice';
import paymentsReducer from './slices/paymentsSlice';
import premiumReducer from './slices/premiumSlice';
import uiReducer from './slices/uiSlice';

// Persist configuration
const persistConfig = {
  key: 'lurk-root',
  storage: require('@react-native-async-storage/async-storage'),
  whitelist: ['auth', 'cards', 'payments', 'premium'], // Only persist these slices
  blacklist: ['ui'], // Don't persist UI state
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  cards: cardsReducer,
  payments: paymentsReducer,
  premium: premiumReducer,
  ui: uiReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
      immutableCheck: false, // Disabled for performance
    }),
  devTools: __DEV__,
});

// Create persistor
const persistor = persistStore(store, null, {
  // Actions to be persisted
  persist: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE', 'persist/REGISTER'],
  // Actions to be ignored by persister
  blacklist: ['persist/FLUSH', 'persist/PAUSE', 'persist/PERSIST'],
});

// Export store and persistor
export { store, persistor };

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;