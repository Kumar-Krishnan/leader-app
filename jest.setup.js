// Jest setup file
// Note: @testing-library/react-native v12.4+ includes built-in matchers

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => {});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  getForegroundPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() => 
    Promise.resolve({
      coords: {
        latitude: 33.7489,
        longitude: -84.388,
        accuracy: 3000,
      },
    })
  ),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
  },
}));

// Mock location analytics service (silent in tests)
jest.mock('./src/services/locationAnalytics', () => ({
  recordLogin: jest.fn(),
  recordSignup: jest.fn(),
  recordAppOpen: jest.fn(),
  recordLocationEvent: jest.fn(),
  hasLocationPermission: jest.fn(() => Promise.resolve(true)),
}));

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('Warning:')) return;
  originalWarn(...args);
};

// Mock window.crypto for UUID generation
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  };
}

// Extend react-native Platform mock
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const Platform = jest.requireActual('react-native/Libraries/Utilities/Platform');
  Platform.OS = 'ios';
  Platform.Version = 14;
  Platform.select = jest.fn((obj) => obj.ios || obj.native || obj.default);
  return Platform;
});

