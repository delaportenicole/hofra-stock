import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, XCircle, CheckCircle, Package, DollarSign, Calendar, ExternalLink, MapPin, History, User, Clock } from 'lucide-react';
import { format, isPast, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { stockService } from '../../services/stock.service';
import { PageLoader } from '../../components/LoadingSpinner';
import { Badge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { ReposicionConRelaciones, EstadoReposicion, AuditLogConUsuario } from '@hofra/shared';

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

const accionLabels: Record<string, string> = {
  crear: 'Creacion',
  actualizar: 'Actualizacion',
  eliminar: 'Eliminacion',
};

const formatFieldName = (field: string): string => {
  const fieldLabels: Record<string, string> = {
    estado: 'Estado',
    proveedorId: 'Proveedor',
    costoReposicion: 'Costo (ARS)',
    valorDolarOficial: 'Valor Dolar',
    fechaVencimiento: 'Fecha Vencimiento',
    lotePartida: 'Lote/Partida',
    lugarCompra: 'Lugar de Compra',
    linkCompra: 'Link de Compra',
    observaciones: 'Observaciones',
    stockIncrementado: 'Stock incrementado',
    stockDescontado: 'Stock descontado',
    articuloId: 'Articulo',
    cantidad: 'Cantidad',
  };
  return fieldLabels[field] || field;
};

const formatFieldValue = (field: string, value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (field === 'estado') {
    const estados: Record<string, string> = {
      en_curso: 'En Curso',
      confirmada: 'Confirmada',
      cancelada: 'Cancelada',
    };
    return estados[value as string] || String(value);
  }
  if (field === 'costoReposicion' || field === 'valorDolarOficial') {
    return `$${Number(value).toLocaleString('es-AR')}`;
  }
  if (field === 'fechaVencimiento' && value) {
    return format(new Date(value as string), 'dd/MM/yyyy');
  }
  if (field === 'stockIncrementado' || field === 'stockDescontado') {
    return `${value} unidades`;
  }
  return String(value);
};

export function ReposicionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [reposicion, setReposicion] = useState<ReposicionConRelaciones | null>(null);
  const [historial, setHistorial] = useState<AuditLogConUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReposicion();
  }, [id]);

  const loadReposicion = async () => {
    try {
      const [data, historialData] = await Promise.all([
        stockService.getReposicionById(id!),
        stockService.getReposicionHistorial(id!),
      ]);
      setReposicion(data);
      setHistorial(historialData);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/reposiciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      await stockService.confirmReposicion(id!);
      toast.success('Reposicion confirmada');
      loadReposicion();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = async () => {
    if (!reposicion) return;

    const mensaje = reposicion.estado === 'confirmada'
      ? `¿Esta seguro de cancelar esta reposicion?\n\nEl stock se descontara en ${reposicion.cantidad} unidades.`
      : `¿Esta seguro de cancelar esta reposicion?\n\nEl stock no sera afectado (la reposicion aun no estaba confirmada).`;

    if (!confirm(mensaje)) {
      return;
    }

    try {
      await stockService.cancelReposicion(id!);
      toast.success('Reposicion cancelada');
      loadReposicion();
    } catch (error) {
      toast.error(getErrorMessage(error));
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
  if (!reposicion) return null;

  const vencStatus = getVencimientoStatus(reposicion.fechaVencimiento);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reposiciones')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle de Reposicion</h1>
            <p className="text-sm text-gray-500">
              {format(new Date(reposicion.fechaReposicion), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </p>
          </div>
        </div>
        {reposicion.estado === 'en_curso' && (
          <div className="flex gap-2">
            <PermissionGuard modulo="reposiciones" accion="actualizar">
              <Link to={`/reposiciones/${id}/editar`} className="btn-secondary">
                <Edit className="w-5 h-5 mr-2" />
                Editar
              </Link>
              <button onClick={handleConfirm} className="btn-success">
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmar
              </button>
              <button onClick={handleCancel} className="btn-danger">
                <XCircle className="w-5 h-5 mr-2" />
                Cancelar
              </button>
            </PermissionGuard>
          </div>
        )}
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2">
        <Badge variant={estadoVariants[reposicion.estado]} className="text-sm px-3 py-1">
          {estadoLabels[reposicion.estado]}
        </Badge>
        {reposicion.estado === 'cancelada' && (
          <span className="text-sm text-gray-500">
            Esta reposicion fue cancelada. El stock fue descontado.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Articulo */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Articulo</h2>
            </div>
            <div className="flex gap-4">
              {reposicion.articulo.imagenUrl && (
                <img
                  src={reposicion.articulo.imagenUrl}
                  alt={reposicion.articulo.nombre}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <p className="font-mono text-sm text-gray-500">{reposicion.articulo.codigo}</p>
                <p className="text-lg font-semibold">{reposicion.articulo.nombre}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                  <span>Stock actual: <strong>{reposicion.articulo.stock}</strong></span>
                  <span>Unidad: {reposicion.articulo.unidad}</span>
                </div>
                <Link
                  to={`/articulos/${reposicion.articuloId}`}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  Ver articulo <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Costos */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Costos</h2>
            </div>

            {/* Cantidad */}
            <div className="mb-6">
              <dt className="text-sm text-gray-500">Cantidad de artículos</dt>
              <dd className="text-2xl font-bold text-green-600">+{reposicion.cantidad} unidades</dd>
            </div>

            {/* Costos Unitarios */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">Costo Unitario (por artículo)</h3>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Costo Unitario (ARS)</dt>
                  <dd className="text-xl font-semibold">
                    {reposicion.costoReposicion
                      ? `$${reposicion.costoReposicion.toLocaleString('es-AR')}`
                      : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Valor Dólar</dt>
                  <dd className="text-xl font-semibold">
                    {reposicion.valorDolarOficial
                      ? `$${reposicion.valorDolarOficial.toLocaleString('es-AR')}`
                      : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Costo Unitario (USD)</dt>
                  <dd className="text-xl font-semibold text-blue-600">
                    {reposicion.costoReposicionDolares
                      ? `USD ${reposicion.costoReposicionDolares}`
                      : '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Importe Total */}
            {reposicion.costoReposicion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-700 mb-3">Importe Total de Reposición</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-blue-600">Total (ARS)</dt>
                    <dd className="text-2xl font-bold text-blue-900">
                      ${(reposicion.costoReposicion * reposicion.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </dd>
                  </div>
                  {reposicion.costoReposicionDolares && (
                    <div>
                      <dt className="text-sm text-blue-600">Total (USD)</dt>
                      <dd className="text-2xl font-bold text-blue-900">
                        USD {(reposicion.costoReposicionDolares * reposicion.cantidad).toFixed(2)}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="text-xs text-blue-500 mt-2">
                  = {reposicion.cantidad} unidades × ${reposicion.costoReposicion.toLocaleString('es-AR')} c/u
                </p>
              </div>
            )}
          </div>

          {/* Lote y Vencimiento */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Lote y Vencimiento</h2>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Lote / Partida</dt>
                <dd className="font-mono text-lg">{reposicion.lotePartida || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Fecha de Vencimiento</dt>
                <dd className={`text-lg ${
                  vencStatus === 'vencido' ? 'text-red-600 font-semibold' :
                  vencStatus === 'proximo' ? 'text-yellow-600' : ''
                }`}>
                  {reposicion.fechaVencimiento
                    ? format(new Date(reposicion.fechaVencimiento), 'dd/MM/yyyy')
                    : '-'}
                  {vencStatus === 'vencido' && <span className="ml-2 text-sm">(Vencido)</span>}
                  {vencStatus === 'proximo' && <span className="ml-2 text-sm">(Proximo a vencer)</span>}
                </dd>
              </div>
            </dl>
          </div>

          {/* Informacion de Compra */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Informacion de Compra</h2>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Lugar de Compra</dt>
                <dd className="text-lg">{reposicion.lugarCompra || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Link de Compra</dt>
                <dd>
                  {reposicion.linkCompra ? (
                    <a
                      href={reposicion.linkCompra}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      Ver documento <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
            </dl>
            {reposicion.observaciones && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm text-gray-500 mb-1">Observaciones</dt>
                <dd className="text-gray-700 whitespace-pre-wrap">{reposicion.observaciones}</dd>
              </div>
            )}
          </div>

          {/* Historial de Cambios */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Historial de Cambios</h2>
            </div>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-500">No hay cambios registrados</p>
            ) : (
              <div className="space-y-4">
                {historial.map((log) => (
                  <div key={log.id} className="border-l-2 border-gray-200 pl-4 pb-4 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.accion === 'crear' ? 'success' : 'primary'}>
                          {accionLabels[log.accion] || log.accion}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    </div>

                    {/* Usuario */}
                    <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>
                        {log.usuario
                          ? `${log.usuario.nombre} ${log.usuario.apellido}`
                          : 'Sistema'}
                      </span>
                    </div>

                    {/* Cambios realizados */}
                    {log.datosNuevos && Object.keys(log.datosNuevos).length > 0 && (
                      <div className="mt-2 text-sm">
                        {Object.entries(log.datosNuevos).map(([field, newValue]) => {
                          const oldValue = log.datosAnteriores?.[field];
                          const hasOldValue = oldValue !== undefined && oldValue !== null;

                          return (
                            <div key={field} className="py-1">
                              <span className="text-gray-500">{formatFieldName(field)}:</span>{' '}
                              {hasOldValue && log.accion === 'actualizar' ? (
                                <>
                                  <span className="text-red-500 line-through">
                                    {formatFieldValue(field, oldValue)}
                                  </span>
                                  {' → '}
                                  <span className="text-green-600 font-medium">
                                    {formatFieldValue(field, newValue)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-900 font-medium">
                                  {formatFieldValue(field, newValue)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Proveedor */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Proveedor</h3>
            <p className="font-semibold">{reposicion.proveedor.razonSocial}</p>
            {reposicion.proveedor.nombreFantasia && (
              <p className="text-sm text-gray-500">{reposicion.proveedor.nombreFantasia}</p>
            )}
            {reposicion.proveedor.cuit && (
              <p className="text-sm text-gray-500 mt-1">CUIT: {reposicion.proveedor.cuit}</p>
            )}
            <Link
              to={`/proveedores/${reposicion.proveedorId}/editar`}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              Ver proveedor <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Auditoria */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Auditoria</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Creado</dt>
                <dd>{format(new Date(reposicion.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Actualizado</dt>
                <dd>{format(new Date(reposicion.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
