import { useState, useEffect } from 'react';
import { FileText, Download, Users, Truck, Package, ChevronDown, ChevronRight } from 'lucide-react';
import {
  reportesService,
  type EntregasPorClienteItem,
  type ReposicionesPorProveedorItem,
  type ProveedoresPorArticuloItem,
  type ArticulosPorProveedorItem,
  type ResumenMensualItem,
} from '../../services/reportes.service';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type TabType = 'entregas-cliente' | 'reposiciones-proveedor' | 'proveedores-articulo' | 'articulos-proveedor';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('entregas-cliente');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [entregasPorCliente, setEntregasPorCliente] = useState<EntregasPorClienteItem[]>([]);
  const [reposicionesPorProveedor, setReposicionesPorProveedor] = useState<ReposicionesPorProveedorItem[]>([]);
  const [proveedoresPorArticulo, setProveedoresPorArticulo] = useState<ProveedoresPorArticuloItem[]>([]);
  const [articulosPorProveedor, setArticulosPorProveedor] = useState<ArticulosPorProveedorItem[]>([]);
  const [resumenMensual, setResumenMensual] = useState<ResumenMensualItem[]>([]);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [activeTab, mes, anio]);

  useEffect(() => {
    loadResumenMensual();
  }, [anio]);

  const loadData = async () => {
    setIsLoading(true);
    setExpandedRows(new Set());
    try {
      switch (activeTab) {
        case 'entregas-cliente':
          const entregas = await reportesService.getEntregasPorCliente(mes, anio);
          setEntregasPorCliente(entregas);
          break;
        case 'reposiciones-proveedor':
          const reposiciones = await reportesService.getReposicionesPorProveedor(mes, anio);
          setReposicionesPorProveedor(reposiciones);
          break;
        case 'proveedores-articulo':
          const provArticulo = await reportesService.getProveedoresPorArticulo();
          setProveedoresPorArticulo(provArticulo);
          break;
        case 'articulos-proveedor':
          const artProv = await reportesService.getArticulosPorProveedor();
          setArticulosPorProveedor(artProv);
          break;
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const loadResumenMensual = async () => {
    try {
      const resumen = await reportesService.getResumenMensual(anio);
      setResumenMensual(resumen);
    } catch (error) {
      console.error('Error loading resumen mensual:', error);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    switch (activeTab) {
      case 'entregas-cliente':
        filename = `entregas-por-cliente-${MESES[mes - 1]}-${anio}.csv`;
        csvContent = 'Cliente,Total Entregas,Total Artículos\n';
        entregasPorCliente.forEach(item => {
          csvContent += `"${item.razonSocial}",${item.totalEntregas},${item.totalArticulos}\n`;
        });
        break;
      case 'reposiciones-proveedor':
        filename = `reposiciones-por-proveedor-${MESES[mes - 1]}-${anio}.csv`;
        csvContent = 'Proveedor,Total Reposiciones,Total Artículos,Costo Total ARS,Costo Total USD\n';
        reposicionesPorProveedor.forEach(item => {
          csvContent += `"${item.razonSocial}",${item.totalReposiciones},${item.totalArticulos},${item.totalCostoARS.toFixed(2)},${item.totalCostoUSD.toFixed(2)}\n`;
        });
        break;
      case 'proveedores-articulo':
        filename = `proveedores-por-articulo.csv`;
        csvContent = 'Código,Artículo,Proveedor,Total Reposiciones,Última Reposición,Costo Promedio\n';
        proveedoresPorArticulo.forEach(item => {
          item.proveedores.forEach(prov => {
            csvContent += `"${item.articuloCodigo}","${item.articuloNombre}","${prov.razonSocial}",${prov.totalReposiciones},"${prov.ultimaReposicion ? format(new Date(prov.ultimaReposicion), 'dd/MM/yyyy') : '-'}",${prov.costoPromedio.toFixed(2)}\n`;
          });
        });
        break;
      case 'articulos-proveedor':
        filename = `articulos-por-proveedor.csv`;
        csvContent = 'Proveedor,Código,Artículo,Total Reposiciones,Total Cantidad,Última Reposición\n';
        articulosPorProveedor.forEach(item => {
          item.articulos.forEach(art => {
            csvContent += `"${item.razonSocial}","${art.codigo}","${art.nombre}",${art.totalReposiciones},${art.totalCantidad},"${art.ultimaReposicion ? format(new Date(art.ultimaReposicion), 'dd/MM/yyyy') : '-'}"\n`;
          });
        });
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('Reporte exportado');
  };

  const renderFilters = () => {
    const needsMonthFilter = activeTab === 'entregas-cliente' || activeTab === 'reposiciones-proveedor';

    return (
      <div className="flex items-center gap-4 mb-6">
        {needsMonthFilter && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="input w-40"
              >
                {MESES.map((nombre, idx) => (
                  <option key={idx} value={idx + 1}>{nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                className="input w-28"
              >
                {[2024, 2025, 2026, 2027].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="flex-1" />
        <button onClick={exportToCSV} className="btn-secondary">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </button>
      </div>
    );
  };

  const renderEntregasPorCliente = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entregas</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Artículos</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entregasPorCliente.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                No hay entregas en {MESES[mes - 1]} {anio}
              </td>
            </tr>
          ) : (
            entregasPorCliente.map(item => (
              <>
                <tr
                  key={item.clienteId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleRow(item.clienteId)}
                >
                  <td className="px-4 py-3">
                    {expandedRows.has(item.clienteId) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.razonSocial}</td>
                  <td className="px-4 py-3 text-right">{item.totalEntregas}</td>
                  <td className="px-4 py-3 text-right">{item.totalArticulos}</td>
                </tr>
                {expandedRows.has(item.clienteId) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 bg-gray-50">
                      <div className="pl-8">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="px-2 py-1 text-left">Fecha</th>
                              <th className="px-2 py-1 text-left">N° Cotización</th>
                              <th className="px-2 py-1 text-right">Artículos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.entregas.map(e => (
                              <tr key={e.id} className="hover:bg-gray-100">
                                <td className="px-2 py-1">
                                  {format(new Date(e.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </td>
                                <td className="px-2 py-1 font-mono text-primary-600">{e.numeroCotizacion}</td>
                                <td className="px-2 py-1 text-right">{e.cantidadArticulos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderReposicionesPorProveedor = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Repos.</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Artículos</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total ARS</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total USD</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {reposicionesPorProveedor.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No hay reposiciones en {MESES[mes - 1]} {anio}
              </td>
            </tr>
          ) : (
            reposicionesPorProveedor.map(item => (
              <>
                <tr
                  key={item.proveedorId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleRow(item.proveedorId)}
                >
                  <td className="px-4 py-3">
                    {expandedRows.has(item.proveedorId) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.razonSocial}</td>
                  <td className="px-4 py-3 text-right">{item.totalReposiciones}</td>
                  <td className="px-4 py-3 text-right">{item.totalArticulos}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${item.totalCostoARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    USD {item.totalCostoUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {expandedRows.has(item.proveedorId) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 bg-gray-50">
                      <div className="pl-8">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="px-2 py-1 text-left">Fecha</th>
                              <th className="px-2 py-1 text-left">Artículo</th>
                              <th className="px-2 py-1 text-right">Cant.</th>
                              <th className="px-2 py-1 text-right">Costo ARS</th>
                              <th className="px-2 py-1 text-right">Costo USD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.reposiciones.map(r => (
                              <tr key={r.id} className="hover:bg-gray-100">
                                <td className="px-2 py-1">
                                  {format(new Date(r.fecha), 'dd/MM/yyyy', { locale: es })}
                                </td>
                                <td className="px-2 py-1">{r.articuloNombre}</td>
                                <td className="px-2 py-1 text-right">{r.cantidad}</td>
                                <td className="px-2 py-1 text-right">${r.costoARS.toLocaleString('es-AR')}</td>
                                <td className="px-2 py-1 text-right text-gray-600">USD {r.costoUSD.toLocaleString('es-AR')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderProveedoresPorArticulo = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Proveedores</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {proveedoresPorArticulo.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                No hay datos
              </td>
            </tr>
          ) : (
            proveedoresPorArticulo.map(item => (
              <>
                <tr
                  key={item.articuloId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleRow(item.articuloId)}
                >
                  <td className="px-4 py-3">
                    {expandedRows.has(item.articuloId) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{item.articuloCodigo}</td>
                  <td className="px-4 py-3 font-medium">{item.articuloNombre}</td>
                  <td className="px-4 py-3 text-right">{item.proveedores.length}</td>
                </tr>
                {expandedRows.has(item.articuloId) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 bg-gray-50">
                      <div className="pl-8">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="px-2 py-1 text-left">Proveedor</th>
                              <th className="px-2 py-1 text-right">Repos.</th>
                              <th className="px-2 py-1 text-right">Última</th>
                              <th className="px-2 py-1 text-right">Costo Prom.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.proveedores.map(p => (
                              <tr key={p.proveedorId} className="hover:bg-gray-100">
                                <td className="px-2 py-1">{p.razonSocial}</td>
                                <td className="px-2 py-1 text-right">{p.totalReposiciones}</td>
                                <td className="px-2 py-1 text-right">
                                  {p.ultimaReposicion ? format(new Date(p.ultimaReposicion), 'dd/MM/yyyy') : '-'}
                                </td>
                                <td className="px-2 py-1 text-right">${p.costoPromedio.toLocaleString('es-AR')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderArticulosPorProveedor = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Artículos</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {articulosPorProveedor.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                No hay datos
              </td>
            </tr>
          ) : (
            articulosPorProveedor.map(item => (
              <>
                <tr
                  key={item.proveedorId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleRow(item.proveedorId)}
                >
                  <td className="px-4 py-3">
                    {expandedRows.has(item.proveedorId) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.razonSocial}</td>
                  <td className="px-4 py-3 text-right">{item.articulos.length}</td>
                </tr>
                {expandedRows.has(item.proveedorId) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 bg-gray-50">
                      <div className="pl-8">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="px-2 py-1 text-left">Código</th>
                              <th className="px-2 py-1 text-left">Artículo</th>
                              <th className="px-2 py-1 text-right">Repos.</th>
                              <th className="px-2 py-1 text-right">Cant. Total</th>
                              <th className="px-2 py-1 text-right">Última</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.articulos.map(a => (
                              <tr key={a.articuloId} className="hover:bg-gray-100">
                                <td className="px-2 py-1 font-mono">{a.codigo}</td>
                                <td className="px-2 py-1">{a.nombre}</td>
                                <td className="px-2 py-1 text-right">{a.totalReposiciones}</td>
                                <td className="px-2 py-1 text-right">{a.totalCantidad}</td>
                                <td className="px-2 py-1 text-right">
                                  {a.ultimaReposicion ? format(new Date(a.ultimaReposicion), 'dd/MM/yyyy') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderResumenMensual = () => (
    <div className="card p-4 mb-6">
      <h3 className="font-medium text-gray-900 mb-4">Resumen Anual {anio}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="px-3 py-2 text-left">Mes</th>
              <th className="px-3 py-2 text-right">Entregas</th>
              <th className="px-3 py-2 text-right">Reposiciones</th>
              <th className="px-3 py-2 text-right">Costo ARS</th>
              <th className="px-3 py-2 text-right">Costo USD</th>
            </tr>
          </thead>
          <tbody>
            {resumenMensual.map(item => {
              const isCurrentMonth = item.mes === mes;
              return (
                <tr
                  key={item.mes}
                  className={`border-b hover:bg-gray-50 cursor-pointer ${isCurrentMonth ? 'bg-primary-50' : ''}`}
                  onClick={() => setMes(item.mes)}
                >
                  <td className={`px-3 py-2 ${isCurrentMonth ? 'font-medium text-primary-700' : ''}`}>
                    {MESES[item.mes - 1]}
                  </td>
                  <td className="px-3 py-2 text-right">{item.totalEntregas || '-'}</td>
                  <td className="px-3 py-2 text-right">{item.totalReposiciones || '-'}</td>
                  <td className="px-3 py-2 text-right">
                    {item.totalCostoReposicionesARS > 0 ? `$${item.totalCostoReposicionesARS.toLocaleString('es-AR')}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {item.totalCostoReposicionesUSD > 0 ? `USD ${item.totalCostoReposicionesUSD.toLocaleString('es-AR')}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500">Genera y exporta reportes del sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('entregas-cliente')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'entregas-cliente'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Entregas por Cliente
          </button>
          <button
            onClick={() => setActiveTab('reposiciones-proveedor')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reposiciones-proveedor'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Truck className="w-4 h-4" />
            Reposiciones por Proveedor
          </button>
          <button
            onClick={() => setActiveTab('proveedores-articulo')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'proveedores-articulo'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Proveedores por Artículo
          </button>
          <button
            onClick={() => setActiveTab('articulos-proveedor')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'articulos-proveedor'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Truck className="w-4 h-4" />
            Artículos por Proveedor
          </button>
        </nav>
      </div>

      {/* Resumen mensual for date-filtered reports */}
      {(activeTab === 'entregas-cliente' || activeTab === 'reposiciones-proveedor') && renderResumenMensual()}

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Cargando reporte...</p>
          </div>
        ) : (
          <>
            {activeTab === 'entregas-cliente' && renderEntregasPorCliente()}
            {activeTab === 'reposiciones-proveedor' && renderReposicionesPorProveedor()}
            {activeTab === 'proveedores-articulo' && renderProveedoresPorArticulo()}
            {activeTab === 'articulos-proveedor' && renderArticulosPorProveedor()}
          </>
        )}
      </div>
    </div>
  );
}
