import { useState, useCallback, useRef } from 'react';
import {
  handleError,
  HandleErrorOptions,
  HandledError,
  ErrorCode,
  showErrorAlert,
} from '../lib/errors';

/**
 * Options for the useErrorHandler hook
 */
interface UseErrorHandlerOptions {
  /** Context tag for logging (e.g., 'useMeetings') */
  context: string;
  /** Whether to automatically clear error after a timeout */
  autoClear?: boolean;
  /** Timeout in ms before auto-clearing error (default: 5000) */
  autoClearTimeout?: number;
}

/**
 * Return type for useErrorHandler hook
 */
interface UseErrorHandlerReturn {
  /** Current error message (user-friendly) */
  error: string | null;
  /** Current error code (for programmatic handling) */
  errorCode: ErrorCode | null;
  /** Full error details */
  errorDetails: HandledError | null;
  /** Clear the current error */
  clearError: () => void;
  /** Set an error message directly */
  setError: (message: string) => void;
  /** Handle an error with full logging and categorization */
  handleError: (error: unknown, operation?: string, showAlert?: boolean) => HandledError;
  /** Wrap an async function with error handling */
  withErrorHandling: <T>(
    fn: () => Promise<T>,
    operation?: string
  ) => Promise<[T | null, HandledError | null]>;
  /** Execute an async function, setting error state on failure */
  execute: <T>(
    fn: () => Promise<T>,
    operation?: string
  ) => Promise<T | null>;
}

/**
 * Hook for centralized error handling in components and other hooks.
 *
 * Provides:
 * - Error state management
 * - Automatic logging with context
 * - User-friendly error messages
 * - Error categorization by code
 * - Optional auto-clear behavior
 *
 * @example
 * ```typescript
 * function useMeetings() {
 *   const { error, handleError, execute, clearError } = useErrorHandler({
 *     context: 'useMeetings',
 *     autoClear: true,
 *   });
 *
 *   const fetchMeetings = async () => {
 *     const data = await execute(
 *       () => supabase.from('meetings').select('*'),
 *       'fetchMeetings'
 *     );
 *     if (data) setMeetings(data);
 *   };
 *
 *   return { meetings, error, clearError };
 * }
 * ```
 */
export function useErrorHandler(options: UseErrorHandlerOptions): UseErrorHandlerReturn {
  const { context, autoClear = false, autoClearTimeout = 5000 } = options;

  const [error, setErrorState] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorDetails, setErrorDetails] = useState<HandledError | null>(null);
  const autoClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearError = useCallback(() => {
    setErrorState(null);
    setErrorCode(null);
    setErrorDetails(null);
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
  }, []);

  const setError = useCallback((message: string) => {
    setErrorState(message);
    setErrorCode(ErrorCode.UNKNOWN);
    setErrorDetails(null);

    if (autoClear) {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
      }
      autoClearTimerRef.current = setTimeout(clearError, autoClearTimeout);
    }
  }, [autoClear, autoClearTimeout, clearError]);

  const handleErrorCallback = useCallback(
    (err: unknown, operation?: string, showAlert?: boolean): HandledError => {
      const opts: HandleErrorOptions = {
        context,
        operation,
        showAlert,
      };

      const handled = handleError(err, opts);

      setErrorState(handled.userMessage);
      setErrorCode(handled.code);
      setErrorDetails(handled);

      if (autoClear && handled.recoverable) {
        if (autoClearTimerRef.current) {
          clearTimeout(autoClearTimerRef.current);
        }
        autoClearTimerRef.current = setTimeout(clearError, autoClearTimeout);
      }

      return handled;
    },
    [context, autoClear, autoClearTimeout, clearError]
  );

  const withErrorHandlingCallback = useCallback(
    async <T>(
      fn: () => Promise<T>,
      operation?: string
    ): Promise<[T | null, HandledError | null]> => {
      clearError();
      try {
        const result = await fn();
        return [result, null];
      } catch (err) {
        const handled = handleErrorCallback(err, operation);
        return [null, handled];
      }
    },
    [clearError, handleErrorCallback]
  );

  const execute = useCallback(
    async <T>(fn: () => Promise<T>, operation?: string): Promise<T | null> => {
      clearError();
      try {
        return await fn();
      } catch (err) {
        handleErrorCallback(err, operation);
        return null;
      }
    },
    [clearError, handleErrorCallback]
  );

  return {
    error,
    errorCode,
    errorDetails,
    clearError,
    setError,
    handleError: handleErrorCallback,
    withErrorHandling: withErrorHandlingCallback,
    execute,
  };
}

export default useErrorHandler;
