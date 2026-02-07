import { Alert, Platform } from 'react-native';
import { PostgrestError } from '@supabase/supabase-js';
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

// ============================================================================
// Centralized Error Handler
// ============================================================================

/**
 * Options for handleError function
 */
export interface HandleErrorOptions {
  /** Context tag for logging (e.g., 'useMeetings', 'useResources') */
  context: string;
  /** Operation being performed (e.g., 'fetchMeetings', 'createResource') */
  operation?: string;
  /** Whether to show an alert to the user */
  showAlert?: boolean;
  /** Additional context for logging */
  metadata?: Record<string, unknown>;
}

/**
 * Structured error result from handleError
 */
export interface HandledError {
  /** Error code for programmatic handling */
  code: ErrorCode;
  /** User-friendly message */
  userMessage: string;
  /** Original error message (for debugging) */
  originalMessage: string;
  /** Whether this error is recoverable (user can retry) */
  recoverable: boolean;
}

/**
 * Determines if an error is recoverable (user can retry the action)
 */
function isRecoverable(code: ErrorCode): boolean {
  const nonRecoverableErrors = [
    ErrorCode.NOT_AUTHENTICATED,
    ErrorCode.SESSION_EXPIRED,
    ErrorCode.NOT_AUTHORIZED,
    ErrorCode.INSUFFICIENT_PERMISSIONS,
  ];
  return !nonRecoverableErrors.includes(code);
}

/**
 * Parse Supabase PostgrestError for better error messages
 */
function parsePostgrestError(error: PostgrestError): { code: ErrorCode; message: string } {
  const { code: pgCode, message, details } = error;

  // Map Postgres error codes to our error codes
  if (pgCode === '23505') {
    return { code: ErrorCode.ALREADY_EXISTS, message: 'This item already exists.' };
  }
  if (pgCode === '23503') {
    return { code: ErrorCode.NOT_FOUND, message: 'Referenced item not found.' };
  }
  if (pgCode === '42501' || message.includes('permission denied')) {
    return { code: ErrorCode.INSUFFICIENT_PERMISSIONS, message: 'You don\'t have permission to do this.' };
  }
  if (pgCode === 'PGRST116') {
    return { code: ErrorCode.NOT_FOUND, message: 'Item not found.' };
  }

  return { code: ErrorCode.SERVER_ERROR, message: message || 'A database error occurred.' };
}

/**
 * Centralized error handler that logs, categorizes, and returns structured error info.
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (err) {
 *   const handled = handleError(err, { context: 'useMeetings', operation: 'fetchMeetings' });
 *   setError(handled.userMessage);
 * }
 * ```
 */
export function handleError(error: unknown, options: HandleErrorOptions): HandledError {
  const { context, operation, showAlert: shouldShowAlert = false, metadata } = options;

  // Determine error code and messages
  let code: ErrorCode;
  let userMessage: string;
  let originalMessage: string;

  if (error instanceof AppError) {
    code = error.code;
    userMessage = error.getUserMessage();
    originalMessage = error.message;
  } else if (error instanceof PostgrestError || (error && typeof error === 'object' && 'code' in error && 'message' in error && 'details' in error)) {
    const parsed = parsePostgrestError(error as PostgrestError);
    code = parsed.code;
    userMessage = parsed.message;
    originalMessage = (error as PostgrestError).message;
  } else if (error instanceof Error) {
    code = getErrorCode(error);
    userMessage = getUserErrorMessage(error);
    originalMessage = error.message;
  } else {
    code = ErrorCode.UNKNOWN;
    userMessage = USER_MESSAGES[ErrorCode.UNKNOWN];
    originalMessage = String(error);
  }

  const recoverable = isRecoverable(code);

  // Log the error with full context
  logger.error(context, `${operation ? `[${operation}] ` : ''}${originalMessage}`, {
    code,
    recoverable,
    stack: error instanceof Error ? error.stack : undefined,
    ...metadata,
  });

  // Optionally show alert
  if (shouldShowAlert) {
    showErrorAlert(error);
  }

  return {
    code,
    userMessage,
    originalMessage,
    recoverable,
  };
}

/**
 * Wrapper for async operations with standardized error handling.
 * Returns a tuple of [result, error] similar to Go-style error handling.
 *
 * @example
 * ```typescript
 * const [meetings, error] = await withErrorHandling(
 *   () => supabase.from('meetings').select('*'),
 *   { context: 'useMeetings', operation: 'fetch' }
 * );
 *
 * if (error) {
 *   setError(error.userMessage);
 *   return;
 * }
 *
 * setMeetings(meetings);
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: HandleErrorOptions
): Promise<[T | null, HandledError | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const handled = handleError(error, options);
    return [null, handled];
  }
}

/**
 * Type guard to check if a Supabase response has an error
 */
export function hasSupabaseError<T>(
  response: { data: T | null; error: PostgrestError | null }
): response is { data: null; error: PostgrestError } {
  return response.error !== null;
}

/**
 * Process a Supabase response and throw if there's an error.
 * Useful for cleaner async/await patterns.
 *
 * @example
 * ```typescript
 * try {
 *   const data = await unwrapSupabaseResponse(
 *     supabase.from('meetings').select('*')
 *   );
 *   // data is guaranteed to be non-null here
 * } catch (error) {
 *   // error is an AppError with proper code
 * }
 * ```
 */
export async function unwrapSupabaseResponse<T>(
  promise: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await promise;

  if (error) {
    const parsed = parsePostgrestError(error);
    throw new AppError(parsed.code, parsed.message, error);
  }

  if (data === null) {
    throw new AppError(ErrorCode.NOT_FOUND, 'No data returned');
  }

  return data;
}
