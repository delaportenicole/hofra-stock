export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors: Record<string, string[]> = {}
  ) {
    super(400, message, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(404, `${resource} no encontrado`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'No tiene permisos para realizar esta acción') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'El recurso ya existe') {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class InsufficientStockError extends AppError {
  constructor(available: number, requested: number) {
    super(
      400,
      `Stock insuficiente. Disponible: ${available}, Solicitado: ${requested}`,
      'INSUFFICIENT_STOCK',
      { available, requested }
    );
    this.name = 'InsufficientStockError';
  }
}
