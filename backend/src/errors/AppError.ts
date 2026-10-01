export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

export class BizScoutError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'BizScoutError';
  }
}

export class ValidationError extends BizScoutError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends BizScoutError {
  constructor(message = 'Unauthorized') {
    super('AUTH_ERROR', message, 401);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends BizScoutError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ProviderError extends BizScoutError {
  constructor(provider: string, message: string) {
    super('PROVIDER_ERROR', `${provider}: ${message}`, 503);
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends BizScoutError {
  constructor(message = 'Rate limit exceeded') {
    super('RATE_LIMIT', message, 429);
    this.name = 'RateLimitError';
  }
}
