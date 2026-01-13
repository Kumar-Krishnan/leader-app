import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignInScreen from '../../../src/screens/auth/SignInScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
} as any;

// Mock auth context
const mockSignIn = jest.fn();
let mockIsConfigured = true;

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isConfigured: mockIsConfigured,
  }),
}));

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured = true;
  });

  it('should render sign in form', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    expect(getByText('Leader App')).toBeTruthy();
    expect(getByText('Sign in to continue')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should show warning when Supabase is not configured', () => {
    mockIsConfigured = false;

    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    expect(getByText('⚠️ Setup Required')).toBeTruthy();
    expect(getByText(/Supabase is not configured/)).toBeTruthy();
  });

  it('should not show warning when Supabase is configured', () => {
    mockIsConfigured = true;

    const { queryByText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    expect(queryByText('⚠️ Setup Required')).toBeNull();
  });

  it('should update email input', () => {
    const { getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    fireEvent.changeText(emailInput, 'test@example.com');

    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('should update password input', () => {
    const { getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const passwordInput = getByPlaceholderText('Password');
    fireEvent.changeText(passwordInput, 'password123');

    expect(passwordInput.props.value).toBe('password123');
  });

  it('should show error when submitting empty fields', async () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please fill in all fields')).toBeTruthy();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should show error when email is missing', async () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const passwordInput = getByPlaceholderText('Password');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please fill in all fields')).toBeTruthy();
    });
  });

  it('should show error when password is missing', async () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    fireEvent.changeText(emailInput, 'test@example.com');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please fill in all fields')).toBeTruthy();
    });
  });

  it('should call signIn with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show error message on sign in failure', async () => {
    mockSignIn.mockResolvedValue({ 
      error: { message: 'Invalid credentials' } 
    });

    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    
    fireEvent.changeText(emailInput, 'wrong@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('should show loading indicator while signing in', async () => {
    mockSignIn.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    );

    const { getByText, getByPlaceholderText, queryByText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Button text should disappear (loading indicator shown)
    await waitFor(() => {
      expect(queryByText('Sign In')).toBeNull();
    });
  });

  it('should navigate to SignUp when link is pressed', () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const signUpLink = getByText('Sign Up');
    fireEvent.press(signUpLink);

    expect(mockNavigate).toHaveBeenCalledWith('SignUp');
  });

  it('should display "Don\'t have an account?" text', () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    expect(getByText("Don't have an account?")).toBeTruthy();
  });

  it('should have secure text entry for password field', () => {
    const { getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const passwordInput = getByPlaceholderText('Password');
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('should have email keyboard type for email field', () => {
    const { getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    expect(emailInput.props.keyboardType).toBe('email-address');
  });

  it('should disable auto-capitalize for email field', () => {
    const { getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    expect(emailInput.props.autoCapitalize).toBe('none');
  });
});

