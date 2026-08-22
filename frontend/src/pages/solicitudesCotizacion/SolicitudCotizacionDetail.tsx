import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Check, Search, ExternalLink, Printer, XCircle, FileCheck, Package } from 'lucide-react';
import { solicitudesCotizacionService } from '../../services/solicitudesCotizacion.service';
import { articulosService } from '../../services/articulos.service';
import { ArticuloCombobox } from '../../components/ArticuloCombobox';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Badge } from '../../components/Badge';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type {
  SolicitudCotizacionConRelaciones,
  SolicitudCotizacionItemConArticulo,
  ArticuloConRelaciones,
  EstadoSolicitudCotizacion,
  MatchConfianza,
} from '@hofra/shared';

const estadoLabels: Record<EstadoSolicitudCotizacion, string> = {
  en_revision: 'En Revisión',
  cotizada: 'Cotizada',
  cancelada: 'Cancelada',
};

const estadoVariants: Record<EstadoSolicitudCotizacion, 'warning' | 'success' | 'secondary'> = {
  en_revision: 'warning',
  cotizada: 'success',
  cancelada: 'secondary',
};

const confianzaLabels: Record<MatchConfianza, string> = {
  etm: 'Coincide por ETM',
  nombre: 'Coincide por nombre',
  sin_match: 'Sin coincidencia',
};

const confianzaVariants: Record<MatchConfianza, 'success' | 'warning' | 'danger'> = {
  etm: 'success',
  nombre: 'warning',
  sin_match: 'danger',
};

const itemEstadoLabels = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  a_comprar: 'A comprar',
} as const;

const itemEstadoVariants = {
  pendiente: 'gray',
  aceptado: 'success',
  a_comprar: 'primary',
} as const;

function buildMercadoLibreUrl(item: SolicitudCotizacionItemConArticulo): string {
  const query = item.etmSolicitado || `${item.marcaSolicitada ?? ''} ${item.descripcionSolicitada}`.trim();
  return `https://listado.mercadolibre.com.ar/${encodeURIComponent(query)}`;
}

