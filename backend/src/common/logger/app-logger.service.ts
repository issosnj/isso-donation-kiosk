import { Injectable, LoggerService } from '@nestjs/common';

export type LogContext = Record<string, string | number | boolean | undefined | null>;

@Injectable()
export class AppLogger implements LoggerService {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };
    return JSON.stringify(payload);
  }

  log(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  error(message: string, trace?: string, context?: LogContext): void {
    const ctx = { ...context, ...(trace && !this.isProduction ? { stack: trace } : {}) };
    console.error(this.formatMessage('error', message, ctx));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  verbose(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(this.formatMessage('verbose', message, context));
    }
  }
}
