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

// Silence benign act() warnings from async state updates
// These warnings are informational and don't affect test correctness
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('not wrapped in act(')) return;
  originalError(...args);
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

// Mock react-native-safe-area-context globally
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

// Mock @react-navigation/native globally
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      reset: mockReset,
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(() => ({ routes: [] })),
    }),
    useRoute: () => ({
      key: 'test-key',
      name: 'TestScreen',
      params: {},
    }),
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
    useIsFocused: jest.fn(() => true),
  };
});

// Export navigation mocks for test access
global.__navigationMocks__ = {
  mockNavigate,
  mockGoBack,
  mockSetOptions,
  mockReset,
};

