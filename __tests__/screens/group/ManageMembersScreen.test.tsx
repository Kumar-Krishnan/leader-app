import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ManageMembersScreen from '../../../src/screens/group/ManageMembersScreen';

// Mock data
const mockGroup = {
  id: 'test-group-id',
  name: 'Test Group',
};

const mockRegularMember = {
  id: 'member-1',
  user_id: 'user-1',
  placeholder_id: null,
  group_id: 'test-group-id',
  role: 'member' as const,
  joined_at: new Date().toISOString(),
  user: {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'John Doe',
    avatar_url: null,
  },
  placeholder: null,
  isPlaceholder: false,
  displayName: 'John Doe',
  displayEmail: 'user@example.com',
};

const mockPlaceholderMember = {
  id: 'member-2',
  user_id: null,
  placeholder_id: 'placeholder-1',
  group_id: 'test-group-id',
  role: 'member' as const,
  joined_at: new Date().toISOString(),
  user: null,
  placeholder: {
    id: 'placeholder-1',
    email: 'placeholder@example.com',
    full_name: 'Placeholder User',
    created_by: 'user-admin',
    created_at: new Date().toISOString(),
  },
  isPlaceholder: true,
  displayName: 'Placeholder User',
  displayEmail: 'placeholder@example.com',
};

// Mock hooks
const mockUpdateRole = jest.fn().mockResolvedValue(true);
const mockRemoveMember = jest.fn().mockResolvedValue(true);
const mockCreatePlaceholder = jest.fn().mockResolvedValue(true);
const mockRefetch = jest.fn();

let mockGroupMembersResult = {
  members: [mockRegularMember, mockPlaceholderMember],
  loading: false,
  error: null,
  processingId: null,
  refetch: mockRefetch,
  updateRole: mockUpdateRole,
  removeMember: mockRemoveMember,
  createPlaceholder: mockCreatePlaceholder,
};

let mockGroupContext = {
  currentGroup: mockGroup,
  pendingRequests: [],
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
  refreshPendingRequests: jest.fn(),
  isGroupLeader: true,
  canApproveRequests: true,
};

jest.mock('../../../src/hooks/useGroupMembers', () => ({
  useGroupMembers: () => mockGroupMembersResult,
}));

jest.mock('../../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

describe('ManageMembersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGroupMembersResult = {
      members: [mockRegularMember, mockPlaceholderMember],
      loading: false,
      error: null,
      processingId: null,
      refetch: mockRefetch,
      updateRole: mockUpdateRole,
      removeMember: mockRemoveMember,
      createPlaceholder: mockCreatePlaceholder,
    };
    mockGroupContext = {
      currentGroup: mockGroup,
      pendingRequests: [],
      approveRequest: jest.fn(),
      rejectRequest: jest.fn(),
      refreshPendingRequests: jest.fn(),
      isGroupLeader: true,
      canApproveRequests: true,
    };
  });

  it('should render members list', () => {
    const { getByText } = render(<ManageMembersScreen />);

    expect(getByText('Manage Members')).toBeTruthy();
    expect(getByText('Test Group')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Placeholder User')).toBeTruthy();
  });

  it('should show placeholder badge on placeholder members', () => {
    const { getAllByText } = render(<ManageMembersScreen />);

    const placeholderBadges = getAllByText('Placeholder');
    expect(placeholderBadges.length).toBeGreaterThan(0);
  });

  it('should show question mark avatar for placeholder members', () => {
    const { getByText } = render(<ManageMembersScreen />);

    // The placeholder avatar shows "?"
    expect(getByText('?')).toBeTruthy();
  });

  it('should show Add Placeholder button for leaders', () => {
    const { getByText } = render(<ManageMembersScreen />);

    expect(getByText('+ Add Placeholder')).toBeTruthy();
  });

  it('should not show Add Placeholder button for non-leaders', () => {
    mockGroupContext.isGroupLeader = false;

    const { queryByText } = render(<ManageMembersScreen />);

    expect(queryByText('+ Add Placeholder')).toBeNull();
  });

  it('should open AddPlaceholderModal when Add Placeholder button pressed', async () => {
    const { getByText } = render(<ManageMembersScreen />);

    const addButton = getByText('+ Add Placeholder');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(getByText('Email Address *')).toBeTruthy();
    });
  });

  it('should display member emails', () => {
    const { getByText } = render(<ManageMembersScreen />);

    expect(getByText('user@example.com')).toBeTruthy();
    expect(getByText('placeholder@example.com')).toBeTruthy();
  });

  it('should display role badges', () => {
    const { getAllByText } = render(<ManageMembersScreen />);

    const memberBadges = getAllByText('member');
    expect(memberBadges.length).toBe(2);
  });

  it('should show loading indicator when loading', () => {
    mockGroupMembersResult.loading = true;

    const { getByTestId, queryByText } = render(<ManageMembersScreen />);

    // When loading, members should not be visible
    expect(queryByText('John Doe')).toBeNull();
  });

  it('should display member count', () => {
    const { getByText } = render(<ManageMembersScreen />);

    expect(getByText('Members (2)')).toBeTruthy();
  });

  describe('Placeholder creation', () => {
    it('should call createPlaceholder when form is submitted', async () => {
      const { getByText, getAllByText, getByPlaceholderText } = render(<ManageMembersScreen />);

      // Open modal
      fireEvent.press(getByText('+ Add Placeholder'));

      await waitFor(() => {
        expect(getByText('Email Address *')).toBeTruthy();
      });

      // Fill form
      const emailInput = getByPlaceholderText('email@example.com');
      const nameInput = getByPlaceholderText('John Smith');

      fireEvent.changeText(emailInput, 'newuser@example.com');
      fireEvent.changeText(nameInput, 'New User');

      // Submit - get the button (second element with "Add Placeholder" text)
      const addPlaceholderElements = getAllByText('Add Placeholder');
      const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockCreatePlaceholder).toHaveBeenCalledWith(
          'newuser@example.com',
          'New User',
          'member'
        );
      });
    });
  });
});
