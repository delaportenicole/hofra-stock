import { query } from '../config/database.js';
import { toCamelCase } from '../types/index.js';

export interface EntregasPorClienteItem {
  clienteId: string;
  razonSocial: string;
  totalEntregas: number;
  totalArticulos: number;
  entregas: Array<{
    id: string;
    fecha: string;
    numeroCotizacion: string;
    cantidadArticulos: number;
  }>;
}

export interface ReposicionesPorProveedorItem {
  proveedorId: string;
  razonSocial: string;
  totalReposiciones: number;
  totalArticulos: number;
  totalCostoARS: number;
  totalCostoUSD: number;
  reposiciones: Array<{
    id: string;
    fecha: string;
    articuloNombre: string;
    cantidad: number;
    costoARS: number;
    costoUSD: number;
  }>;
}

export interface ProveedoresPorArticuloItem {
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  proveedores: Array<{
    proveedorId: string;
    razonSocial: string;
    totalReposiciones: number;
    ultimaReposicion: string;
    costoPromedio: number;
  }>;
}

export interface ArticulosPorProveedorItem {
  proveedorId: string;
  razonSocial: string;
  articulos: Array<{
    articuloId: string;
    codigo: string;
    nombre: string;
    totalReposiciones: number;
    totalCantidad: number;
    ultimaReposicion: string;
  }>;
}

export interface ReporteFiltros {
  mes: number;
  anio: number;
}

class ReportesService {
  // Entregas por Cliente (mes específico)
  async getEntregasPorCliente(filtros: ReporteFiltros): Promise<EntregasPorClienteItem[]> {
    const { mes, anio } = filtros;
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

    const rows = await query<Record<string, unknown>>(
      `SELECT
        c.id as cliente_id,
        c.razon_social,
        COUNT(DISTINCT e.id) as total_entregas,
        COALESCE(SUM(ei.cantidad), 0) as total_articulos,
        json_agg(
          json_build_object(
            'id', e.id,
            'fecha', e.fecha_entrega,
            'numeroCotizacion', e.numero_cotizacion_interna,
            'cantidadArticulos', (SELECT COALESCE(SUM(cantidad), 0) FROM entrega_items WHERE entrega_id = e.id)
          ) ORDER BY e.fecha_entrega DESC
        ) FILTER (WHERE e.id IS NOT NULL) as entregas
      FROM clientes c
      LEFT JOIN entregas e ON e.cliente_id = c.id
        AND e.fecha_entrega >= $1
        AND e.fecha_entrega <= $2
        AND e.deleted_at IS NULL
      LEFT JOIN entrega_items ei ON ei.entrega_id = e.id
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.razon_social
      HAVING COUNT(DISTINCT e.id) > 0
      ORDER BY total_entregas DESC`,
      [primerDia, ultimaFecha]
    );

    return rows.map(row => ({
      clienteId: row.cliente_id as string,
      razonSocial: row.razon_social as string,
      totalEntregas: parseInt(row.total_entregas as string) || 0,
      totalArticulos: parseInt(row.total_articulos as string) || 0,
      entregas: (row.entregas as Array<Record<string, unknown>> || []).map(e => ({
        id: e.id as string,
        fecha: e.fecha as string,
        numeroCotizacion: e.numeroCotizacion as string,
        cantidadArticulos: parseInt(e.cantidadArticulos as string) || 0,
      })),
    }));
  }