export function SolicitudCotizacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [solicitud, setSolicitud] = useState<SolicitudCotizacionConRelaciones | null>(null);
  const [articulos, setArticulos] = useState<ArticuloConRelaciones[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [precios, setPrecios] = useState<Record<string, number | undefined>>({});

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (solicitudId: string) => {
    setIsLoading(true);
    try {
      const [solicitudData, articulosRes] = await Promise.all([
        solicitudesCotizacionService.getById(solicitudId),
        articulosService.getAll({ limit: 1000, activo: true }),
      ]);
      setSolicitud(solicitudData);
      setArticulos(articulosRes.data);
      const preciosIniciales: Record<string, number | undefined> = {};
      solicitudData.items.forEach((item) => {
        preciosIniciales[item.id] = item.precioUnitario ?? undefined;
      });
      setPrecios(preciosIniciales);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const applyUpdate = async (itemId: string, data: Parameters<typeof solicitudesCotizacionService.updateItem>[2]) => {
    if (!id) return;
    setSavingItemId(itemId);
    try {
      const updated = await solicitudesCotizacionService.updateItem(id, itemId, data);
      setSolicitud(updated);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleAceptar = (item: SolicitudCotizacionItemConArticulo) => {
    if (!item.articuloId) return;
    applyUpdate(item.id, { estadoItem: 'aceptado' });
  };

  const handleSeleccionarArticulo = (item: SolicitudCotizacionItemConArticulo, articulo: ArticuloConRelaciones | null) => {
    if (!articulo) return;
    setEditingItemId(null);
    applyUpdate(item.id, { articuloId: articulo.id, estadoItem: 'aceptado' });
  };

  const handleBuscarMercadoLibre = (item: SolicitudCotizacionItemConArticulo) => {
    window.open(buildMercadoLibreUrl(item), '_blank', 'noopener,noreferrer');
    if (item.estadoItem !== 'a_comprar') {
      applyUpdate(item.id, { estadoItem: 'a_comprar' });
    }
  };

  const handlePrecioBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevoPrecio = precios[item.id];
    if (nuevoPrecio === item.precioUnitario) return;
    applyUpdate(item.id, { precioUnitario: nuevoPrecio ?? null });
  };

  const handleMarcarCotizada = async () => {
    if (!id) return;
    try {
      const updated = await solicitudesCotizacionService.marcarCotizada(id);
      setSolicitud(updated);
      toast.success('Solicitud marcada como cotizada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancelar = async () => {
    if (!id) return;
    if (!confirm('¿Cancelar esta solicitud de cotización?')) return;
    try {
      const updated = await solicitudesCotizacionService.cancelar(id);
      setSolicitud(updated);
      toast.success('Solicitud cancelada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handlePrint = () => {
    if (!solicitud) return;

    const total = solicitud.items.reduce((sum, item) => sum + (item.precioUnitario || 0) * item.cantidadSolicitada, 0);
    const fechaFormateada = format(new Date(solicitud.fechaSolicitud), 'dd/MM/yyyy HH:mm', { locale: es });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cotización - ${solicitud.cliente.razonSocial}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Cotización</h1>
        <div class="header-info">
          <div><strong>Cliente:</strong> ${solicitud.cliente.razonSocial}${solicitud.cliente.cuit ? ` (${solicitud.cliente.cuit})` : ''}</div>
          <div><strong>Fecha:</strong> ${fechaFormateada}</div>
          ${solicitud.numeroReferenciaCliente ? `<div><strong>Referencia:</strong> ${solicitud.numeroReferenciaCliente}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Marca</th>
              <th class="text-right">Cantidad</th>
              <th class="text-right">Precio Unit.</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${solicitud.items
              .map((item) => {
                const subtotal = (item.precioUnitario || 0) * item.cantidadSolicitada;
                return `<tr>
                  <td>${item.descripcionSolicitada}</td>
                  <td>${item.marcaSolicitada || '-'}</td>
                  <td class="text-right">${item.cantidadSolicitada}</td>
                  <td class="text-right">$${(item.precioUnitario || 0).toLocaleString('es-AR')}</td>
                  <td class="text-right">$${subtotal.toLocaleString('es-AR')}</td>
                </tr>`;
              })
              .join('')}
            <tr class="total-row">
              <td colspan="4" class="text-right">TOTAL</td>
              <td class="text-right">$${total.toLocaleString('es-AR')}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Documento generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!solicitud) return null;

  const total = solicitud.items.reduce((sum, item) => sum + (item.precioUnitario || 0) * item.cantidadSolicitada, 0);
  const puedeMarcarCotizada =
    solicitud.estado === 'en_revision' &&
    solicitud.items.every((item) => item.estadoItem !== 'pendiente' && item.precioUnitario !== null && item.precioUnitario !== undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/solicitudes-cotizacion')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Solicitud de Cotización</h1>
        <Badge variant={estadoVariants[solicitud.estado]}>{estadoLabels[solicitud.estado]}</Badge>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Cliente</p>
            <p className="font-medium">{solicitud.cliente.razonSocial}</p>
          </div>
          <div>
            <p className="text-gray-500">Fecha</p>
            <p className="font-medium">{format(new Date(solicitud.fechaSolicitud), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          <div>
            <p className="text-gray-500">Referencia del Cliente</p>
            <p className="font-medium">{solicitud.numeroReferenciaCliente || '-'}</p>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase text-xs">Solicitado</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase text-xs">Sugerido</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase text-xs">Acciones</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase text-xs">Precio Unit.</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500 uppercase text-xs">Subtotal</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase text-xs">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {solicitud.items.map((item) => {
                const subtotal = (item.precioUnitario || 0) * item.cantidadSolicitada;
                const disabled = solicitud.estado !== 'en_revision' || savingItemId === item.id;

                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-3 max-w-xs">
                      <p className="font-medium text-gray-900">{item.descripcionSolicitada}</p>
                      <p className="text-xs text-gray-500">
                        Cant: {item.cantidadSolicitada}
                        {item.marcaSolicitada && ` · Marca: ${item.marcaSolicitada}`}
                        {item.etmSolicitado && ` · ETM: ${item.etmSolicitado}`}
                      </p>
                    </td>

                    <td className="px-3 py-3 max-w-xs">
                      {item.matchConfianza && (
                        <Badge variant={confianzaVariants[item.matchConfianza]} className="mb-1">
                          {confianzaLabels[item.matchConfianza]}
                        </Badge>
                      )}
                      {item.articulo ? (
                        <div>
                          <p className="font-medium">{item.articulo.nombre}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            {item.articulo.codigo} · Stock: {item.articulo.stockActual}
                            {item.articulo.marca && ` · ${item.articulo.marca}`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-400 flex items-center gap-1">
                          <Package className="w-4 h-4" /> Sin coincidencia
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3 min-w-[220px]">
                      {editingItemId === item.id ? (
                        <ArticuloCombobox
                          articulos={articulos}
                          value={item.articuloId}
                          onChange={(articulo) => handleSeleccionarArticulo(item, articulo)}
                          allowZeroStock
                          placeholder="Buscar artículo..."
                        />
                      ) : (
                        <div className="flex flex-col gap-1">
                          {item.articuloId && item.estadoItem !== 'aceptado' && (
                            <button
                              onClick={() => handleAceptar(item)}
                              disabled={disabled}
                              className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" /> Aceptar sugerencia
                            </button>
                          )}
                          <button
                            onClick={() => setEditingItemId(item.id)}
                            disabled={disabled}
                            className="flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800 disabled:opacity-50"
                          >
                            <Search className="w-4 h-4" /> Buscar otro artículo
                          </button>
                          <button
                            onClick={() => handleBuscarMercadoLibre(item)}
                            disabled={disabled}
                            className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 disabled:opacity-50"
                          >
                            <ExternalLink className="w-4 h-4" /> Buscar en Mercado Libre
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 w-32">
                      <CurrencyInput
                        value={precios[item.id]}
                        onChange={(val) => setPrecios((prev) => ({ ...prev, [item.id]: val }))}
                        onBlur={() => handlePrecioBlur(item)}
                        disabled={disabled}
                        placeholder="0,00"
                      />
                    </td>

                    <td className="px-3 py-3 text-right font-medium whitespace-nowrap">
                      ${subtotal.toLocaleString('es-AR')}
                    </td>

                    <td className="px-3 py-3">
                      <Badge variant={itemEstadoVariants[item.estadoItem]}>{itemEstadoLabels[item.estadoItem]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-3 py-3 text-right font-semibold">Total</td>
                <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">${total.toLocaleString('es-AR')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button onClick={handlePrint} className="btn-secondary">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Cotización
        </button>
        {solicitud.estado === 'en_revision' && (
          <>
            <button onClick={handleCancelar} className="btn-danger">
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar Solicitud
            </button>
            <button onClick={handleMarcarCotizada} disabled={!puedeMarcarCotizada} className="btn-primary disabled:opacity-50">
              <FileCheck className="w-4 h-4 mr-2" />
              Marcar como Cotizada
            </button>
          </>
        )}
      </div>
    </div>
  );
}
