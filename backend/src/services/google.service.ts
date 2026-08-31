import { google } from 'googleapis';
import { env } from '../config/env.js';
import { googleIntegracionRepository } from '../repositories/googleIntegracion.repository.js';
import { buildCotizacionSheetData, type SheetCell } from './cotizacionExport.service.js';
import { AppError } from '../utils/errors.js';
import type { SolicitudCotizacionConRelaciones } from '@hofra/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

function createOAuthClient() {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
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
    const oauth2 = google.oauth2({ auth: client, version: 'v2' });
    const { data } = await oauth2.userinfo.get();

    await googleIntegracionRepository.upsert({
      refreshToken: tokens.refresh_token,
      connectedEmail: data.email || null,
    });
  }

  async getStatus(): Promise<{ connected: boolean; email: string | null }> {
    const integracion = await googleIntegracionRepository.get();
    return { connected: !!integracion, email: integracion?.connectedEmail || null };
  }

  private async getAuthorizedClient() {
    const integracion = await googleIntegracionRepository.get();
    if (!integracion) {
      throw new AppError(400, 'No hay ninguna cuenta de Google conectada. Conectala desde Configuraciones.');
    }
    const client = createOAuthClient();
    client.setCredentials({ refresh_token: integracion.refreshToken });
    return client;
  }

  async createSpreadsheet(solicitud: SolicitudCotizacionConRelaciones): Promise<string> {
    const auth = await this.getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const { titulo, rows } = buildCotizacionSheetData(solicitud);

    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: titulo },
        sheets: [{ properties: { title: 'Cotización' } }],
      },
    });

    const spreadsheetId = created.data.spreadsheetId;
    const spreadsheetUrl = created.data.spreadsheetUrl;
    if (!spreadsheetId || !spreadsheetUrl) {
      throw new Error('Google no devolvió el ID de la planilla creada');
    }

    const values = rows.map((row) => row.map(toSheetsValue));

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Cotización!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
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