  // Reposiciones por Proveedor (mes específico)
  async getReposicionesPorProveedor(filtros: ReporteFiltros): Promise<ReposicionesPorProveedorItem[]> {
    const { mes, anio } = filtros;
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

    const rows = await query<Record<string, unknown>>(
      `SELECT
        p.id as proveedor_id,
        p.razon_social,
        COUNT(r.id) as total_reposiciones,
        COALESCE(SUM(r.cantidad), 0) as total_articulos,
        COALESCE(SUM(r.costo_reposicion * r.cantidad), 0) as total_costo_ars,
        COALESCE(SUM(r.costo_reposicion_dolares * r.cantidad), 0) as total_costo_usd,
        json_agg(
          json_build_object(
            'id', r.id,
            'fecha', r.fecha_reposicion,
            'articuloNombre', a.nombre,
            'cantidad', r.cantidad,
            'costoARS', r.costo_reposicion,
            'costoUSD', r.costo_reposicion_dolares
          ) ORDER BY r.fecha_reposicion DESC
        ) FILTER (WHERE r.id IS NOT NULL) as reposiciones
      FROM proveedores p
      LEFT JOIN reposiciones r ON r.proveedor_id = p.id
        AND r.fecha_reposicion >= $1
        AND r.fecha_reposicion <= $2
        AND r.deleted_at IS NULL
        AND r.estado = 'confirmada'
      LEFT JOIN articulos a ON a.id = r.articulo_id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id, p.razon_social
      HAVING COUNT(r.id) > 0
      ORDER BY total_costo_ars DESC`,
      [primerDia, ultimaFecha]
    );

    return rows.map(row => ({
      proveedorId: row.proveedor_id as string,
      razonSocial: row.razon_social as string,
      totalReposiciones: parseInt(row.total_reposiciones as string) || 0,
      totalArticulos: parseInt(row.total_articulos as string) || 0,
      totalCostoARS: parseFloat(row.total_costo_ars as string) || 0,
      totalCostoUSD: parseFloat(row.total_costo_usd as string) || 0,
      reposiciones: (row.reposiciones as Array<Record<string, unknown>> || []).map(r => ({
        id: r.id as string,
        fecha: r.fecha as string,
        articuloNombre: r.articuloNombre as string,
        cantidad: parseInt(r.cantidad as string) || 0,
        costoARS: parseFloat(r.costoARS as string) || 0,
        costoUSD: parseFloat(r.costoUSD as string) || 0,
      })),
    }));
  }

  // Proveedores por Artículo (histórico - no filtrado por mes)
  async getProveedoresPorArticulo(): Promise<ProveedoresPorArticuloItem[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT
        a.id as articulo_id,
        a.codigo as articulo_codigo,
        a.nombre as articulo_nombre,
        json_agg(
          json_build_object(
            'proveedorId', p.id,
            'razonSocial', p.razon_social,
            'totalReposiciones', sub.total_reposiciones,
            'ultimaReposicion', sub.ultima_reposicion,
            'costoPromedio', sub.costo_promedio
          ) ORDER BY sub.total_reposiciones DESC
        ) as proveedores
      FROM articulos a
      INNER JOIN (
        SELECT
          r.articulo_id,
          r.proveedor_id,
          COUNT(*) as total_reposiciones,
          MAX(r.fecha_reposicion) as ultima_reposicion,
          AVG(r.costo_reposicion) as costo_promedio
        FROM reposiciones r
        WHERE r.deleted_at IS NULL AND r.estado = 'confirmada'
        GROUP BY r.articulo_id, r.proveedor_id
      ) sub ON sub.articulo_id = a.id
      INNER JOIN proveedores p ON p.id = sub.proveedor_id AND p.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
      GROUP BY a.id, a.codigo, a.nombre
      ORDER BY a.nombre`,
      []
    );

    return rows.map(row => ({
      articuloId: row.articulo_id as string,
      articuloCodigo: row.articulo_codigo as string,
      articuloNombre: row.articulo_nombre as string,
      proveedores: (row.proveedores as Array<Record<string, unknown>> || []).map(p => ({
        proveedorId: p.proveedorId as string,
        razonSocial: p.razonSocial as string,
        totalReposiciones: parseInt(p.totalReposiciones as string) || 0,
        ultimaReposicion: p.ultimaReposicion as string,
        costoPromedio: parseFloat(p.costoPromedio as string) || 0,
      })),
    }));
  }

  // Artículos por Proveedor (histórico - no filtrado por mes)
  async getArticulosPorProveedor(): Promise<ArticulosPorProveedorItem[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT
        p.id as proveedor_id,
        p.razon_social,
        json_agg(
          json_build_object(
            'articuloId', a.id,
            'codigo', a.codigo,
            'nombre', a.nombre,
            'totalReposiciones', sub.total_reposiciones,
            'totalCantidad', sub.total_cantidad,
            'ultimaReposicion', sub.ultima_reposicion
          ) ORDER BY a.nombre
        ) as articulos
      FROM proveedores p
      INNER JOIN (
        SELECT
          r.proveedor_id,
          r.articulo_id,
          COUNT(*) as total_reposiciones,
          SUM(r.cantidad) as total_cantidad,
          MAX(r.fecha_reposicion) as ultima_reposicion
        FROM reposiciones r
        WHERE r.deleted_at IS NULL AND r.estado = 'confirmada'
        GROUP BY r.proveedor_id, r.articulo_id
      ) sub ON sub.proveedor_id = p.id
      INNER JOIN articulos a ON a.id = sub.articulo_id AND a.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      GROUP BY p.id, p.razon_social
      ORDER BY p.razon_social`,
      []
    );

