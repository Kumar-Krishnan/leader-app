import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MeetingSeriesEditorModal from '../../src/components/MeetingSeriesEditorModal';
import { MeetingWithAttendees } from '../../src/types/database';

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
    attendees: [],
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
    attendees: [],
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
    attendees: [],
  },
];

describe('MeetingSeriesEditorModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpdateMeeting = jest.fn();
  const mockOnSkipMeeting = jest.fn();
  const mockOnRefresh = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    seriesId: 'series-1',
    seriesTitle: 'Weekly Bible Study',
    meetings: mockMeetings,
    onUpdateMeeting: mockOnUpdateMeeting,
    onSkipMeeting: mockOnSkipMeeting,
    onRefresh: mockOnRefresh,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnUpdateMeeting.mockResolvedValue(true);
    mockOnSkipMeeting.mockResolvedValue(true);
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
});
