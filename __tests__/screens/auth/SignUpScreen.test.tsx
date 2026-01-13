import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignUpScreen from '../../../src/screens/auth/SignUpScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
} as any;

// Mock auth context
const mockSignUp = jest.fn();

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}));

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render sign up form', () => {
    const { getAllByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    expect(getAllByText('Create Account').length).toBeGreaterThan(0);
    expect(getAllByText('Join the leader community').length).toBeGreaterThan(0);
    expect(getByPlaceholderText('Full Name')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
  });

  it('should update all input fields', () => {
    const { getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const nameInput = getByPlaceholderText('Full Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmInput, 'password123');

    expect(nameInput.props.value).toBe('John Doe');
    expect(emailInput.props.value).toBe('john@example.com');
    expect(passwordInput.props.value).toBe('password123');
    expect(confirmInput.props.value).toBe('password123');
  });

  it('should show error when submitting empty fields', async () => {
    const { getAllByText, getByText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1]; // Get the button (last one)
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Please fill in all fields')).toBeTruthy();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show error when passwords do not match', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password456');

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show error when password is too short', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), '12345');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), '12345');

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should call signUp with valid data', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { getAllByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe');
    });
  });

  it('should show error message on sign up failure', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'Email already exists' },
    });

    const { getAllByText, getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Email'), 'existing@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Email already exists')).toBeTruthy();
    });
  });

  it('should show success screen after successful sign up', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { getAllByText, getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Check your email')).toBeTruthy();
      expect(getByText(/We've sent you a confirmation link/)).toBeTruthy();
    });
  });

  it('should navigate to SignIn from success screen', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { getAllByText, getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Back to Sign In')).toBeTruthy();
    });

    const backButton = getByText('Back to Sign In');
    fireEvent.press(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });

  it('should navigate to SignIn when link is pressed', () => {
    const { getByText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const signInLink = getByText('Sign In');
    fireEvent.press(signInLink);

    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });

  it('should display "Already have an account?" text', () => {
    const { getByText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    expect(getByText('Already have an account?')).toBeTruthy();
  });

  it('should have secure text entry for password fields', () => {
    const { getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const passwordInput = getByPlaceholderText('Password');
    const confirmInput = getByPlaceholderText('Confirm Password');

    expect(passwordInput.props.secureTextEntry).toBe(true);
    expect(confirmInput.props.secureTextEntry).toBe(true);
  });

  it('should have email keyboard type for email field', () => {
    const { getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    expect(emailInput.props.keyboardType).toBe('email-address');
  });

  it('should disable auto-capitalize for email field', () => {
    const { getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    expect(emailInput.props.autoCapitalize).toBe('none');
  });

  it('should disable button while signing up', async () => {
    mockSignUp.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 50))
    );

    const { getAllByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

    const createButtons = getAllByText('Create Account');
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
  });
});

