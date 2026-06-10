import api from './api';
import type { DashboardStats, MovimientoReciente, ArticuloStockBajo } from '@hofra/shared';

export interface DashboardData {
  stats: DashboardStats;
  movimientosRecientes: MovimientoReciente[];
  articulosStockBajo: ArticuloStockBajo[];
  stockPorRubro: Array<{ rubro: string; total: number }>;
  movimientosPorMes: Array<{ mes: string; entregas: number; reposiciones: number }>;
}

export const dashboardService = {
  async getAll(): Promise<DashboardData> {
    const response = await api.get<{ data: DashboardData }>('/dashboard');
    return response.data.data;
  },

  async getStats(): Promise<DashboardStats> {
    const response = await api.get<{ data: DashboardStats }>('/dashboard/stats');
    return response.data.data;
  },

  async getMovimientosRecientes(limit?: number): Promise<MovimientoReciente[]> {
    const response = await api.get<{ data: MovimientoReciente[] }>(
      '/dashboard/movimientos-recientes',
      { params: { limit } }
    );
    return response.data.data;
  },

  async getArticulosStockBajo(limit?: number): Promise<ArticuloStockBajo[]> {
    const response = await api.get<{ data: ArticuloStockBajo[] }>(
      '/dashboard/articulos-stock-bajo',
      { params: { limit } }
    );
    return response.data.data;
  },

  async getStockPorRubro(): Promise<Array<{ rubro: string; total: number }>> {
    const response = await api.get<{ data: Array<{ rubro: string; total: number }> }>(
      '/dashboard/stock-por-rubro'
    );
    return response.data.data;
  },

  async getMovimientosPorMes(meses?: number): Promise<Array<{ mes: string; entregas: number; reposiciones: number }>> {
    const response = await api.get<{ data: Array<{ mes: string; entregas: number; reposiciones: number }> }>(
      '/dashboard/movimientos-por-mes',
      { params: { meses } }
    );
    return response.data.data;
  },
};
