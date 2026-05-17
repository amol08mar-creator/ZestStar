import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (status === 401) {
      res.status(401).json({ error: 'Unauthorized', message: 'Please log in' });
      return;
    }

    if (status === 400) {
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      const details = Array.isArray(message)
        ? { validation: message }
        : { reason: message };
      res.status(400).json({ error: 'Invalid input', details });
      return;
    }

    if (status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    res.status(status).json({
      error: typeof body === 'string' ? body : exception.message,
    });
  }
}
