/**
 * Redux Store Configuration
 * Redux Toolkit setup for Lurk App
 */

import {configureStore} from '@reduxjs/toolkit';
import {persistStore, persistReducer} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {combineReducers} from '@reduxjs/toolkit';

// Import reducers
import authReducer from '../reducers/authReducer';
import cardsReducer from '../reducers/cardsReducer';
import analyticsReducer from '../reducers/analyticsReducer';
import settingsReducer from '../reducers/settingsReducer';

// Persistence configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings'], // only persist auth and settings
  blacklist: ['analytics'], // don't persist analytics
};

// Root reducer
const rootReducer = combineReducers({
  auth: authReducer,
  cards: cardsReducer,
  analytics: analyticsReducer,
  settings: settingsReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__,
});

const persistor = persistStore(store);

export {store, persistor};