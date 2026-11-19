import { execute } from '../config/database.js';

export class HistorialMatchingRepository {
  /**
   * Registra (o incrementa si ya existía) que un humano confirmó que una descripción
   * de cliente corresponde a un artículo del catálogo. Groundwork para que el futuro
   * Hofra AI Agent pueda sugerir matches basándose en confirmaciones pasadas.
   */
  async registrarConfirmacion(data: {
    descripcionNormalizada: string;
    clienteId: string;
    articuloId: string;
  }): Promise<void> {
    await execute(
      `INSERT INTO historial_matching_cliente (descripcion_normalizada, cliente_id, articulo_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (descripcion_normalizada, cliente_id, articulo_id)
       DO UPDATE SET veces_confirmado = historial_matching_cliente.veces_confirmado + 1, updated_at = NOW()`,
      [data.descripcionNormalizada, data.clienteId, data.articuloId]
    );
  }
}

export const historialMatchingRepository = new HistorialMatchingRepository();
