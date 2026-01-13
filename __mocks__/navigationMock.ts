// React Navigation mocks for testing

export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockSetOptions = jest.fn();
export const mockReset = jest.fn();

export const mockNavigation = {
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
};

export const mockRoute = {
  key: 'test-key',
  name: 'TestScreen',
  params: {},
};

// Mock useNavigation hook
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
    useIsFocused: jest.fn(() => true),
  };
});

// Reset all mocks between tests
export const resetNavigationMocks = () => {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockSetOptions.mockClear();
  mockReset.mockClear();
};

