// Test utilities and wrapper components
import React, { ReactNode } from 'react';
import { NavigationContainer } from '@react-navigation/native';

// Wrapper that provides navigation context
export const NavigationWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NavigationContainer>
      {children}
    </NavigationContainer>
  );
};

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to flush promises
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock group data
export const mockGroup = {
  id: 'test-group-id',
  name: 'Test Group',
  description: 'A test group',
  code: 'ABC123',
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockGroupMember = {
  id: 'test-member-id',
  group_id: 'test-group-id',
  user_id: 'test-user-id',
  role: 'admin' as const,
  joined_at: '2024-01-01T00:00:00Z',
};

export const mockGroupWithMembership = {
  ...mockGroup,
  role: 'admin' as const,
  memberId: 'test-member-id',
};

// Mock meeting data
export const mockMeeting = {
  id: 'test-meeting-id',
  title: 'Test Meeting',
  description: 'A test meeting',
  date: '2024-02-01T19:00:00Z',
  location: 'Test Location',
  passages: [],
  group_id: 'test-group-id',
  thread_id: null,
  attachments: [],
  created_by: 'test-user-id',
  series_id: null,
  series_index: null,
  series_total: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock thread data
export const mockThread = {
  id: 'test-thread-id',
  name: 'Test Thread',
  group_id: 'test-group-id',
  created_by: 'test-user-id',
  is_archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock message data
export const mockMessage = {
  id: 'test-message-id',
  thread_id: 'test-thread-id',
  sender_id: 'test-user-id',
  content: 'Test message content',
  attachments: [],
  created_at: '2024-01-01T00:00:00Z',
};

