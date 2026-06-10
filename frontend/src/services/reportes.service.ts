import api from './api';

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

export interface ResumenMensualItem {
  mes: number;
  totalEntregas: number;
  totalReposiciones: number;
  totalCostoReposicionesARS: number;
  totalCostoReposicionesUSD: number;
}

export const reportesService = {
  async getEntregasPorCliente(mes: number, anio: number): Promise<EntregasPorClienteItem[]> {
    const response = await api.get<{ data: EntregasPorClienteItem[] }>('/reportes/entregas-por-cliente', {
      params: { mes, anio },
    });
    return response.data.data;
  },

  async getReposicionesPorProveedor(mes: number, anio: number): Promise<ReposicionesPorProveedorItem[]> {
    const response = await api.get<{ data: ReposicionesPorProveedorItem[] }>('/reportes/reposiciones-por-proveedor', {
      params: { mes, anio },
    });
    return response.data.data;
  },

  async getProveedoresPorArticulo(): Promise<ProveedoresPorArticuloItem[]> {
    const response = await api.get<{ data: ProveedoresPorArticuloItem[] }>('/reportes/proveedores-por-articulo');
    return response.data.data;
  },

  async getArticulosPorProveedor(): Promise<ArticulosPorProveedorItem[]> {
    const response = await api.get<{ data: ArticulosPorProveedorItem[] }>('/reportes/articulos-por-proveedor');
    return response.data.data;
  },

  async getResumenMensual(anio: number): Promise<ResumenMensualItem[]> {
    const response = await api.get<{ data: ResumenMensualItem[] }>('/reportes/resumen-mensual', {
      params: { anio },
    });
    return response.data.data;
  },
};
