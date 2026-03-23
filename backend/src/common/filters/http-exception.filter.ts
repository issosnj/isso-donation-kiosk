import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  private log(level: string, message: string, context?: Record<string, unknown>): void {
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ?? {}),
    });
    if (level === 'error') console.error(payload);
    else console.log(payload);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = exception instanceof HttpException
      ? exception.getResponse()
      : null;

    let safeMessage: string;
    let safeErrors: unknown = undefined;

    if (typeof responseBody === 'string') {
      safeMessage = this.sanitize(responseBody);
    } else if (responseBody && typeof responseBody === 'object' && 'message' in responseBody) {
      const msg = (responseBody as { message?: string | string[] }).message;
      safeMessage = Array.isArray(msg)
        ? msg.map((m) => this.sanitize(String(m))).join('; ')
        : this.sanitize(String(msg ?? 'Unknown error'));
      if ('errors' in responseBody && Array.isArray((responseBody as any).errors)) {
        safeErrors = (responseBody as any).errors;
      }
    } else if (exception instanceof Error) {
      safeMessage = this.isProduction
        ? 'Internal server error'
        : this.sanitize(exception.message);
    } else {
      safeMessage = 'Internal server error';
    }

    const logContext: Record<string, string | number | undefined> = {
      status,
      path: request.path,
      method: request.method,
    };
    if (!this.isProduction && exception instanceof Error && exception.stack) {
      (logContext as any).stack = exception.stack;
    }

    this.log('error', `Unhandled exception: ${safeMessage}`, {
      ...logContext,
      ...(exception instanceof Error && !this.isProduction ? { stack: exception.stack } : {}),
    });

    const json: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: safeMessage,
    };
    if (safeErrors !== undefined) {
      json.errors = safeErrors;
    }

    response.status(status).json(json);
  }

  private sanitize(msg: string): string {
    if (!msg || typeof msg !== 'string') return 'Unknown error';
    let s = msg;
    if (this.isProduction) {
      s = s
        .replace(/\/[^\s]+/g, '/***')
        .replace(/[\w-]+\.sql/gi, '***.sql')
        .replace(/password|secret|token|key\s*[=:]\s*[\w-]+/gi, (m) => m.replace(/[\w-]+$/, '***'));
    }
    return s;
  }
}
