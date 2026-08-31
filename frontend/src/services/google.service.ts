import api from './api';

export interface GoogleStatus {
  connected: boolean;
  email: string | null;
}

export const googleService = {
  async getStatus(): Promise<GoogleStatus> {
    const response = await api.get<{ data: GoogleStatus }>('/google/status');
    return response.data.data;
  },

  async getAuthUrl(): Promise<string> {
    const response = await api.get<{ data: { url: string } }>('/google/auth-url');
    return response.data.data.url;
  },
};
