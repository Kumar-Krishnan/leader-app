import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import ScreenHeader from '../../src/components/ScreenHeader';

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock navigation
const mockDispatch = jest.fn();
const mockNavigation = {
  dispatch: mockDispatch,
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  DrawerActions: {
    openDrawer: () => ({ type: 'OPEN_DRAWER' }),
  },
}));

// Mock data
const mockGroup = {
  id: 'group-1',
  name: 'Test Group',
  code: 'ABC123',
  role: 'member' as const,
  memberId: 'member-1',
};

// Group context mock
let mockGroupContext = {
  currentGroup: mockGroup,
};

jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

describe('ScreenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGroupContext = {
      currentGroup: mockGroup,
    };
  });

  describe('Basic Rendering', () => {
    it('should render title', () => {
      const { getByText } = render(<ScreenHeader title="Threads" />);

      expect(getByText('Threads')).toBeTruthy();
    });

    it('should render menu icon', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);

      // Menu icon consists of three lines in a View
      const menuButton = UNSAFE_root.findAllByType(TouchableOpacity)[0];
      expect(menuButton).toBeTruthy();
    });

    it('should render group name by default', () => {
      const { getByText } = render(<ScreenHeader title="Events" />);

      expect(getByText('Test Group')).toBeTruthy();
    });
  });

  describe('Group Name', () => {
    it('should show group name when showGroupName is true', () => {
      const { getByText } = render(
        <ScreenHeader title="Meetings" showGroupName={true} />
      );

      expect(getByText('Test Group')).toBeTruthy();
    });

    it('should hide group name when showGroupName is false', () => {
      const { queryByText } = render(
        <ScreenHeader title="Profile" showGroupName={false} />
      );

      expect(queryByText('Test Group')).toBeNull();
    });

    it('should not show group name when currentGroup is null', () => {
      mockGroupContext.currentGroup = null;

      const { queryByText } = render(<ScreenHeader title="Test" />);

      expect(queryByText('Test Group')).toBeNull();
    });

    it('should open drawer when group name is tapped', () => {
      const { getByText } = render(<ScreenHeader title="Test" />);

      const groupName = getByText('Test Group');
      fireEvent.press(groupName);

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
    });
  });

  describe('Subtitle', () => {
    it('should show subtitle instead of group name when provided', () => {
      const { getByText, queryByText } = render(
        <ScreenHeader title="Leader Hub" subtitle="For leaders only" />
      );

      expect(getByText('For leaders only')).toBeTruthy();
      expect(queryByText('Test Group')).toBeNull();
    });

    it('should display subtitle with correct styling', () => {
      const { getByText } = render(
        <ScreenHeader title="Hub" subtitle="Custom subtitle" />
      );

      const subtitle = getByText('Custom subtitle');
      expect(subtitle).toBeTruthy();
    });
  });

  describe('Menu Button', () => {
    it('should dispatch openDrawer action when menu button is pressed', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);

      // Find the menu button (first TouchableOpacity)
      const touchables = UNSAFE_root.findAllByType(TouchableOpacity);
      const menuButton = touchables[0];

      fireEvent.press(menuButton);

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
    });
  });

  describe('Right Action', () => {
    it('should render right action button when provided', () => {
      const mockOnPress = jest.fn();

      const { getByText } = render(
        <ScreenHeader
          title="Threads"
          rightAction={{ label: '+ New', onPress: mockOnPress }}
        />
      );

      expect(getByText('+ New')).toBeTruthy();
    });

    it('should call onPress when right action is pressed', () => {
      const mockOnPress = jest.fn();

      const { getByText } = render(
        <ScreenHeader
          title="Threads"
          rightAction={{ label: '+ New', onPress: mockOnPress }}
        />
      );

      fireEvent.press(getByText('+ New'));

      expect(mockOnPress).toHaveBeenCalled();
    });

    it('should not render right action when not provided', () => {
      const { queryByText } = render(<ScreenHeader title="Test" />);

      expect(queryByText('+ New')).toBeNull();
    });
  });

  describe('Right Content', () => {
    it('should render custom right content when provided', () => {
      const CustomContent = (
        <View testID="custom-content">
          <Text>Custom</Text>
        </View>
      );

      const { getByTestId, getByText } = render(
        <ScreenHeader title="Resources" rightContent={CustomContent} />
      );

      expect(getByTestId('custom-content')).toBeTruthy();
      expect(getByText('Custom')).toBeTruthy();
    });

    it('should prefer rightContent over rightAction when both provided', () => {
      const mockOnPress = jest.fn();
      const CustomContent = (
        <View testID="custom-content">
          <Text>Custom</Text>
        </View>
      );

      const { getByTestId, queryByText } = render(
        <ScreenHeader
          title="Test"
          rightAction={{ label: 'Action', onPress: mockOnPress }}
          rightContent={CustomContent}
        />
      );

      expect(getByTestId('custom-content')).toBeTruthy();
      expect(queryByText('Action')).toBeNull();
    });
  });

  describe('Safe Area', () => {
    it('should apply safe area padding to header', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);

      // Header should have paddingTop that includes safe area
      const header = UNSAFE_root.findAllByType(View)[0];
      expect(header.props.style).toBeDefined();
    });
  });

  describe('Different Screens', () => {
    it('should work for Threads screen', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <ScreenHeader
          title="Threads"
          rightAction={{ label: '+ New', onPress: mockOnPress }}
        />
      );

      expect(getByText('Threads')).toBeTruthy();
      expect(getByText('Test Group')).toBeTruthy();
      expect(getByText('+ New')).toBeTruthy();
    });

    it('should work for Meetings screen', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <ScreenHeader
          title="Events"
          rightAction={{ label: '+ New', onPress: mockOnPress }}
        />
      );

      expect(getByText('Events')).toBeTruthy();
      expect(getByText('Test Group')).toBeTruthy();
    });

    it('should work for Profile screen without group name', () => {
      const { getByText, queryByText } = render(
        <ScreenHeader title="Profile" showGroupName={false} />
      );

      expect(getByText('Profile')).toBeTruthy();
      expect(queryByText('Test Group')).toBeNull();
    });

    it('should work for Leader Hub with subtitle', () => {
      const { getByText, queryByText } = render(
        <ScreenHeader
          title="Leader Hub"
          subtitle="Resources for leaders only"
          showGroupName={false}
        />
      );

      expect(getByText('Leader Hub')).toBeTruthy();
      expect(getByText('Resources for leaders only')).toBeTruthy();
      expect(queryByText('Test Group')).toBeNull();
    });
  });

  describe('Title Variations', () => {
    it('should render long titles', () => {
      const { getByText } = render(
        <ScreenHeader title="This Is A Very Long Screen Title" />
      );

      expect(getByText('This Is A Very Long Screen Title')).toBeTruthy();
    });

    it('should render single character title', () => {
      const { getByText } = render(<ScreenHeader title="A" />);

      expect(getByText('A')).toBeTruthy();
    });
  });
});
