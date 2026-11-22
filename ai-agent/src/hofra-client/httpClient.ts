import axios from 'axios';
import { env } from '../config/env.js';

// Cliente HTTP autenticado contra la API de Hofra Stock vía API key (ver backend/src/middlewares/auth.ts).
// Si HOFRA_API_KEY está vacía o es inválida, el servidor responde 401 — no se valida acá
// a propósito, para no acoplar este cliente a requisitos de otras partes del agente (ej. Claude).
// A diferencia del login humano (JWT access/refresh), una API key no expira ni necesita renovarse,
// así que no hace falta ningún interceptor de refresh acá.
export const hofraApi = axios.create({
  baseURL: env.HOFRA_API_URL,
  headers: {
    'X-API-Key': env.HOFRA_API_KEY,
    'Content-Type': 'application/json',
  },
});
