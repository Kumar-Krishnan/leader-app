import React from 'react';
import { render } from '@testing-library/react-native';

// Mock Drawer Navigator - must be before imports that use it
const mockDrawerNavigator = jest.fn();
const mockDrawerScreen = jest.fn();

jest.mock('@react-navigation/drawer', () => {
  const { View } = require('react-native');
  return {
    createDrawerNavigator: () => ({
      Navigator: (props: any) => {
        mockDrawerNavigator(props);
        return <View testID="drawer-navigator">{props.children}</View>;
      },
      Screen: (props: any) => {
        mockDrawerScreen(props);
        return <View testID={`screen-${props.name}`} />;
      },
    }),
  };
});

// Mock MainNavigator
jest.mock('../../src/navigation/MainNavigator', () => {
  const { View, Text } = require('react-native');
  return function MockMainNavigator() {
    return (
      <View testID="main-navigator">
        <Text>Main Navigator</Text>
      </View>
    );
  };
});

// Mock GroupSidebar
jest.mock('../../src/components/GroupSidebar', () => {
  const { View, Text } = require('react-native');
  return function MockGroupSidebar(props: any) {
    return (
      <View testID="group-sidebar">
        <Text>Group Sidebar</Text>
      </View>
    );
  };
});

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock contexts
jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => ({
    groups: [],
    currentGroup: null,
    setCurrentGroup: jest.fn(),
    createGroup: jest.fn(),
    requestToJoin: jest.fn(),
    myPendingRequests: [],
  }),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    profile: { full_name: 'Test User' },
    isLeader: false,
  }),
}));

// Import after mocks
import DrawerNavigator from '../../src/navigation/DrawerNavigator';

describe('DrawerNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render drawer navigator', () => {
    const { getByTestId } = render(<DrawerNavigator />);

    expect(getByTestId('drawer-navigator')).toBeTruthy();
  });

  describe('Screen Configuration', () => {
    it('should register MainTabs screen', () => {
      render(<DrawerNavigator />);

      expect(mockDrawerScreen).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'MainTabs',
        })
      );
    });

    it('should hide header for screens', () => {
      render(<DrawerNavigator />);

      expect(mockDrawerNavigator).toHaveBeenCalledWith(
        expect.objectContaining({
          screenOptions: expect.objectContaining({
            headerShown: false,
          }),
        })
      );
    });
  });

  describe('Drawer Styling', () => {
    it('should set drawer background color', () => {
      render(<DrawerNavigator />);

      expect(mockDrawerNavigator).toHaveBeenCalledWith(
        expect.objectContaining({
          screenOptions: expect.objectContaining({
            drawerStyle: expect.objectContaining({
              backgroundColor: '#2D2D2D',
            }),
          }),
        })
      );
    });

    it('should set overlay color', () => {
      render(<DrawerNavigator />);

      expect(mockDrawerNavigator).toHaveBeenCalledWith(
        expect.objectContaining({
          screenOptions: expect.objectContaining({
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          }),
        })
      );
    });

    it('should set swipe edge width', () => {
      render(<DrawerNavigator />);

      expect(mockDrawerNavigator).toHaveBeenCalledWith(
        expect.objectContaining({
          screenOptions: expect.objectContaining({
            swipeEdgeWidth: 50,
          }),
        })
      );
    });
  });

  describe('Custom Drawer Content', () => {
    it('should provide drawerContent function', () => {
      render(<DrawerNavigator />);

      expect(mockDrawerNavigator).toHaveBeenCalledWith(
        expect.objectContaining({
          drawerContent: expect.any(Function),
        })
      );
    });

    it('should render GroupSidebar as drawer content', () => {
      render(<DrawerNavigator />);

      const drawerProps = mockDrawerNavigator.mock.calls[0][0];
      const drawerContent = drawerProps.drawerContent;

      // Verify it's a function that renders GroupSidebar
      expect(typeof drawerContent).toBe('function');

      // Call the function and verify it renders GroupSidebar
      const mockNavigation = { closeDrawer: jest.fn() };
      const { getByTestId } = render(drawerContent({ navigation: mockNavigation }));
      expect(getByTestId('group-sidebar')).toBeTruthy();
    });
  });

  describe('Drawer Type', () => {
    it('should configure drawer type based on screen size', () => {
      render(<DrawerNavigator />);

      // The drawer type should be configured (either 'front' or 'permanent')
      const drawerProps = mockDrawerNavigator.mock.calls[0][0];
      expect(['front', 'permanent']).toContain(drawerProps.screenOptions.drawerType);
    });

    it('should configure drawer width', () => {
      render(<DrawerNavigator />);

      const drawerProps = mockDrawerNavigator.mock.calls[0][0];
      const width = drawerProps.screenOptions.drawerStyle.width;

      // Width should be either 280 (permanent) or 300 (front)
      expect([280, 300]).toContain(width);
    });
  });
});
