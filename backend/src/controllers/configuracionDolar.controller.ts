import type { Request, Response, NextFunction } from 'express';
import { configuracionDolarRepository } from '../repositories/configuracionDolar.repository.js';
import { sendSuccess } from '../utils/response.js';

export class ConfiguracionDolarController {
  async getVigente(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const configuracion = await configuracionDolarRepository.getVigente();
      sendSuccess(res, { valorDolarOficial: configuracion?.valorDolarOficial ?? null });
    } catch (error) {
      next(error);
    }
  }
}

export const configuracionDolarController = new ConfiguracionDolarController();
