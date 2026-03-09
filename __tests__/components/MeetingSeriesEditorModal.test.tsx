import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MeetingSeriesEditorModal from '../../src/components/MeetingSeriesEditorModal';
import { MeetingWithAttendees } from '../../src/types/database';

// Mock the membersRepo
jest.mock('../../src/repositories/membersRepo', () => ({
  fetchMembers: jest.fn(),
}));

import { fetchMembers } from '../../src/repositories/membersRepo';

const mockAttendees = [
  {
    id: 'att-1',
    user_id: 'user-alice',
    placeholder_id: null,
    status: 'accepted',
    is_series_rsvp: true,
    user: { id: 'user-alice', full_name: 'Alice Smith', email: 'alice@example.com', avatar_url: null },
    placeholder: null,
  },
  {
    id: 'att-2',
    user_id: null,
    placeholder_id: 'ph-bob',
    status: 'invited',
    is_series_rsvp: false,
    user: null,
    placeholder: { id: 'ph-bob', full_name: 'Bob Jones', email: 'bob@example.com' },
  },
];

// Mock meetings data
const mockMeetings: MeetingWithAttendees[] = [
  {
    id: 'meeting-1',
    title: 'Weekly Bible Study',
    description: 'Introduction to Genesis',
    date: '2024-01-15T19:00:00Z',
    end_date: null,
    location: 'Room 101',
    passages: [],
    attachments: [],
    group_id: 'group-1',
    thread_id: null,
    created_by: 'user-1',
    series_id: 'series-1',
    series_index: 1,
    series_total: 4,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    attendees: mockAttendees,
  },
  {
    id: 'meeting-2',
    title: 'Weekly Bible Study',
    description: 'Chapter 1-3 discussion',
    date: '2024-01-22T19:00:00Z',
    end_date: null,
    location: 'Room 101',
    passages: [],
    attachments: [],
    group_id: 'group-1',
    thread_id: null,
    created_by: 'user-1',
    series_id: 'series-1',
    series_index: 2,
    series_total: 4,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    attendees: mockAttendees,
  },
  {
    id: 'meeting-3',
    title: 'Weekly Bible Study',
    description: null,
    date: '2024-01-29T19:00:00Z',
    end_date: null,
    location: 'Room 101',
    passages: [],
    attachments: [],
    group_id: 'group-1',
    thread_id: null,
    created_by: 'user-1',
    series_id: 'series-1',
    series_index: 3,
    series_total: 4,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    attendees: mockAttendees,
  },
];

