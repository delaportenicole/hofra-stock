import type { Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type { AccionAuditoria } from '@hofra/shared';

interface AuditContext {
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string;
  datosAnteriores?: Record<string, unknown>;
  datosNuevos?: Record<string, unknown>;
}

// Map entity names to table names and relevant columns for audit
const ENTITY_CONFIG: Record<string, { table: string; columns: string[] }> = {
  articulos: {
    table: 'articulos',
    columns: ['id', 'codigo', 'nombre', 'descripcion', 'rubro_id', 'proveedor_id', 'stock', 'stock_minimo', 'unidad', 'presentacion', 'marca', 'sku', 'etm', 'ubicacion', 'costo_inicial_estimado', 'activo'],
  },
  entregas: {
    table: 'entregas',
    columns: ['id', 'cliente_id', 'numero_cotizacion_interna', 'purchase_order', 'observaciones', 'fecha_entrega'],
  },
  reposiciones: {
    table: 'reposiciones',
    columns: ['id', 'articulo_id', 'proveedor_id', 'cantidad', 'stock_disponible', 'costo_reposicion', 'valor_dolar_oficial', 'costo_reposicion_dolares', 'fecha_vencimiento', 'lote_partida', 'link_compra', 'lugar_compra', 'estado', 'observaciones', 'fecha_reposicion'],
  },
  solicitudes_cotizacion: {
    table: 'solicitudes_cotizacion',
    columns: ['id', 'cliente_id', 'numero_referencia_cliente', 'nombre_archivo', 'estado', 'observaciones', 'fecha_solicitud'],
  },
};

// Fetch entity data by ID for capturing previous state
async function fetchEntityById(entidad: string, id: string): Promise<Record<string, unknown> | null> {
  const config = ENTITY_CONFIG[entidad];
  if (!config) return null;

  const row = await queryOne<Record<string, unknown>>(
    `SELECT ${config.columns.join(', ')} FROM ${config.table} WHERE id = $1`,
    [id]
  );

  return row || null;
}

// Clean data for logging - remove nulls and convert to readable format
function cleanDataForLog(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!data) return null;

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    // Skip nulls and undefined
    if (value === null || value === undefined) continue;

    // Convert snake_case to camelCase for readability
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Format dates
    if (value instanceof Date) {
      cleaned[camelKey] = value.toISOString();
    } else {
      cleaned[camelKey] = value;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export async function createAuditLog(
  req: AuthenticatedRequest,
  context: AuditContext
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  const usuarioId = req.user?.userId || null;

  try {
    await query(
      `INSERT INTO audit_log (
        usuario_id, accion, entidad, entidad_id,
        datos_anteriores, datos_nuevos, ip, user_agent,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $1)`,
      [
        usuarioId,
        context.accion,
        context.entidad,
        context.entidadId || null,
        context.datosAnteriores ? JSON.stringify(context.datosAnteriores) : null,
        context.datosNuevos ? JSON.stringify(context.datosNuevos) : null,
        ip,
        userAgent,
      ]
    );
  } catch (error) {
    // Log error but don't throw - audit should not break the request
    console.error('Error creating audit log:', error);
  }
}

// Middleware factory for automatic audit logging
export function auditMiddleware(entidad: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Fetch previous data for update/delete operations
    let datosAnteriores: Record<string, unknown> | null = null;
    const entityId = req.params.id;

    if ((req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') && entityId) {
      try {
        datosAnteriores = await fetchEntityById(entidad, entityId);
      } catch (error) {
        console.error('Error fetching previous data for audit:', error);
      }
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = function (body: unknown) {
      // Determine action based on HTTP method
      let accion: AccionAuditoria | null = null;
      switch (req.method) {
        case 'POST':
          accion = 'crear';
          break;
        case 'PUT':
        case 'PATCH':
          accion = 'actualizar';
          break;
        case 'DELETE':
          accion = 'eliminar';
          break;
      }

      // Only audit write operations
      if (accion && res.statusCode >= 200 && res.statusCode < 300) {
        const bodyData = (body as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        const entidadId = entityId || (bodyData?.id as string | undefined);

        // Clean data for logging
        const cleanedAnterior = cleanDataForLog(datosAnteriores);
        const cleanedNuevo = accion === 'eliminar'
          ? null
          : cleanDataForLog(bodyData || null);

        createAuditLog(req, {
          accion,
          entidad,
          entidadId,
          datosAnteriores: cleanedAnterior || undefined,
          datosNuevos: cleanedNuevo || undefined,
        }).catch(console.error);
      }

      return originalJson(body);
    };

    next();
  };
}

// Manual audit log for complex operations (like confirmar/cancelar reposicion)
export async function logManualAudit(
  req: AuthenticatedRequest,
  accion: AccionAuditoria,
  entidad: string,
  entidadId: string,
  datosAnteriores?: Record<string, unknown>,
  datosNuevos?: Record<string, unknown>
): Promise<void> {
  await createAuditLog(req, {
    accion,
    entidad,
    entidadId,
    datosAnteriores: cleanDataForLog(datosAnteriores) || undefined,
    datosNuevos: cleanDataForLog(datosNuevos) || undefined,
  });
}
