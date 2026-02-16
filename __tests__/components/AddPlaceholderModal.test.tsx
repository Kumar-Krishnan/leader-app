import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddPlaceholderModal from '../../src/components/AddPlaceholderModal';

describe('AddPlaceholderModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(true);
  });

  it('should render when visible', () => {
    const { getAllByText, getByText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        groupName="Test Group"
      />
    );

    // Title and button both have "Add Member" text
    expect(getAllByText('Add Member').length).toBeGreaterThan(0);
    expect(getByText('Email Address *')).toBeTruthy();
    expect(getByText('Full Name *')).toBeTruthy();
    expect(getByText('Role')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <AddPlaceholderModal
        visible={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(queryByText('Add Member')).toBeNull();
  });

  it('should show error when email is empty', async () => {
    const { getByText, getAllByText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Please enter an email address')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error when email is invalid', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = getByPlaceholderText('email@example.com');
    fireEvent.changeText(emailInput, 'invalid-email');

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error when name is empty', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = getByPlaceholderText('email@example.com');
    fireEvent.changeText(emailInput, 'valid@example.com');

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Please enter a name')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with correct data when form is valid', async () => {
    const { getAllByText, getByPlaceholderText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = getByPlaceholderText('email@example.com');
    const nameInput = getByPlaceholderText('John Smith');

    fireEvent.changeText(emailInput, 'newuser@example.com');
    fireEvent.changeText(nameInput, 'New User');

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        'newuser@example.com',
        'New User',
        'member'
      );
    });
  });

  it('should allow selecting different roles', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = getByPlaceholderText('email@example.com');
    const nameInput = getByPlaceholderText('John Smith');

    fireEvent.changeText(emailInput, 'leader@example.com');
    fireEvent.changeText(nameInput, 'New Leader');

    // Select leader role
    const leaderOption = getByText('Leader');
    fireEvent.press(leaderOption);

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        'leader@example.com',
        'New Leader',
        'leader'
      );
    });
  });

  it('should call onClose when close button pressed', () => {
    const { getByText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const closeButton = getByText('X');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal and reset form on successful submit', async () => {
    const { getAllByText, getByPlaceholderText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = getByPlaceholderText('email@example.com');
    const nameInput = getByPlaceholderText('John Smith');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(nameInput, 'Test User');

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show error when onSubmit fails', async () => {
    mockOnSubmit.mockRejectedValue(new Error('User already exists'));

    const { getByText, getAllByText, getByPlaceholderText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = getByPlaceholderText('email@example.com');
    const nameInput = getByPlaceholderText('John Smith');

    fireEvent.changeText(emailInput, 'existing@example.com');
    fireEvent.changeText(nameInput, 'Existing User');

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('User already exists')).toBeTruthy();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should display group name in hint when provided', () => {
    const { getByText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        groupName="My Group"
      />
    );

    expect(getByText(/This placeholder will be added to My Group/)).toBeTruthy();
  });

  it('should trim whitespace from email and name', async () => {
    const { getAllByText, getByPlaceholderText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = getByPlaceholderText('email@example.com');
    const nameInput = getByPlaceholderText('John Smith');

    fireEvent.changeText(emailInput, '  test@example.com  ');
    fireEvent.changeText(nameInput, '  Test User  ');

    // Get the button (second element with "Add Member" text)
    const addPlaceholderElements = getAllByText('Add Member');
    const submitButton = addPlaceholderElements[addPlaceholderElements.length - 1];
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'member'
      );
    });
  });

  it('should show role descriptions', () => {
    const { getByText } = render(
      <AddPlaceholderModal
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(getByText('Can view and participate')).toBeTruthy();
    expect(getByText('Can approve join requests')).toBeTruthy();
    expect(getByText('Full access, can manage roles')).toBeTruthy();
  });
});
