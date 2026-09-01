import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { googleIntegracionRepository } from '../repositories/googleIntegracion.repository.js';
import { buildCotizacionSheetData, type SheetCell } from './cotizacionExport.service.js';
import { AppError } from '../utils/errors.js';
import type { SolicitudCotizacionConRelaciones } from '@hofra/shared';

// Se usa google-auth-library directo (no el paquete "googleapis" completo: pesa
// ~200MB y hace crashear la función serverless de Vercel por tamaño). Las llamadas
// a Sheets/Drive se hacen por HTTP a mano usando client.request(), que ya se
// encarga de adjuntar el token y renovarlo con el refresh_token guardado.

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

function createOAuthClient(): OAuth2Client {
  return new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

interface SheetsCreateResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

class GoogleService {
  getAuthUrl(): string {
    const client = createOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // fuerza a devolver refresh_token incluso si ya se había autorizado antes
      scope: SCOPES,
    });
  }

  async handleOAuthCallback(code: string): Promise<void> {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      throw new AppError(
        400,
        'Google no devolvió un refresh token. Desconectá la app en https://myaccount.google.com/permissions y volvé a intentar.'
      );
    }

    client.setCredentials(tokens);
    const { data } = await client.request<{ email?: string }>({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    await googleIntegracionRepository.upsert({
      refreshToken: tokens.refresh_token,
      connectedEmail: data.email || null,
    });
  }

  async getStatus(): Promise<{ connected: boolean; email: string | null }> {
    const integracion = await googleIntegracionRepository.get();
    return { connected: !!integracion, email: integracion?.connectedEmail || null };
  }

  private async getAuthorizedClient(): Promise<OAuth2Client> {
    const integracion = await googleIntegracionRepository.get();
    if (!integracion) {
      throw new AppError(400, 'No hay ninguna cuenta de Google conectada. Conectala desde Configuraciones.');
    }
    const client = createOAuthClient();
    client.setCredentials({ refresh_token: integracion.refreshToken });
    return client;
  }

  async createSpreadsheet(solicitud: SolicitudCotizacionConRelaciones): Promise<string> {
    const client = await this.getAuthorizedClient();
    const { titulo, rows } = buildCotizacionSheetData(solicitud);

    const created = await client.request<SheetsCreateResponse>({
      url: 'https://sheets.googleapis.com/v4/spreadsheets',
      method: 'POST',
      data: {
        properties: { title: titulo },
        sheets: [{ properties: { title: 'Cotización' } }],
      },
    });

    const { spreadsheetId, spreadsheetUrl } = created.data;
    if (!spreadsheetId || !spreadsheetUrl) {
      throw new Error('Google no devolvió el ID de la planilla creada');
    }

    const values = rows.map((row) => row.map(toSheetsValue));
    const range = encodeURIComponent('Cotización!A1');

    await client.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      method: 'PUT',
      params: { valueInputOption: 'USER_ENTERED' },
      data: { values },
    });

    return spreadsheetUrl;
  }
}

function toSheetsValue(cell: SheetCell): string | number {
  if (cell === null) return '';
  if (typeof cell === 'object' && 'formula' in cell) return `=${cell.formula}`;
  return cell;
}

export const googleService = new GoogleService();
