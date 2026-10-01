import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { BizScoutError } from '../errors/AppError.js';
import { isDev } from '../config/env.js';

export function errorHandler(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.flatten().fieldErrors,
      },
    });
  }

  if (error instanceof BizScoutError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Fastify built-in errors
  if ((error as { statusCode?: number }).statusCode) {
    const err = error as { statusCode: number; message: string };
    return reply.status(err.statusCode).send({
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: err.message,
      },
    });
  }

  // Unexpected errors — do not expose details in production
  console.error('[Unhandled Error]', error);
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(isDev && { stack: (error as Error).stack }),
    },
  });
}

export function successResponse<T>(data: T) {
  return { success: true, data };
}