    return rows.map(row => ({
      proveedorId: row.proveedor_id as string,
      razonSocial: row.razon_social as string,
      articulos: (row.articulos as Array<Record<string, unknown>> || []).map(a => ({
        articuloId: a.articuloId as string,
        codigo: a.codigo as string,
        nombre: a.nombre as string,
        totalReposiciones: parseInt(a.totalReposiciones as string) || 0,
        totalCantidad: parseInt(a.totalCantidad as string) || 0,
        ultimaReposicion: a.ultimaReposicion as string,
      })),
    }));
  }

  // Resumen mensual para comparación rápida
  async getResumenMensual(anio: number): Promise<Array<{
    mes: number;
    totalEntregas: number;
    totalReposiciones: number;
    totalCostoReposicionesARS: number;
    totalCostoReposicionesUSD: number;
  }>> {
    const rows = await query<Record<string, unknown>>(
      `SELECT
        EXTRACT(MONTH FROM fecha)::int as mes,
        tipo,
        COUNT(*) as total,
        COALESCE(SUM(costo_ars), 0) as costo_ars,
        COALESCE(SUM(costo_usd), 0) as costo_usd
      FROM (
        SELECT fecha_entrega as fecha, 'entrega' as tipo, 0 as costo_ars, 0 as costo_usd
        FROM entregas
        WHERE EXTRACT(YEAR FROM fecha_entrega) = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT fecha_reposicion as fecha, 'reposicion' as tipo,
               costo_reposicion * cantidad as costo_ars,
               COALESCE(costo_reposicion_dolares * cantidad, 0) as costo_usd
        FROM reposiciones
        WHERE EXTRACT(YEAR FROM fecha_reposicion) = $1
          AND deleted_at IS NULL
          AND estado = 'confirmada'
      ) movimientos
      GROUP BY mes, tipo
      ORDER BY mes`,
      [anio]
    );

    // Agrupar por mes
    const mesesMap = new Map<number, {
      mes: number;
      totalEntregas: number;
      totalReposiciones: number;
      totalCostoReposicionesARS: number;
      totalCostoReposicionesUSD: number;
    }>();

    for (let m = 1; m <= 12; m++) {
      mesesMap.set(m, {
        mes: m,
        totalEntregas: 0,
        totalReposiciones: 0,
        totalCostoReposicionesARS: 0,
        totalCostoReposicionesUSD: 0,
      });
    }

    for (const row of rows) {
      const mes = row.mes as number;
      const tipo = row.tipo as string;
      const total = parseInt(row.total as string) || 0;
      const costoARS = parseFloat(row.costo_ars as string) || 0;
      const costoUSD = parseFloat(row.costo_usd as string) || 0;

      const data = mesesMap.get(mes)!;
      if (tipo === 'entrega') {
        data.totalEntregas = total;
      } else {
        data.totalReposiciones = total;
        data.totalCostoReposicionesARS = costoARS;
        data.totalCostoReposicionesUSD = costoUSD;
      }
    }

    return Array.from(mesesMap.values());
  }
}

export const reportesService = new ReportesService();
