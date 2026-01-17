/**
 * Centralized logging utility for the application.
 *
 * In development: Logs to console with colored prefixes
 * In production: Can be extended to send to monitoring services (Sentry, DataDog, etc.)
 *
 * @example
 * ```typescript
 * import { logger } from '../lib/logger';
 *
 * logger.info('MyComponent', 'User logged in', { userId: '123' });
 * logger.error('useMessages', 'Failed to send message', { error: err.message });
 * logger.warn('ResourcesScreen', 'Large file upload', { size: fileSize });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  context?: LogContext;
  timestamp: string;
}

/**
 * Configuration for external logging services
 * Extend this when integrating Sentry, DataDog, etc.
 */
interface LoggerConfig {
  /** Minimum level to log (debug < info < warn < error) */
  minLevel: LogLevel;
  /** Whether to log to console */
  consoleEnabled: boolean;
  /** Callback for sending logs to external service */
  onLog?: (entry: LogEntry) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: __DEV__ ? 'debug' : 'warn',
      consoleEnabled: true,
      ...config,
    };
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set callback for external logging service (e.g., Sentry)
   */
  setLogHandler(handler: (entry: LogEntry) => void): void {
    this.config.onLog = handler;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, tag: string, message: string): string {
    const color = LOG_COLORS[level];
    const levelUpper = level.toUpperCase().padEnd(5);
    return `${color}[${levelUpper}]${RESET_COLOR} [${tag}] ${message}`;
  }

  private log(level: LogLevel, tag: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      tag,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    // Console logging
    if (this.config.consoleEnabled) {
      const formattedMessage = this.formatMessage(level, tag, message);

      switch (level) {
        case 'debug':
          console.debug(formattedMessage, context || '');
          break;
        case 'info':
          console.info(formattedMessage, context || '');
          break;
        case 'warn':
          console.warn(formattedMessage, context || '');
          break;
        case 'error':
          console.error(formattedMessage, context || '');
          break;
      }
    }

    // External logging service
    this.config.onLog?.(entry);
  }

  /**
   * Log debug message (development only by default)
   */
  debug(tag: string, message: string, context?: LogContext): void {
    this.log('debug', tag, message, context);
  }

  /**
   * Log info message
   */
  info(tag: string, message: string, context?: LogContext): void {
    this.log('info', tag, message, context);
  }

  /**
   * Log warning message
   */
  warn(tag: string, message: string, context?: LogContext): void {
    this.log('warn', tag, message, context);
  }

  /**
   * Log error message
   */
  error(tag: string, message: string, context?: LogContext): void {
    this.log('error', tag, message, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing or custom instances
export { Logger };
export type { LogLevel, LogContext, LogEntry, LoggerConfig };
