import dotenv from 'dotenv';

dotenv.config();

export const env = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  HOFRA_API_URL: process.env.HOFRA_API_URL || 'http://localhost:3000/api',
  HOFRA_API_KEY: process.env.HOFRA_API_KEY || '',
};

export function validateEnv(): void {
  const required = ['ANTHROPIC_API_KEY', 'HOFRA_API_KEY'] as const;
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);
  }
}