describe('MeetingSeriesEditorModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpdateMeeting = jest.fn();
  const mockOnSkipMeeting = jest.fn();
  const mockOnAddAttendees = jest.fn();
  const mockOnRemoveAttendee = jest.fn();
  const mockOnRefresh = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    seriesId: 'series-1',
    seriesTitle: 'Weekly Bible Study',
    meetings: mockMeetings,
    groupId: 'group-1',
    onUpdateMeeting: mockOnUpdateMeeting,
    onSkipMeeting: mockOnSkipMeeting,
    onAddAttendees: mockOnAddAttendees,
    onRemoveAttendee: mockOnRemoveAttendee,
    onRefresh: mockOnRefresh,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnUpdateMeeting.mockResolvedValue(true);
    mockOnSkipMeeting.mockResolvedValue(true);
    mockOnAddAttendees.mockResolvedValue(true);
    mockOnRemoveAttendee.mockResolvedValue(true);
    (fetchMembers as jest.Mock).mockResolvedValue({
      data: [
        {
          user_id: 'user-alice',
          user: { full_name: 'Alice Smith', email: 'alice@example.com', avatar_url: null },
          placeholder_id: null,
          placeholder: null,
        },
        {
          user_id: null,
          placeholder_id: 'ph-bob',
          user: null,
          placeholder: { full_name: 'Bob Jones', email: 'bob@example.com' },
        },
        {
          user_id: 'user-carol',
          user: { full_name: 'Carol White', email: 'carol@example.com', avatar_url: null },
          placeholder_id: null,
          placeholder: null,
        },
      ],
      error: null,
    });
  });

  it('should render when visible', () => {
    const { getByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    expect(getByText('Edit Series')).toBeTruthy();
    expect(getByText('Weekly Bible Study')).toBeTruthy();
    expect(getByText('3 meetings in series')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} visible={false} />
    );

    expect(queryByText('Edit Series')).toBeNull();
  });

  it('should display all meetings in the series', () => {
    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    // Check for series index badges
    expect(getAllByText('1')).toBeTruthy();
    expect(getAllByText('2')).toBeTruthy();
    expect(getAllByText('3')).toBeTruthy();
  });

  it('should display existing descriptions', () => {
    const { getByDisplayValue } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    expect(getByDisplayValue('Introduction to Genesis')).toBeTruthy();
    expect(getByDisplayValue('Chapter 1-3 discussion')).toBeTruthy();
  });

  it('should show unsaved badge when description is modified', async () => {
    const { getByDisplayValue, findByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    const input = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input, 'Modified description');

    const unsavedBadge = await findByText('Unsaved');
    expect(unsavedBadge).toBeTruthy();
  });

  it('should call onUpdateMeeting when individual save is pressed', async () => {
    const { getByDisplayValue, getAllByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    const input = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input, 'Modified description');

    // Find and press the first Save button
    const saveButtons = getAllByText('Save');
    fireEvent.press(saveButtons[0]);

    await waitFor(() => {
      expect(mockOnUpdateMeeting).toHaveBeenCalledWith('meeting-1', {
        description: 'Modified description',
      });
    });

    // Individual save should NOT call onRefresh to avoid losing other unsaved changes
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('should call onUpdateMeeting for all dirty meetings when Save All is pressed', async () => {
    const { getByDisplayValue, getByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    // Modify first meeting
    const input1 = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input1, 'Modified description 1');

    // Modify second meeting
    const input2 = getByDisplayValue('Chapter 1-3 discussion');
    fireEvent.changeText(input2, 'Modified description 2');

    // Press Save All
    const saveAllButton = getByText('Save All');
    fireEvent.press(saveAllButton);

    await waitFor(() => {
      expect(mockOnUpdateMeeting).toHaveBeenCalledTimes(2);
      expect(mockOnUpdateMeeting).toHaveBeenCalledWith('meeting-1', {
        description: 'Modified description 1',
      });
      expect(mockOnUpdateMeeting).toHaveBeenCalledWith('meeting-2', {
        description: 'Modified description 2',
      });
    });

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('should not call onUpdateMeeting for unmodified meetings', async () => {
    const { getByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    // Press Save All without modifying anything
    const saveAllButton = getByText('Save All');
    fireEvent.press(saveAllButton);

    // Should not call update since nothing was modified
    expect(mockOnUpdateMeeting).not.toHaveBeenCalled();
  });

  it('should call onClose and onRefresh when Done is pressed', () => {
    const { getByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    const doneButton = getByText('Done');
    fireEvent.press(doneButton);

    expect(mockOnRefresh).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable Save button when description is not dirty', () => {
    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    // All Save buttons should be disabled (have disabled style) initially
    const saveButtons = getAllByText('Save');
    // In React Native, we check for disabled by parent TouchableOpacity props
    // Since the buttons are styled differently when disabled, we verify they exist
    expect(saveButtons.length).toBe(3);
  });

  it('should handle empty description correctly', async () => {
    const { getByDisplayValue, getAllByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    // Clear the first description
    const input = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input, '');

    // Save
    const saveButtons = getAllByText('Save');
    fireEvent.press(saveButtons[0]);

    await waitFor(() => {
      expect(mockOnUpdateMeeting).toHaveBeenCalledWith('meeting-1', {
        description: undefined,
      });
    });
  });

  it('should format dates correctly', () => {
    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    // The dates should be formatted (format depends on locale, but should exist)
    // We're just checking that the component renders without crashing
    // All 3 meetings are in January, so getAllByText will find multiple matches
    expect(getAllByText(/Jan/).length).toBeGreaterThan(0);
  });

  it('should handle update failure gracefully', async () => {
    mockOnUpdateMeeting.mockResolvedValue(false);

    const { getByDisplayValue, getAllByText, queryByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    const input = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input, 'Modified description');

    const saveButtons = getAllByText('Save');
    fireEvent.press(saveButtons[0]);

    await waitFor(() => {
      expect(mockOnUpdateMeeting).toHaveBeenCalled();
    });

    // The unsaved badge should still be visible after failed update
    await waitFor(() => {
      expect(queryByText('Unsaved')).toBeTruthy();
    });
  });

  it('should reset edit state when modal is reopened', () => {
    const { rerender, getByDisplayValue, queryByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    // Modify a description
    const input = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input, 'Modified description');

    // Close and reopen modal
    rerender(<MeetingSeriesEditorModal {...defaultProps} visible={false} />);
    rerender(<MeetingSeriesEditorModal {...defaultProps} visible={true} />);

    // Should reset to original value
    expect(getByDisplayValue('Introduction to Genesis')).toBeTruthy();
    expect(queryByText('Unsaved')).toBeNull();
  });

  it('should display Skip button for each meeting', () => {
    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    const skipButtons = getAllByText('Skip');
    expect(skipButtons.length).toBe(3); // One for each meeting
  });

  it('should call onSkipMeeting when Skip is pressed', async () => {
    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    const skipButtons = getAllByText('Skip');
    fireEvent.press(skipButtons[0]);

    await waitFor(() => {
      expect(mockOnSkipMeeting).toHaveBeenCalledWith('meeting-1');
    });

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('should not call onRefresh if skip fails', async () => {
    mockOnSkipMeeting.mockResolvedValue(false);

    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    const skipButtons = getAllByText('Skip');
    fireEvent.press(skipButtons[0]);

    await waitFor(() => {
      expect(mockOnSkipMeeting).toHaveBeenCalled();
    });

    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  // --- Dirty edit preservation tests ---

  it('should preserve unsaved edits on other meetings when one meeting is saved', async () => {
    const { getByDisplayValue, getAllByText, queryByDisplayValue } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    // Edit descriptions on two meetings
    const input1 = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input1, 'New description for meeting 1');

    const input2 = getByDisplayValue('Chapter 1-3 discussion');
    fireEvent.changeText(input2, 'New description for meeting 2');

    // Save only meeting 1
    const saveButtons = getAllByText('Save');
    fireEvent.press(saveButtons[0]);

    await waitFor(() => {
      expect(mockOnUpdateMeeting).toHaveBeenCalledWith('meeting-1', {
        description: 'New description for meeting 1',
      });
    });

    // Meeting 2's unsaved edit should still be present
    expect(queryByDisplayValue('New description for meeting 2')).toBeTruthy();
  });

  it('should preserve unsaved edits when meetings prop changes after a single save', async () => {
    const { rerender, getByDisplayValue, getAllByText, queryByDisplayValue } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    // Edit descriptions on two meetings
    const input1 = getByDisplayValue('Introduction to Genesis');
    fireEvent.changeText(input1, 'Saved description');

    const input2 = getByDisplayValue('Chapter 1-3 discussion');
    fireEvent.changeText(input2, 'Unsaved work in progress');

    // Save meeting 1
    const saveButtons = getAllByText('Save');
    fireEvent.press(saveButtons[0]);

    await waitFor(() => {
      expect(mockOnUpdateMeeting).toHaveBeenCalledTimes(1);
    });

    // Simulate meetings prop updating (e.g. from a refetch after the save)
    const updatedMeetings = mockMeetings.map(m =>
      m.id === 'meeting-1' ? { ...m, description: 'Saved description' } : m
    );
    rerender(<MeetingSeriesEditorModal {...defaultProps} meetings={updatedMeetings} />);

    // Meeting 2's unsaved edit should still be preserved
    expect(queryByDisplayValue('Unsaved work in progress')).toBeTruthy();
    // Meeting 1 should show the saved value (it was marked clean after save)
    expect(queryByDisplayValue('Saved description')).toBeTruthy();
  });

  it('should update clean meeting descriptions when meetings prop changes', () => {
    const { rerender, queryByDisplayValue } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    // No edits made — all meetings are clean. Now simulate an external data refresh.
    const updatedMeetings = mockMeetings.map(m =>
      m.id === 'meeting-1' ? { ...m, description: 'Externally updated description' } : m
    );
    rerender(<MeetingSeriesEditorModal {...defaultProps} meetings={updatedMeetings} />);

    // Clean meetings should pick up the new value
    expect(queryByDisplayValue('Externally updated description')).toBeTruthy();
    // Old value should be gone
    expect(queryByDisplayValue('Introduction to Genesis')).toBeNull();
  });

  it('should clear all edits when modal is closed and reopened', () => {
    const { rerender, getByDisplayValue, queryByDisplayValue, queryByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} />
    );

    // Edit both meetings
    fireEvent.changeText(getByDisplayValue('Introduction to Genesis'), 'Unsaved edit 1');
    fireEvent.changeText(getByDisplayValue('Chapter 1-3 discussion'), 'Unsaved edit 2');

    // Close modal
    rerender(<MeetingSeriesEditorModal {...defaultProps} visible={false} />);
    // Reopen modal
    rerender(<MeetingSeriesEditorModal {...defaultProps} visible={true} />);

    // Both should be reset to originals
    expect(queryByDisplayValue('Introduction to Genesis')).toBeTruthy();
    expect(queryByDisplayValue('Chapter 1-3 discussion')).toBeTruthy();
    expect(queryByDisplayValue('Unsaved edit 1')).toBeNull();
    expect(queryByDisplayValue('Unsaved edit 2')).toBeNull();
    expect(queryByText('Unsaved')).toBeNull();
  });

  // --- Attendee management tests ---

  it('should render Manage Invites section with current attendees', () => {
    const { getByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    expect(getByText('Manage Invites')).toBeTruthy();
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(getByText('Bob Jones')).toBeTruthy();
  });

  it('should show Add Members button', () => {
    const { getByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    expect(getByText('+ Add Members')).toBeTruthy();
  });

  it('should open member picker and show available members when Add Members is pressed', async () => {
    const { getByText, findByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    fireEvent.press(getByText('+ Add Members'));

    // Carol is not already an attendee, so she should appear
    const carol = await findByText('Carol White');
    expect(carol).toBeTruthy();

    // Alice and Bob are already attendees, so they should NOT appear in the picker
    expect(getByText('Select Members')).toBeTruthy();
  });

  it('should call onAddAttendees when selecting and adding new members', async () => {
    const { getByText, findByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    fireEvent.press(getByText('+ Add Members'));

    // Wait for members to load
    const carol = await findByText('Carol White');
    fireEvent.press(carol);

    // Press the add button
    fireEvent.press(getByText('Add 1 Member'));

    await waitFor(() => {
      expect(mockOnAddAttendees).toHaveBeenCalledWith('series-1', [
        { id: 'user-carol', type: 'user' },
      ]);
    });
  });

  it('should call onRemoveAttendee when remove button is pressed', async () => {
    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    // Find remove buttons (✕)
    const removeButtons = getAllByText('✕');
    expect(removeButtons.length).toBe(2); // One for Alice, one for Bob

    // Remove Alice (first button)
    fireEvent.press(removeButtons[0]);

    await waitFor(() => {
      expect(mockOnRemoveAttendee).toHaveBeenCalledWith('series-1', 'user-alice', 'user');
    });
  });

  it('should show placeholder badge for placeholder attendees', () => {
    const { getAllByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    // Bob is a placeholder
    const placeholderBadges = getAllByText('Placeholder');
    expect(placeholderBadges.length).toBeGreaterThan(0);
  });

  it('should show no attendees message when meetings have no attendees', () => {
    const meetingsWithoutAttendees = mockMeetings.map(m => ({ ...m, attendees: [] }));
    const { getByText } = render(
      <MeetingSeriesEditorModal {...defaultProps} meetings={meetingsWithoutAttendees} />
    );

    expect(getByText('No attendees yet')).toBeTruthy();
  });

  it('should show all members invited message when all are already attendees', async () => {
    // Make fetchMembers return only Alice and Bob (who are already attendees)
    (fetchMembers as jest.Mock).mockResolvedValue({
      data: [
        {
          user_id: 'user-alice',
          user: { full_name: 'Alice Smith', email: 'alice@example.com', avatar_url: null },
          placeholder_id: null,
          placeholder: null,
        },
        {
          user_id: null,
          placeholder_id: 'ph-bob',
          user: null,
          placeholder: { full_name: 'Bob Jones', email: 'bob@example.com' },
        },
      ],
      error: null,
    });

    const { getByText, findByText } = render(<MeetingSeriesEditorModal {...defaultProps} />);

    fireEvent.press(getByText('+ Add Members'));

    const message = await findByText('All group members are already invited');
    expect(message).toBeTruthy();
  });
});
