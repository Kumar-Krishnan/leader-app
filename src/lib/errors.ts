import { Alert, Platform } from 'react-native';
import { logger } from './logger';

/**
 * Standard error codes used throughout the application
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',

  // Auth errors
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Permission errors
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD = 'REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Generic
  UNKNOWN = 'UNKNOWN',
}

/**
 * User-friendly error messages for each error code
 */
const USER_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
  [ErrorCode.TIMEOUT]: 'The request timed out. Please try again.',
  [ErrorCode.SERVER_ERROR]: 'Something went wrong on our end. Please try again later.',
  [ErrorCode.NOT_AUTHENTICATED]: 'Please sign in to continue.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [ErrorCode.NOT_AUTHORIZED]: 'You don\'t have permission to do this.',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You don\'t have the required permissions.',
  [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCode.REQUIRED_FIELD]: 'Please fill in all required fields.',
  [ErrorCode.NOT_FOUND]: 'The requested item was not found.',
  [ErrorCode.ALREADY_EXISTS]: 'This item already exists.',
  [ErrorCode.CONFLICT]: 'This action conflicts with another operation.',
  [ErrorCode.UNKNOWN]: 'Something went wrong. Please try again.',
};

/**
 * Application-specific error class with error codes
 */
export class AppError extends Error {
  code: ErrorCode;
  originalError?: Error;

  constructor(code: ErrorCode, message?: string, originalError?: Error) {
    super(message || USER_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.originalError = originalError;
  }

  /**
   * Get user-friendly message for this error
   */
  getUserMessage(): string {
    return USER_MESSAGES[this.code] || this.message;
  }
}

/**
 * Maps common error patterns to error codes
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (error instanceof AppError) {
    return error.code;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ErrorCode.NETWORK_ERROR;
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorCode.TIMEOUT;
  }
  if (message.includes('500') || message.includes('internal server')) {
    return ErrorCode.SERVER_ERROR;
  }

  // Auth errors
  if (message.includes('not authenticated') || message.includes('unauthenticated')) {
    return ErrorCode.NOT_AUTHENTICATED;
  }
  if (message.includes('session') && (message.includes('expired') || message.includes('invalid'))) {
    return ErrorCode.SESSION_EXPIRED;
  }
  if (message.includes('invalid') && (message.includes('credential') || message.includes('password'))) {
    return ErrorCode.INVALID_CREDENTIALS;
  }

  // Permission errors
  if (message.includes('not authorized') || message.includes('unauthorized') || message.includes('403')) {
    return ErrorCode.NOT_AUTHORIZED;
  }
  if (message.includes('permission')) {
    return ErrorCode.INSUFFICIENT_PERMISSIONS;
  }

  // Resource errors
  if (message.includes('not found') || message.includes('404')) {
    return ErrorCode.NOT_FOUND;
  }
  if (message.includes('already exists') || message.includes('duplicate')) {
    return ErrorCode.ALREADY_EXISTS;
  }
  if (message.includes('conflict') || message.includes('409')) {
    return ErrorCode.CONFLICT;
  }

  return ErrorCode.UNKNOWN;
}

/**
 * Get a user-friendly error message from any error
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.getUserMessage();
  }

  const code = getErrorCode(error);
  return USER_MESSAGES[code];
}

/**
 * Log an error with appropriate context
 */
export function logError(tag: string, error: unknown, context?: Record<string, unknown>): void {
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(tag, message, {
    code,
    stack,
    ...context,
  });
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function err<E extends Error = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// Platform-agnostic UI utilities
// ============================================================================

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Show an alert dialog that works on all platforms
 */
export function showAlert(
  title: string,
  message: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS === 'web') {
    // Web: Use window.alert for simple alerts, or custom modal for complex ones
    if (!buttons || buttons.length <= 1) {
      window.alert(`${title}\n\n${message}`);
      buttons?.[0]?.onPress?.();
    } else {
      // For multiple buttons on web, use confirm for 2 buttons
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        // Find the non-cancel button
        const confirmButton = buttons.find(b => b.style !== 'cancel');
        confirmButton?.onPress?.();
      } else {
        const cancelButton = buttons.find(b => b.style === 'cancel');
        cancelButton?.onPress?.();
      }
    }
  } else {
    // Native: Use React Native Alert
    Alert.alert(
      title,
      message,
      buttons?.map(b => ({
        text: b.text,
        onPress: b.onPress,
        style: b.style,
      }))
    );
  }
}

/**
 * Show an error alert to the user
 */
export function showErrorAlert(error: unknown, title = 'Error'): void {
  const message = getUserErrorMessage(error);
  showAlert(title, message);
}

/**
 * Show a confirmation dialog
 * Returns a promise that resolves to true if confirmed, false if cancelled
 */
export function showConfirm(
  title: string,
  message: string,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
): Promise<boolean> {
  return new Promise((resolve) => {
    showAlert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'default', onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Show a destructive confirmation dialog (e.g., for delete actions)
 */
export function showDestructiveConfirm(
  title: string,
  message: string,
  destructiveText = 'Delete',
  cancelText = 'Cancel'
): Promise<boolean> {
  return new Promise((resolve) => {
    showAlert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: destructiveText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
