import type { Request, Response, NextFunction } from 'express';
import { googleService } from '../services/google.service.js';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

export class GoogleController {
  // Endpoint temporal de diagnóstico: no expone el client secret, solo confirma
  // si cada variable de entorno le está llegando al backend en este deploy.
  async debugEnv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, {
        clientId: env.GOOGLE_CLIENT_ID || null,
        clientSecretPresente: !!env.GOOGLE_CLIENT_SECRET,
        clientSecretLargo: env.GOOGLE_CLIENT_SECRET.length,
        redirectUri: env.GOOGLE_REDIRECT_URI || null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = googleService.getAuthUrl();
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  }

  async oauthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : undefined;
      if (!code) {
        res.redirect(`${env.FRONTEND_URL}/configuraciones?google=error`);
        return;
      }

      await googleService.handleOAuthCallback(code);
      res.redirect(`${env.FRONTEND_URL}/configuraciones?google=connected`);
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await googleService.getStatus();
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }
}

export const googleController = new GoogleController();
