import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, ArrowUpFromLine, ArrowDownToLine, Package, AlertTriangle, ExternalLink, DollarSign, ChevronDown } from 'lucide-react';
import { format, isPast, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { articulosService, type ArticuloHistorial } from '../../services/articulos.service';
import { PageLoader } from '../../components/LoadingSpinner';
import { Badge, StockBadge, StatusBadge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { ArticuloConRelaciones, ReposicionConRelaciones, EstadoReposicion, ValuacionStock } from '@hofra/shared';

const estadoLabels: Record<EstadoReposicion, string> = {
  en_curso: 'En Curso',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

const estadoVariants: Record<EstadoReposicion, 'warning' | 'success' | 'secondary'> = {
  en_curso: 'warning',
  confirmada: 'success',
  cancelada: 'secondary',
};

export function ArticuloDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [articulo, setArticulo] = useState<ArticuloConRelaciones | null>(null);
  const [historial, setHistorial] = useState<ArticuloHistorial | null>(null);
  const [valuacion, setValuacion] = useState<ValuacionStock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [moreInfoExpanded, setMoreInfoExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [articuloData, historialData, valuacionData] = await Promise.all([
        articulosService.getById(id!),
        articulosService.getHistorial(id!, 20),
        articulosService.getValuacion(id!),
      ]);
      setArticulo(articuloData);
      setHistorial(historialData);
      setValuacion(valuacionData);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/articulos');
    } finally {
      setIsLoading(false);
    }
  };

  const getVencimientoStatus = (fecha: Date | string | null) => {
    if (!fecha) return null;
    const date = new Date(fecha);
    if (isPast(date)) return 'vencido';
    if (isPast(addDays(date, -30))) return 'proximo';
    return 'ok';
  };

  if (isLoading) return <PageLoader />;
  if (!articulo) return null;

  // Combine and sort movements (todas las reposiciones)
  const movimientos = [
    ...historial!.entregas.map((e) => ({
      id: e.id,
      tipo: 'entrega' as const,
      cantidad: e.items.reduce((sum, item) => sum + item.cantidad, 0),
      fecha: new Date(e.fechaEntrega),
      tercero: e.cliente.razonSocial,
      observaciones: e.observaciones,
      estado: null as EstadoReposicion | null,
    })),
    ...historial!.reposiciones.map((r) => ({
      id: r.id,
      tipo: 'reposicion' as const,
      cantidad: r.cantidad,
      fecha: new Date(r.fechaReposicion),
      tercero: r.proveedor.razonSocial,
      observaciones: r.observaciones,
      estado: r.estado as EstadoReposicion | null,
    })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  // Solo reposiciones confirmadas para la sección de stock
  const reposicionesConfirmadas = historial!.reposiciones.filter(r => r.estado === 'confirmada');

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/articulos')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{articulo.nombre}</h1>
        </div>
        <PermissionGuard modulo="articulos" accion="actualizar">
          <Link to={`/articulos/${id}/editar`} className="btn-primary">
            <Edit className="w-5 h-5 mr-2" />
            Editar
          </Link>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Artículo
            </h2>

            {/* Sección fija */}
            <dl className="space-y-4">
              {/* Línea 1: Código, SKU, ETM */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Código</dt>
                  <dd className="font-mono font-medium">{articulo.codigo}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">SKU</dt>
                  <dd className="font-mono">{articulo.sku || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">ETM</dt>
                  <dd className="font-mono">{articulo.etm || '-'}</dd>
                </div>
              </div>

              {/* Línea 2: Nombre */}
              <div>
                <dt className="text-sm text-gray-500">Nombre</dt>
                <dd className="font-medium">{articulo.nombre}</dd>
              </div>

              {/* Línea 3: Descripción */}
              <div>
                <dt className="text-sm text-gray-500">Descripción</dt>
                <dd>{articulo.descripcion || '-'}</dd>
              </div>

              {/* Línea 4: Unidad, Presentación, Estado */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Unidad</dt>
                  <dd>{articulo.unidad}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Presentación</dt>
                  <dd>{articulo.presentacion || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Estado</dt>
                  <dd><StatusBadge activo={articulo.activo} /></dd>
                </div>
              </div>
            </dl>

            {/* Sección expandible - Más Info */}
            <div className="mt-4 border-t pt-4">
              <button
                onClick={() => setMoreInfoExpanded(!moreInfoExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${moreInfoExpanded ? 'rotate-180' : ''}`} />
                Más Info
              </button>

              {moreInfoExpanded && (
                <dl className="space-y-4 mt-4">
                  {/* Línea 1: Stock Actual, Stock Mínimo, Costo Inicial Estimado */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Stock Actual</dt>
                      <dd className="font-semibold text-lg">{articulo.stock}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Stock Mínimo</dt>
                      <dd>{articulo.stockMinimo}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Costo Inicial Estimado</dt>
                      <dd>
                        {articulo.costoInicialEstimado ? (
                          <div className="space-y-0.5">
                            <div>${articulo.costoInicialEstimado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                            {articulo.costoInicialEstimadoUsd && (
                              <div className="text-xs text-gray-500">
                                USD {articulo.costoInicialEstimadoUsd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                {articulo.valorDolarCostoInicial && (
                                  <span className="ml-1">(TC: ${articulo.valorDolarCostoInicial})</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </dd>
                    </div>
                  </div>

                  {/* Línea 2: Rubro, Proveedor */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Rubro</dt>
                      <dd><Badge variant="primary">{articulo.rubro.nombre}</Badge></dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Proveedor</dt>
                      <dd>{articulo.proveedor?.razonSocial || '-'}</dd>
                    </div>
                  </div>

                  {/* Línea 3: Marca, Ubicación */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Marca</dt>
                      <dd>{articulo.marca || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Ubicación</dt>
                      <dd>{articulo.ubicacion || '-'}</dd>
                    </div>
                  </div>
                </dl>
              )}
            </div>
          </div>

          {/* Stock por Reposicion (solo confirmadas) */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Stock por Reposicion
              </h2>
            </div>
            {reposicionesConfirmadas.length === 0 ? (
              <p className="px-6 py-4 text-gray-500 text-sm">
                No hay reposiciones confirmadas para este articulo
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cant.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reposicionesConfirmadas.map((rep) => {
                      const vencStatus = getVencimientoStatus(rep.fechaVencimiento);
                      return (
                        <tr
                          key={rep.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => openInNewTab(`/reposiciones/${rep.id}`)}
                        >
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {format(new Date(rep.fechaReposicion), 'dd/MM/yyyy', { locale: es })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="success">+{rep.cantidad}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {rep.costoReposicion ? (
                              <div>
                                <p className="font-medium">${rep.costoReposicion.toLocaleString('es-AR')}</p>
                                {rep.costoReposicionDolares && (
                                  <p className="text-xs text-gray-500">USD {rep.costoReposicionDolares}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">
                            {rep.lotePartida || <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {rep.fechaVencimiento ? (
                              <div className="flex items-center gap-1">
                                {vencStatus === 'vencido' && (
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                )}
                                {vencStatus === 'proximo' && (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                )}
                                <span
                                  className={
                                    vencStatus === 'vencido'
                                      ? 'text-red-600 font-medium'
                                      : vencStatus === 'proximo'
                                      ? 'text-yellow-600'
                                      : ''
                                  }
                                >
                                  {format(new Date(rep.fechaVencimiento), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {rep.proveedor.razonSocial}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Movimientos */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Historial de Movimientos
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {movimientos.length === 0 ? (
                <p className="px-6 py-4 text-gray-500 text-sm">
                  No hay movimientos registrados
                </p>
              ) : (
                movimientos.map((mov) => {
                  const getReposicionBadge = () => {
                    if (mov.estado === 'confirmada') return { variant: 'success' as const, prefix: '+' };
                    if (mov.estado === 'en_curso') return { variant: 'warning' as const, prefix: '' };
                    return { variant: 'secondary' as const, prefix: '' };
                  };
                  const badge = mov.tipo === 'reposicion' ? getReposicionBadge() : { variant: 'danger' as const, prefix: '-' };
                  const url = mov.tipo === 'reposicion' ? `/reposiciones/${mov.id}` : `/entregas/${mov.id}`;

                  return (
                    <div
                      key={mov.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => openInNewTab(url)}
                    >
                      <div className="flex items-center gap-3">
                        {mov.tipo === 'entrega' ? (
                          <ArrowUpFromLine className="w-5 h-5 text-red-500" />
                        ) : (
                          <ArrowDownToLine className={`w-5 h-5 ${
                            mov.estado === 'confirmada' ? 'text-green-500' :
                            mov.estado === 'en_curso' ? 'text-yellow-500' : 'text-gray-400'
                          }`} />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {mov.tipo === 'entrega' ? 'Entrega' : 'Reposicion'}: {mov.tercero}
                            </p>
                            {mov.tipo === 'reposicion' && mov.estado && (
                              <Badge variant={estadoVariants[mov.estado]} className="text-xs">
                                {estadoLabels[mov.estado]}
                              </Badge>
                            )}
                          </div>
                          {mov.observaciones && (
                            <p className="text-sm text-gray-500">{mov.observaciones}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={badge.variant}>
                          {badge.prefix}{mov.cantidad}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(mov.fecha, 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Card */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock</h3>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">{articulo.stock}</p>
              <p className="text-sm text-gray-500 mt-1">{articulo.unidad}</p>
              <div className="mt-3">
                <StockBadge stock={articulo.stock} stockMinimo={articulo.stockMinimo} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <PermissionGuard modulo="reposiciones" accion="crear">
                <Link
                  to={`/reposiciones/nueva?articuloId=${articulo.id}`}
                  className="btn-success btn-sm justify-center"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-1" />
                  Reponer
                </Link>
              </PermissionGuard>
              <PermissionGuard modulo="entregas" accion="crear">
                <Link
                  to={`/entregas/nueva?articuloId=${articulo.id}`}
                  className="btn-danger btn-sm justify-center"
                >
                  <ArrowUpFromLine className="w-4 h-4 mr-1" />
                  Entregar
                </Link>
              </PermissionGuard>
            </div>
          </div>

          {/* Valuación de Stock */}
          {valuacion && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Valuación del Stock</h3>
              </div>

              <div className="space-y-4">
                {/* Valor Total */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Valor Total del Stock</p>
                  <p className="text-2xl font-bold text-green-800">
                    ${valuacion.valorTotalARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  {valuacion.valorTotalUSD && valuacion.valorTotalUSD > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      ≈ USD {valuacion.valorTotalUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                {/* Costo Promedio */}
                {valuacion.costoPromedioARS && (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500">Costo Promedio Unitario</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${valuacion.costoPromedioARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                {/* Desglose */}
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stock con reposición:</span>
                    <span className="font-medium">{valuacion.stockConCosto} unidades</span>
                  </div>
                  {valuacion.stockSinCosto > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stock inicial (estimado):</span>
                      <span className="font-medium">{valuacion.stockSinCosto} unidades</span>
                    </div>
                  )}
                  {valuacion.stockSinCosto > 0 && !valuacion.costoInicialEstimado && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                      <p className="text-xs text-yellow-700">
                        Hay {valuacion.stockSinCosto} unidades sin costo asignado.
                        <Link to={`/articulos/${articulo.id}/editar`} className="ml-1 underline">
                          Asignar costo inicial estimado
                        </Link>
                      </p>
                    </div>
                  )}
                </div>

                {/* Capas de Stock */}
                {valuacion.capas.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">Detalle por Reposición (FIFO)</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {valuacion.capas.map((capa, index) => (
                        <div
                          key={capa.reposicionId}
                          className="flex justify-between items-center text-xs bg-gray-50 rounded p-2"
                        >
                          <div>
                            <span className="font-medium">{capa.stockDisponible} u</span>
                            <span className="text-gray-400 ml-1">
                              × ${capa.costoUnitario.toLocaleString('es-AR')}
                            </span>
                          </div>
                          <span className="font-medium text-green-600">
                            ${capa.valorCapa.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image */}
          {articulo.imagenUrl && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Imagen</h3>
              <img
                src={articulo.imagenUrl}
                alt={articulo.nombre}
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
