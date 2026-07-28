import { query, queryOne } from '../config/database.js';
import { articuloRepository } from '../repositories/articulo.repository.js';
import { stockService } from './stock.service.js';
import type { DashboardStats, MovimientoReciente, ArticuloStockBajo } from '@hofra/shared';

export class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const [
      articulosActivos,
      articulosTotales,
      articulosStockBajo,
      stockStats,
      valuacion,
    ] = await Promise.all([
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM articulos WHERE deleted_at IS NULL AND activo = true`
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM articulos WHERE deleted_at IS NULL`
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM articulos
         WHERE deleted_at IS NULL AND activo = true AND stock <= stock_minimo`
      ),
      stockService.getStats(),
      this.getValuacionTotal(),
    ]);

    return {
      totalArticulos: parseInt(articulosActivos?.count || '0', 10),
      totalArticulosEnSistema: parseInt(articulosTotales?.count || '0', 10),
      articulosStockBajo: parseInt(articulosStockBajo?.count || '0', 10),
      entregasMes: stockStats.entregasMes,
      reposicionesMes: stockStats.reposicionesMes,
      valuacionTotalARS: valuacion.totalARS,
      valuacionTotalUSD: valuacion.totalUSD,
    };
  }

  async getValuacionTotal(): Promise<{ totalARS: number; totalUSD: number | null }> {
    // Valuación de reposiciones confirmadas con stock disponible
    const reposicionesValuacion = await queryOne<{
      total_ars: string | null;
      total_usd: string | null;
    }>(
      `SELECT
        COALESCE(SUM(stock_disponible * costo_reposicion), 0) as total_ars,
        SUM(stock_disponible * costo_reposicion_dolares) as total_usd
       FROM reposiciones
       WHERE deleted_at IS NULL
       AND estado = 'confirmada'
       AND stock_disponible > 0`
    );

    // Valuación de stock inicial estimado (artículos sin reposiciones completas)
    // Incluye tanto ARS como USD
    const stockInicialValuacion = await queryOne<{
      total_ars: string | null;
      total_usd: string | null;
    }>(
      `SELECT
        COALESCE(SUM(
          CASE
            WHEN a.costo_inicial_estimado IS NOT NULL
            THEN (a.stock - COALESCE(r.stock_con_reposicion, 0)) * a.costo_inicial_estimado
            ELSE 0
          END
        ), 0) as total_ars,
        COALESCE(SUM(
          CASE
            WHEN a.costo_inicial_estimado_usd IS NOT NULL
            THEN (a.stock - COALESCE(r.stock_con_reposicion, 0)) * a.costo_inicial_estimado_usd
            ELSE 0
          END
        ), 0) as total_usd
       FROM articulos a
       LEFT JOIN (
         SELECT articulo_id, SUM(stock_disponible) as stock_con_reposicion
         FROM reposiciones
         WHERE deleted_at IS NULL AND estado = 'confirmada'
         GROUP BY articulo_id
       ) r ON r.articulo_id = a.id
       WHERE a.deleted_at IS NULL AND a.activo = true
       AND a.stock > COALESCE(r.stock_con_reposicion, 0)
       AND (a.costo_inicial_estimado IS NOT NULL OR a.costo_inicial_estimado_usd IS NOT NULL)`
    );

    const totalARS = parseFloat(reposicionesValuacion?.total_ars || '0') +
                     parseFloat(stockInicialValuacion?.total_ars || '0');

    // Sum USD from both replenishments and initial costs
    const repoUSD = parseFloat(reposicionesValuacion?.total_usd || '0');
    const inicialUSD = parseFloat(stockInicialValuacion?.total_usd || '0');
    const totalUSD = repoUSD + inicialUSD;

    return { totalARS, totalUSD: totalUSD > 0 ? totalUSD : null };
  }

  async getMovimientosRecientes(limit: number = 10): Promise<MovimientoReciente[]> {
    const rows = await query<{
      id: string;
      tipo: 'entrega' | 'reposicion';
      articulo_nombre: string;
      cantidad: number;
      fecha: Date;
      tercero_nombre: string;
    }>(
      `(
        SELECT
          ei.id,
          'entrega' as tipo,
          a.nombre as articulo_nombre,
          ei.cantidad,
          e.fecha_entrega as fecha,
          c.razon_social as tercero_nombre
        FROM entrega_items ei
        INNER JOIN entregas e ON e.id = ei.entrega_id
        INNER JOIN articulos a ON a.id = ei.articulo_id
        INNER JOIN clientes c ON c.id = e.cliente_id
        WHERE e.deleted_at IS NULL
        ORDER BY e.fecha_entrega DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT
          r.id,
          'reposicion' as tipo,
          a.nombre as articulo_nombre,
          r.cantidad,
          r.fecha_reposicion as fecha,
          p.razon_social as tercero_nombre
        FROM reposiciones r
        INNER JOIN articulos a ON a.id = r.articulo_id
        INNER JOIN proveedores p ON p.id = r.proveedor_id
        WHERE r.deleted_at IS NULL
        ORDER BY r.fecha_reposicion DESC
        LIMIT $1
      )
      ORDER BY fecha DESC
      LIMIT $1`,
      [limit]
    );

    return rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      articuloNombre: row.articulo_nombre,
      cantidad: row.cantidad,
      fecha: row.fecha,
      terceroNombre: row.tercero_nombre,
    }));
  }

  async getArticulosStockBajo(limit: number = 10): Promise<ArticuloStockBajo[]> {
    const rows = await query<{
      id: string;
      codigo: string;
      nombre: string;
      stock: number;
      stock_minimo: number;
      rubro_nombre: string;
    }>(
      `SELECT
        a.id,
        a.codigo,
        a.nombre,
        a.stock,
        a.stock_minimo,
        r.nombre as rubro_nombre
       FROM articulos a
       INNER JOIN rubros r ON r.id = a.rubro_id
       WHERE a.deleted_at IS NULL
       AND a.activo = true
       AND a.stock <= a.stock_minimo
       ORDER BY (a.stock_minimo - a.stock) DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      stock: row.stock,
      stockMinimo: row.stock_minimo,
      rubroNombre: row.rubro_nombre,
    }));
  }

  async getValuacionPorRubro(): Promise<Array<{ rubro: string; total: number }>> {
    // Get valuation from confirmed replenishments by rubro
    const rows = await query<{ rubro: string; total: string }>(
      `WITH reposiciones_valuacion AS (
        SELECT
          a.rubro_id,
          COALESCE(SUM(rep.stock_disponible * rep.costo_reposicion), 0) as valuacion
        FROM articulos a
        LEFT JOIN reposiciones rep ON rep.articulo_id = a.id
          AND rep.deleted_at IS NULL
          AND rep.estado = 'confirmada'
          AND rep.stock_disponible > 0
        WHERE a.deleted_at IS NULL AND a.activo = true
        GROUP BY a.rubro_id
      ),
      stock_inicial_valuacion AS (
        SELECT
          a.rubro_id,
          COALESCE(SUM(
            CASE
              WHEN a.costo_inicial_estimado IS NOT NULL
              THEN GREATEST(0, a.stock - COALESCE(r.stock_con_reposicion, 0)) * a.costo_inicial_estimado
              ELSE 0
            END
          ), 0) as valuacion
        FROM articulos a
        LEFT JOIN (
          SELECT articulo_id, SUM(stock_disponible) as stock_con_reposicion
          FROM reposiciones
          WHERE deleted_at IS NULL AND estado = 'confirmada'
          GROUP BY articulo_id
        ) r ON r.articulo_id = a.id
        WHERE a.deleted_at IS NULL AND a.activo = true
        GROUP BY a.rubro_id
      )
      SELECT
        rub.nombre as rubro,
        COALESCE(rv.valuacion, 0) + COALESCE(siv.valuacion, 0) as total
      FROM rubros rub
      LEFT JOIN reposiciones_valuacion rv ON rv.rubro_id = rub.id
      LEFT JOIN stock_inicial_valuacion siv ON siv.rubro_id = rub.id
      WHERE rub.deleted_at IS NULL AND rub.activo = true
      ORDER BY total DESC`
    );

    return rows.map((row) => ({
      rubro: row.rubro,
      total: parseFloat(row.total) || 0,
    }));
  }

  async getMovimientosPorMes(meses: number = 6): Promise<Array<{
    mes: string;
    entregas: number;
    reposiciones: number;
  }>> {
    const rows = await query<{
      mes: string;
      entregas: string;
      reposiciones: string;
    }>(
      `WITH meses AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${meses - 1} months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        ) as mes
      ),
      entregas_por_mes AS (
        SELECT
          DATE_TRUNC('month', fecha_entrega) as mes,
          COUNT(*) as total
        FROM entregas
        WHERE deleted_at IS NULL
        AND fecha_entrega >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${meses - 1} months')
        GROUP BY DATE_TRUNC('month', fecha_entrega)
      ),
      reposiciones_por_mes AS (
        SELECT
          DATE_TRUNC('month', fecha_reposicion) as mes,
          COUNT(*) as total
        FROM reposiciones
        WHERE deleted_at IS NULL
        AND fecha_reposicion >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${meses - 1} months')
        GROUP BY DATE_TRUNC('month', fecha_reposicion)
      )
      SELECT
        TO_CHAR(m.mes, 'YYYY-MM') as mes,
        COALESCE(e.total, 0) as entregas,
        COALESCE(r.total, 0) as reposiciones
      FROM meses m
      LEFT JOIN entregas_por_mes e ON e.mes = m.mes
      LEFT JOIN reposiciones_por_mes r ON r.mes = m.mes
      ORDER BY m.mes`
    );

    return rows.map((row) => ({
      mes: row.mes,
      entregas: parseInt(row.entregas, 10),
      reposiciones: parseInt(row.reposiciones, 10),
    }));
  }
}

export const dashboardService = new DashboardService();
