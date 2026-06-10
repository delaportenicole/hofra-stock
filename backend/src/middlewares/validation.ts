import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        next(new ValidationError('Error de validación', errors));
        return;
      }

      next(error);
    }
  };
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return validate(schema, 'body');
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return validate(schema, 'query');
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return validate(schema, 'params');
}
