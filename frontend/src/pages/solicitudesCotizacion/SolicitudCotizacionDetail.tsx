import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Check, Search, ExternalLink, Printer, XCircle, FileCheck, Package, X, Link2, Ban, Download, HardDrive, Loader2, Plus, Globe } from 'lucide-react';
import { solicitudesCotizacionService } from '../../services/solicitudesCotizacion.service';
import { articulosService } from '../../services/articulos.service';
import { ArticuloCombobox } from '../../components/ArticuloCombobox';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Badge } from '../../components/Badge';
import { PageLoader } from '../../components/LoadingSpinner';
import { ItemsCaptureEditor } from '../../components/solicitudesCotizacion/ItemsCaptureEditor';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type {
  SolicitudCotizacionConRelaciones,
  SolicitudCotizacionItemConArticulo,
  ArticuloConRelaciones,
  CreateSolicitudCotizacionItemDto,
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
  no_disponible: 'No Disponible',
} as const;

function buildBusquedaQuery(item: SolicitudCotizacionItemConArticulo): string {
  return [item.descripcionSolicitada.trim(), item.marcaSolicitada?.trim()].filter(Boolean).join(' ');
}

function buildMercadoLibreUrl(item: SolicitudCotizacionItemConArticulo): string {
  return `https://listado.mercadolibre.com.ar/${encodeURIComponent(buildBusquedaQuery(item))}`;
}

function buildGoogleUrl(item: SolicitudCotizacionItemConArticulo): string {
  return `https://www.google.com/search?q=${encodeURIComponent(buildBusquedaQuery(item))}`;
}

function nombreOfrecidoEfectivo(item: SolicitudCotizacionItemConArticulo): string {
  // Solo se precarga con el nombre del artículo matcheado si el ítem ya fue aceptado
  // (por "Aceptar Sug." o eligiendo uno manualmente) — nunca al importar, aunque haya
  // un articuloIdSugerido con buena confianza: ahí el campo debe quedar en blanco.
  if (item.estadoItem === 'aceptado' && item.articulo) {
    return item.nombreOfrecido || item.articulo.nombre;
  }
  return item.nombreOfrecido || '';
}

function unidadEfectiva(item: SolicitudCotizacionItemConArticulo): string {
  return item.unidad ?? item.unidadSolicitada ?? '';
}

function marcaEfectiva(item: SolicitudCotizacionItemConArticulo): string {
  return item.marca ?? item.marcaSolicitada ?? '';
}

function modeloEfectivo(item: SolicitudCotizacionItemConArticulo): string {
  return item.modelo ?? item.modeloSolicitado ?? '';
}

// Ocultos a pedido de Nicole (2026-09-07): Google Sheets no sirve mientras la cuenta de
// Google siga suspendida, e Imprimir Cotización queda pausado por ahora. No se borraron
// el botón ni la lógica para poder reactivarlos fácilmente más adelante.
const MOSTRAR_EXPORTAR_GOOGLE_SHEETS = false;
const MOSTRAR_IMPRIMIR = false;

export function SolicitudCotizacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [solicitud, setSolicitud] = useState<SolicitudCotizacionConRelaciones | null>(null);
  const [articulos, setArticulos] = useState<ArticuloConRelaciones[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number | undefined>>({});
  const [unidades, setUnidades] = useState<Record<string, string>>({});
  const [marcas, setMarcas] = useState<Record<string, string>>({});
  const [modelos, setModelos] = useState<Record<string, string>>({});
  const [precios, setPrecios] = useState<Record<string, number | undefined>>({});
  const [preciosUsd, setPreciosUsd] = useState<Record<string, number | undefined>>({});
  const [markUps, setMarkUps] = useState<Record<string, number | undefined>>({});
  const [nombresOfrecidos, setNombresOfrecidos] = useState<Record<string, string>>({});
  const [pastingUrlItemId, setPastingUrlItemId] = useState<string | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [headerDraft, setHeaderDraft] = useState({
    numeroCotizacion: undefined as number | undefined,
    nombreCotizacion: '',
    fechaEntrega: '',
    lugarEntrega: '',
    solicitadoPor: '',
    usdOficialCompra: undefined as number | undefined,
    usdOficialVenta: undefined as number | undefined,
  });
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  const [mostrarAgregarItems, setMostrarAgregarItems] = useState(false);
  const [nuevosItems, setNuevosItems] = useState<CreateSolicitudCotizacionItemDto[]>([]);
  const [nuevosItemsFileName, setNuevosItemsFileName] = useState<string | null>(null);
  const [isAddingItems, setIsAddingItems] = useState(false);

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
      const cantidadesIniciales: Record<string, number | undefined> = {};
      const unidadesIniciales: Record<string, string> = {};
      const marcasIniciales: Record<string, string> = {};
      const modelosIniciales: Record<string, string> = {};
      const preciosIniciales: Record<string, number | undefined> = {};
      const preciosUsdIniciales: Record<string, number | undefined> = {};
      const markUpsIniciales: Record<string, number | undefined> = {};
      const nombresOfrecidosIniciales: Record<string, string> = {};
      solicitudData.items.forEach((item) => {
        cantidadesIniciales[item.id] = item.cantidad ?? item.cantidadSolicitada;
        unidadesIniciales[item.id] = unidadEfectiva(item);
        marcasIniciales[item.id] = marcaEfectiva(item);
        modelosIniciales[item.id] = modeloEfectivo(item);
        preciosIniciales[item.id] = item.precioUnitario ?? undefined;
        preciosUsdIniciales[item.id] = item.precioUnitarioUsd ?? undefined;
        markUpsIniciales[item.id] = item.markUp ?? undefined;
        nombresOfrecidosIniciales[item.id] = nombreOfrecidoEfectivo(item);
      });
      setCantidades(cantidadesIniciales);
      setUnidades(unidadesIniciales);
      setMarcas(marcasIniciales);
      setModelos(modelosIniciales);
      setPrecios(preciosIniciales);
      setPreciosUsd(preciosUsdIniciales);
      setMarkUps(markUpsIniciales);
      setNombresOfrecidos(nombresOfrecidosIniciales);
      setHeaderDraft({
        numeroCotizacion: solicitudData.numeroCotizacion ?? undefined,
        nombreCotizacion: solicitudData.nombreCotizacion || '',
        fechaEntrega: solicitudData.fechaEntrega ? new Date(solicitudData.fechaEntrega).toISOString().slice(0, 10) : '',
        lugarEntrega: solicitudData.lugarEntrega || '',
        solicitadoPor: solicitudData.solicitadoPor || '',
        usdOficialCompra: solicitudData.usdOficialCompra ?? undefined,
        usdOficialVenta: solicitudData.usdOficialVenta ?? undefined,
      });
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
      const updatedItem = updated.items.find((i) => i.id === itemId);
      if (updatedItem) {
        setCantidades((prev) => ({ ...prev, [itemId]: updatedItem.cantidad ?? updatedItem.cantidadSolicitada }));
        setUnidades((prev) => ({ ...prev, [itemId]: unidadEfectiva(updatedItem) }));
        setMarcas((prev) => ({ ...prev, [itemId]: marcaEfectiva(updatedItem) }));
        setModelos((prev) => ({ ...prev, [itemId]: modeloEfectivo(updatedItem) }));
        setPrecios((prev) => ({ ...prev, [itemId]: updatedItem.precioUnitario ?? undefined }));
        setPreciosUsd((prev) => ({ ...prev, [itemId]: updatedItem.precioUnitarioUsd ?? undefined }));
        setMarkUps((prev) => ({ ...prev, [itemId]: updatedItem.markUp ?? undefined }));
        setNombresOfrecidos((prev) => ({ ...prev, [itemId]: nombreOfrecidoEfectivo(updatedItem) }));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleAceptar = (item: SolicitudCotizacionItemConArticulo) => {
    if (!item.articuloIdSugerido) return;
    applyUpdate(item.id, {
      articuloId: item.articuloIdSugerido,
      estadoItem: 'aceptado',
      // Si el artículo tiene un costo cargado y todavía no se fijó un precio, lo usamos como punto de partida
      ...(item.precioUnitario == null && item.articuloSugerido?.costoInicialEstimado != null
        ? { precioUnitario: item.articuloSugerido.costoInicialEstimado }
        : {}),
    });
  };

  const handleSeleccionarArticulo = (item: SolicitudCotizacionItemConArticulo, articulo: ArticuloConRelaciones | null) => {
    if (!articulo) return;
    setEditingItemId(null);
    applyUpdate(item.id, {
      articuloId: articulo.id,
      estadoItem: 'aceptado',
      ...(item.precioUnitario == null && articulo.costoInicialEstimado != null
        ? { precioUnitario: articulo.costoInicialEstimado }
        : {}),
    });
  };

  const handleQuitarAceptacion = (item: SolicitudCotizacionItemConArticulo) => {
    // Deshace la aceptación (vuelve a "pendiente") sin perder la sugerencia,
    // para poder aceptarla de nuevo o buscar otro artículo distinto.
    applyUpdate(item.id, { estadoItem: 'pendiente' });
  };

  const handleBuscarMercadoLibre = (item: SolicitudCotizacionItemConArticulo) => {
    window.open(buildMercadoLibreUrl(item), '_blank', 'noopener,noreferrer');
    // Si ya hay un artículo sugerido/coincidente, abrir Mercado Libre es solo para
    // comparar precio: no debe pisar la sugerencia ni sacarle la posibilidad de Aceptar.
    // Solo se marca "no disponible" cuando realmente no hay ningún artículo matcheado.
    if (!item.articuloId && item.estadoItem !== 'no_disponible') {
      applyUpdate(item.id, { estadoItem: 'no_disponible' });
    }
  };

  const handleBuscarGoogle = (item: SolicitudCotizacionItemConArticulo) => {
    window.open(buildGoogleUrl(item), '_blank', 'noopener,noreferrer');
    // Mismo criterio que Mercado Libre: solo marca "no disponible" si no hay ningún artículo matcheado.
    if (!item.articuloId && item.estadoItem !== 'no_disponible') {
      applyUpdate(item.id, { estadoItem: 'no_disponible' });
    }
  };

  const handleMarcarNoDisponible = (item: SolicitudCotizacionItemConArticulo) => {
    if (!confirm(`¿Marcar "${item.descripcionSolicitada}" como ${itemEstadoLabels.no_disponible}?`)) return;
    applyUpdate(item.id, { estadoItem: 'no_disponible' });
  };

  const handleGuardarUrlExterna = (item: SolicitudCotizacionItemConArticulo) => {
    const url = (urlDrafts[item.id] || '').trim();
    if (!url) return;
    applyUpdate(item.id, { urlExterna: url });
    setPastingUrlItemId(null);
  };

  const handleAceptarUrlExterna = (item: SolicitudCotizacionItemConArticulo) => {
    applyUpdate(item.id, { estadoItem: 'no_disponible' });
  };

  const handleDeclinarUrlExterna = (item: SolicitudCotizacionItemConArticulo) => {
    applyUpdate(item.id, { urlExterna: null });
    setUrlDrafts((prev) => ({ ...prev, [item.id]: '' }));
  };

  const handleCantidadBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const cantidadEfectivaActual = item.cantidad ?? item.cantidadSolicitada;
    const nuevaCantidad = cantidades[item.id];
    if (nuevaCantidad === undefined || nuevaCantidad === cantidadEfectivaActual) {
      setCantidades((prev) => ({ ...prev, [item.id]: cantidadEfectivaActual }));
      return;
    }
    applyUpdate(item.id, { cantidad: nuevaCantidad });
  };

  const handleUnidadBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevaUnidad = (unidades[item.id] || '').trim();
    if (nuevaUnidad === unidadEfectiva(item)) return;
    applyUpdate(item.id, { unidad: nuevaUnidad || null });
  };

  const handleMarcaBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevaMarca = (marcas[item.id] || '').trim();
    if (nuevaMarca === marcaEfectiva(item)) return;
    applyUpdate(item.id, { marca: nuevaMarca || null });
  };

  const handleModeloBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevoModelo = (modelos[item.id] || '').trim();
    if (nuevoModelo === modeloEfectivo(item)) return;
    applyUpdate(item.id, { modelo: nuevoModelo || null });
  };

  const handlePrecioBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevoPrecio = precios[item.id];
    if (nuevoPrecio === item.precioUnitario) return;
    applyUpdate(item.id, { precioUnitario: nuevoPrecio ?? null });
  };

  const handlePrecioUsdBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevoPrecioUsd = preciosUsd[item.id];
    if (nuevoPrecioUsd === item.precioUnitarioUsd) return;
    applyUpdate(item.id, { precioUnitarioUsd: nuevoPrecioUsd ?? null });
  };

  const handleMarkUpBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevoMarkUp = markUps[item.id];
    if (nuevoMarkUp === item.markUp) return;
    applyUpdate(item.id, { markUp: nuevoMarkUp ?? null });
  };

  const handleNombreOfrecidoBlur = (item: SolicitudCotizacionItemConArticulo) => {
    const nuevoNombre = (nombresOfrecidos[item.id] || '').trim();
    if (nuevoNombre === nombreOfrecidoEfectivo(item)) return;
    applyUpdate(item.id, { nombreOfrecido: nuevoNombre || null });
  };

  const handleHeaderFieldBlur = async (
    field:
      | 'numeroCotizacion'
      | 'nombreCotizacion'
      | 'fechaEntrega'
      | 'lugarEntrega'
      | 'solicitadoPor'
      | 'usdOficialCompra'
      | 'usdOficialVenta',
    valorNuevo: string | number | undefined
  ) => {
    if (!id) return;
    const normalizado = valorNuevo === undefined || valorNuevo === '' ? null : valorNuevo;
    setIsSavingHeader(true);
    try {
      const updated = await solicitudesCotizacionService.update(id, { [field]: normalizado });
      setSolicitud((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingHeader(false);
    }
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

  const handleCerrarAgregarItems = () => {
    setMostrarAgregarItems(false);
    setNuevosItems([]);
    setNuevosItemsFileName(null);
  };

  const handleAgregarItems = async () => {
    if (!id) return;
    if (nuevosItems.length === 0) {
      toast.error('Cargá al menos un ítem válido');
      return;
    }
    setIsAddingItems(true);
    try {
      const updated = await solicitudesCotizacionService.addItems(
        id,
        nuevosItems.map((item) => ({
          etmSolicitado: item.etmSolicitado,
          descripcionSolicitada: item.descripcionSolicitada,
          marcaSolicitada: item.marcaSolicitada,
          modeloSolicitado: item.modeloSolicitado,
          descripcionInglesSolicitada: item.descripcionInglesSolicitada,
          unidadSolicitada: item.unidadSolicitada,
          cantidadSolicitada: item.cantidadSolicitada,
        }))
      );
      setSolicitud(updated);
      toast.success(`${nuevosItems.length} ítems agregados`);
      handleCerrarAgregarItems();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsAddingItems(false);
    }
  };

  const descargarBlob = (blob: Blob, nombreArchivo: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportarExcel = async () => {
    if (!id || !solicitud) return;
    try {
      const blob = await solicitudesCotizacionService.exportarExcel(id);
      const nombreArchivo = `Cotizacion Interna - ${solicitud.cliente?.razonSocial || 'Sin Cliente'}${
        solicitud.numeroReferenciaCliente ? ` - ${solicitud.numeroReferenciaCliente}` : ''
      }.xlsx`;
      descargarBlob(blob, nombreArchivo);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleExportarExcelExterno = async () => {
    if (!id || !solicitud) return;
    try {
      const blob = await solicitudesCotizacionService.exportarExcelExterno(id);
      const nombreArchivo = `Cotizacion - ${solicitud.cliente?.razonSocial || 'Sin Cliente'}${
        solicitud.numeroReferenciaCliente ? ` - ${solicitud.numeroReferenciaCliente}` : ''
      }.xlsx`;
      descargarBlob(blob, nombreArchivo);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const [isExportingSheets, setIsExportingSheets] = useState(false);

  const handleExportarGoogleSheets = async () => {
    if (!id) return;
    setIsExportingSheets(true);
    try {
      const url = await solicitudesCotizacionService.exportarGoogleSheets(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExportingSheets(false);
    }
  };

  const handlePrint = () => {
    if (!solicitud) return;

    const total = solicitud.items.reduce(
      (sum, item) => sum + (item.precioUnitario || 0) * (item.cantidad ?? item.cantidadSolicitada),
      0
    );
    const fechaFormateada = format(new Date(solicitud.fechaSolicitud), 'dd/MM/yyyy HH:mm', { locale: es });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cotización - ${solicitud.cliente?.razonSocial || 'Sin Cliente'}</title>
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
          <div><strong>Cliente:</strong> ${solicitud.cliente?.razonSocial || 'Sin Cliente'}${solicitud.cliente?.cuit ? ` (${solicitud.cliente.cuit})` : ''}</div>
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
                const cantidadEfectiva = item.cantidad ?? item.cantidadSolicitada;
                const subtotal = (item.precioUnitario || 0) * cantidadEfectiva;
                return `<tr>
                  <td>${item.descripcionSolicitada}</td>
                  <td>${item.marcaSolicitada || '-'}</td>
                  <td class="text-right">${cantidadEfectiva.toLocaleString('es-AR')}</td>
                  <td class="text-right">$${(item.precioUnitario || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td class="text-right">$${subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                </tr>`;
              })
              .join('')}
            <tr class="total-row">
              <td colspan="4" class="text-right">TOTAL</td>
              <td class="text-right">$${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
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

  const itemPasteandoUrl = pastingUrlItemId ? solicitud.items.find((i) => i.id === pastingUrlItemId) ?? null : null;

  const handleCancelarPastearUrl = () => {
    if (pastingUrlItemId) {
      setUrlDrafts((prev) => ({ ...prev, [pastingUrlItemId]: '' }));
    }
    setPastingUrlItemId(null);
  };

  const total = solicitud.items.reduce(
    (sum, item) => sum + (item.precioUnitario || 0) * (item.cantidad ?? item.cantidadSolicitada),
    0
  );
  const puedeMarcarCotizada =
    solicitud.estado === 'en_revision' &&
    solicitud.items.every((item) => item.estadoItem !== 'pendiente' && item.precioUnitario !== null && item.precioUnitario !== undefined);

  const totalItems = solicitud.items.length;
  const cantidadTotalItems = solicitud.items.reduce((sum, item) => sum + (item.cantidad ?? item.cantidadSolicitada), 0);
  const conCoincidencia = solicitud.items.filter((item) => item.matchConfianza === 'etm' || item.matchConfianza === 'nombre').length;
  const sinCoincidencia = totalItems - conCoincidencia;
  const aceptados = solicitud.items.filter((item) => item.estadoItem !== 'pendiente').length;
  const pendientesRevision = totalItems - aceptados;

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
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 min-w-0 max-w-[160px]">
            <span className="text-gray-500 whitespace-nowrap">Cliente:</span>
            <span className="font-medium truncate">{solicitud.cliente?.razonSocial ?? 'Sin cliente'}</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-gray-500">Fecha:</span>
            <span className="font-medium">{format(new Date(solicitud.fechaSolicitud), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <label className="text-gray-500">N° Cotización:</label>
            <input
              type="number"
              className="input w-16"
              value={headerDraft.numeroCotizacion ?? ''}
              disabled={solicitud.estado !== 'en_revision' || isSavingHeader}
              onChange={(e) =>
                setHeaderDraft((prev) => ({
                  ...prev,
                  numeroCotizacion: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                }))
              }
              onBlur={() => handleHeaderFieldBlur('numeroCotizacion', headerDraft.numeroCotizacion)}
              placeholder="Manual"
            />
          </div>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <label className="text-gray-500 whitespace-nowrap">Nombre:</label>
            <input
              type="text"
              className="input flex-1"
              value={headerDraft.nombreCotizacion}
              disabled={solicitud.estado !== 'en_revision' || isSavingHeader}
              onChange={(e) => setHeaderDraft((prev) => ({ ...prev, nombreCotizacion: e.target.value }))}
              onBlur={() => handleHeaderFieldBlur('nombreCotizacion', headerDraft.nombreCotizacion)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase mb-3">Datos para el Excel de cotización</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div>
              <label className="block text-gray-500 mb-1">Fecha de Entrega</label>
              <input
                type="date"
                className="input"
                value={headerDraft.fechaEntrega}
                disabled={solicitud.estado !== 'en_revision' || isSavingHeader}
                onChange={(e) => setHeaderDraft((prev) => ({ ...prev, fechaEntrega: e.target.value }))}
                onBlur={() => handleHeaderFieldBlur('fechaEntrega', headerDraft.fechaEntrega)}
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Lugar de Entrega</label>
              <input
                type="text"
                className="input"
                value={headerDraft.lugarEntrega}
                disabled={solicitud.estado !== 'en_revision' || isSavingHeader}
                onChange={(e) => setHeaderDraft((prev) => ({ ...prev, lugarEntrega: e.target.value }))}
                onBlur={() => handleHeaderFieldBlur('lugarEntrega', headerDraft.lugarEntrega)}
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Solicitado Por</label>
              <input
                type="text"
                className="input"
                value={headerDraft.solicitadoPor}
                disabled={solicitud.estado !== 'en_revision' || isSavingHeader}
                onChange={(e) => setHeaderDraft((prev) => ({ ...prev, solicitadoPor: e.target.value }))}
                onBlur={() => handleHeaderFieldBlur('solicitadoPor', headerDraft.solicitadoPor)}
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">USD Oficial Compra</label>
              <CurrencyInput
                value={headerDraft.usdOficialCompra}
                disabled={solicitud.estado !== 'en_revision' || isSavingHeader}
                onChange={(val) => setHeaderDraft((prev) => ({ ...prev, usdOficialCompra: val }))}
                onBlur={() => handleHeaderFieldBlur('usdOficialCompra', headerDraft.usdOficialCompra)}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">USD Oficial Venta</label>
              <CurrencyInput
                value={headerDraft.usdOficialVenta}
                disabled={solicitud.estado !== 'en_revision' || isSavingHeader}
                onChange={(val) => setHeaderDraft((prev) => ({ ...prev, usdOficialVenta: val }))}
                onBlur={() => handleHeaderFieldBlur('usdOficialVenta', headerDraft.usdOficialVenta)}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="px-2 py-1.5 bg-primary-50 rounded-lg flex items-center justify-between gap-2">
          <p className="text-xs text-primary-600">Total de Items</p>
          <p className="text-sm font-bold text-primary-700">{totalItems}</p>
        </div>
        <div className="px-2 py-1.5 bg-primary-50 rounded-lg flex items-center justify-between gap-2">
          <p className="text-xs text-primary-600">Cantidad de Items</p>
          <p className="text-sm font-bold text-primary-700">{cantidadTotalItems.toLocaleString('es-AR')}</p>
        </div>
        <div className="px-2 py-1.5 bg-green-50 rounded-lg flex items-center justify-between gap-2">
          <p className="text-xs text-green-600">Con Coincidencia</p>
          <p className="text-sm font-bold text-green-700">{conCoincidencia}</p>
        </div>
        <div className="px-2 py-1.5 bg-red-50 rounded-lg flex items-center justify-between gap-2">
          <p className="text-xs text-red-600">Sin Coincidencia</p>
          <p className="text-sm font-bold text-red-700">{sinCoincidencia}</p>
        </div>
        <div className="px-2 py-1.5 bg-blue-50 rounded-lg flex items-center justify-between gap-2">
          <p className="text-xs text-blue-600">Aceptados</p>
          <p className="text-sm font-bold text-blue-700">{aceptados}</p>
        </div>
        <div className="px-2 py-1.5 bg-amber-50 rounded-lg flex items-center justify-between gap-2">
          <p className="text-xs text-amber-600">Pendientes de Revisión</p>
          <p className="text-sm font-bold text-amber-700">{pendientesRevision}</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button onClick={handleExportarExcel} className="btn-secondary">
          <Download className="w-4 h-4 mr-2" />
          Descargar Excel Interno
        </button>
        <button onClick={handleExportarExcelExterno} className="btn-secondary">
          <Download className="w-4 h-4 mr-2" />
          Descargar Excel Externo
        </button>
        {MOSTRAR_EXPORTAR_GOOGLE_SHEETS && (
          <button onClick={handleExportarGoogleSheets} disabled={isExportingSheets} className="btn-secondary disabled:opacity-50">
            {isExportingSheets ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HardDrive className="w-4 h-4 mr-2" />}
            Exportar a Google Sheets
          </button>
        )}
        {MOSTRAR_IMPRIMIR && (
          <button onClick={handlePrint} className="btn-secondary">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Cotización
          </button>
        )}
        {solicitud.estado === 'en_revision' && (
          <>
            <button onClick={() => setMostrarAgregarItems((v) => !v)} className="btn-secondary">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Artículos
            </button>
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

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] border-separate border-spacing-0 text-sm">
            <thead className="bg-gray-50">
              <tr className="divide-x divide-gray-300">
                <th className="sticky left-0 z-20 bg-gray-50 px-2 py-2 text-center align-top font-medium text-gray-500 uppercase text-xs w-[40px] border-b border-gray-300">Item</th>
                <th className="sticky left-[40px] z-20 bg-gray-50 px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[200px] whitespace-normal break-words border-b border-gray-300">Item Solicitado</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs min-w-[160px] whitespace-normal break-words border-b border-gray-300">Item Sugerido</th>
                <th className="sticky left-[240px] z-20 bg-gray-50 px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[200px] whitespace-normal break-words border-b border-gray-300">Item Ofrecido</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[110px] whitespace-normal break-words border-b border-gray-300">Acciones</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[56px] whitespace-normal break-words border-b border-gray-300">Cant.</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[90px] whitespace-normal break-words border-b border-gray-300">Unidad de medida</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[100px] whitespace-normal break-words border-b border-gray-300">Marca</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[100px] whitespace-normal break-words border-b border-gray-300">Modelo</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[120px] whitespace-normal break-words border-b border-gray-300">$ Unitario Sin Iva (ARS)</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[120px] whitespace-normal break-words border-b border-gray-300">$ Unitario Sin Iva (USD)</th>
                <th className="px-2 py-2 text-left align-top font-medium text-gray-500 uppercase text-xs w-[64px] whitespace-normal break-words border-b border-gray-300">Mark Up</th>
              </tr>
            </thead>
            <tbody>
              {solicitud.items.map((item, itemIndex) => {
                const disabled = solicitud.estado !== 'en_revision' || savingItemId === item.id;

                return (
                  <tr key={item.id} className="align-top divide-x divide-gray-300">
                    <td className="sticky left-0 z-10 bg-white px-2 py-2 w-[40px] text-center text-gray-500 border-b border-gray-300">
                      {itemIndex + 1}
                    </td>

                    <td className="sticky left-[40px] z-10 bg-white px-2 py-2 w-[200px] border-b border-gray-300">
                      <p className="font-medium text-gray-900 break-words">{item.descripcionSolicitada}</p>
                      {item.etmSolicitado && <p className="text-xs text-gray-500">ETM: {item.etmSolicitado}</p>}
                    </td>

                    <td className="px-2 py-2 min-w-[160px] border-b border-gray-300">
                      {item.matchConfianza && item.articuloSugerido && (
                        <Badge variant={confianzaVariants[item.matchConfianza]} className="mb-1">
                          {confianzaLabels[item.matchConfianza]}
                        </Badge>
                      )}
                      {item.articuloSugerido ? (
                        <a
                          href={`/articulos/${item.articuloSugerido.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:underline"
                          title="Ver detalle del artículo"
                        >
                          <p className="font-medium text-primary-700 break-words">{item.articuloSugerido.nombre}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            {item.articuloSugerido.codigo}
                            {item.articuloSugerido.presentacion && ` · ${item.articuloSugerido.presentacion}`}
                            {` · Stock: ${item.articuloSugerido.stockActual.toLocaleString('es-AR')}`}
                            {item.articuloSugerido.marca && ` · ${item.articuloSugerido.marca}`}
                          </p>
                        </a>
                      ) : (
                        <p className="text-gray-400 flex items-center gap-1">
                          <Package className="w-4 h-4" /> Sin coincidencia
                        </p>
                      )}
                    </td>

                    <td className="sticky left-[240px] z-10 bg-white px-2 py-2 w-[200px] border-b border-gray-300">
                      <textarea
                        rows={2}
                        value={nombresOfrecidos[item.id] ?? ''}
                        onChange={(e) =>
                          setNombresOfrecidos((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onBlur={() => handleNombreOfrecidoBlur(item)}
                        disabled={disabled}
                        placeholder="Nombre del artículo..."
                        className="input px-2 py-1 text-xs w-full mb-1 resize-y"
                      />
                      {item.estadoItem === 'aceptado' && item.articulo ? (
                        <div className="flex items-start justify-between gap-2">
                          <a
                            href={`/articulos/${item.articulo.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline min-w-0"
                            title="Ver detalle del artículo"
                          >
                            <p className="text-xs text-gray-500 font-mono break-words">
                              {item.articulo.codigo}
                              {item.articulo.marca && ` · ${item.articulo.marca}`}
                            </p>
                          </a>
                          <button
                            onClick={() => handleQuitarAceptacion(item)}
                            disabled={disabled}
                            title="Quitar para elegir otro artículo"
                            className="flex-shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : item.estadoItem === 'no_disponible' && item.urlExterna ? (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-amber-700">Compra externa</p>
                            <a
                              href={item.urlExterna}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-700 underline break-all"
                            >
                              Ver publicación
                            </a>
                          </div>
                          <button
                            onClick={() => handleQuitarAceptacion(item)}
                            disabled={disabled}
                            title="Quitar para elegir otro artículo"
                            className="flex-shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : item.estadoItem === 'no_disponible' ? (
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-gray-500">No Disp.</p>
                          <button
                            onClick={() => handleQuitarAceptacion(item)}
                            disabled={disabled}
                            title="Quitar para elegir otro artículo"
                            className="flex-shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null}
                    </td>

                    <td className="px-2 py-2 w-[110px] border-b border-gray-300">
                      {editingItemId === item.id ? (
                        <div className="flex items-start gap-1">
                          <ArticuloCombobox
                            articulos={articulos}
                            value={item.articuloId}
                            onChange={(articulo) => handleSeleccionarArticulo(item, articulo)}
                            allowZeroStock
                            placeholder="Buscar artículo..."
                            dropdownClassName="min-w-[520px]"
                            className="flex-1"
                          />
                          <button
                            onClick={() => setEditingItemId(null)}
                            title="Cancelar búsqueda"
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {item.articuloIdSugerido &&
                            !(item.estadoItem === 'aceptado' && item.articuloId === item.articuloIdSugerido) && (
                            <button
                              onClick={() => handleAceptar(item)}
                              disabled={disabled}
                              className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5 flex-shrink-0" /> Aceptar Sug.
                            </button>
                          )}
                          <button
                            onClick={() => setEditingItemId(item.id)}
                            disabled={disabled}
                            className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 disabled:opacity-50"
                          >
                            <Search className="w-3.5 h-3.5 flex-shrink-0" /> Buscar otro
                          </button>
                          <button
                            onClick={() => handleBuscarMercadoLibre(item)}
                            disabled={disabled}
                            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 disabled:opacity-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> MercadoLibre
                          </button>
                          <button
                            onClick={() => handleBuscarGoogle(item)}
                            disabled={disabled}
                            className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 disabled:opacity-50"
                          >
                            <Globe className="w-3.5 h-3.5 flex-shrink-0" /> Google
                          </button>
                          {item.estadoItem !== 'no_disponible' && (
                            <button
                              onClick={() => handleMarcarNoDisponible(item)}
                              disabled={disabled}
                              className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 disabled:opacity-50"
                            >
                              <Ban className="w-3.5 h-3.5 flex-shrink-0" /> No Disp.
                            </button>
                          )}

                          {item.estadoItem !== 'aceptado' && (
                            <>
                              {item.urlExterna && item.estadoItem !== 'no_disponible' ? (
                                <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded">
                                  <a
                                    href={item.urlExterna}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary-700 underline break-all"
                                  >
                                    {item.urlExterna}
                                  </a>
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => handleAceptarUrlExterna(item)}
                                      disabled={disabled}
                                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 disabled:opacity-50"
                                    >
                                      <Check className="w-3 h-3" /> Aceptar
                                    </button>
                                    <button
                                      onClick={() => handleDeclinarUrlExterna(item)}
                                      disabled={disabled}
                                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                                    >
                                      <X className="w-3 h-3" /> Declinar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                !(item.estadoItem === 'no_disponible' && item.urlExterna) && (
                                  <button
                                    onClick={() => setPastingUrlItemId(item.id)}
                                    disabled={disabled}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50"
                                  >
                                    <Link2 className="w-3.5 h-3.5 flex-shrink-0" /> URL
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-2 w-[56px] border-b border-gray-300">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className="input px-1 text-center"
                        value={cantidades[item.id] ?? ''}
                        onChange={(e) =>
                          setCantidades((prev) => ({
                            ...prev,
                            [item.id]: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          }))
                        }
                        onBlur={() => handleCantidadBlur(item)}
                        disabled={disabled}
                      />
                    </td>

                    <td className="px-2 py-2 w-[90px] border-b border-gray-300">
                      <input
                        type="text"
                        className="input px-2"
                        value={unidades[item.id] ?? ''}
                        onChange={(e) => setUnidades((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => handleUnidadBlur(item)}
                        disabled={disabled}
                      />
                    </td>

                    <td className="px-2 py-2 w-[100px] border-b border-gray-300">
                      <input
                        type="text"
                        className="input px-2"
                        value={marcas[item.id] ?? ''}
                        onChange={(e) => setMarcas((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => handleMarcaBlur(item)}
                        disabled={disabled}
                      />
                    </td>

                    <td className="px-2 py-2 w-[100px] border-b border-gray-300">
                      <input
                        type="text"
                        className="input px-2"
                        value={modelos[item.id] ?? ''}
                        onChange={(e) => setModelos((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => handleModeloBlur(item)}
                        disabled={disabled}
                      />
                    </td>

                    <td className="px-2 py-2 w-[120px] border-b border-gray-300">
                      <CurrencyInput
                        value={precios[item.id]}
                        onChange={(val) => setPrecios((prev) => ({ ...prev, [item.id]: val }))}
                        onBlur={() => handlePrecioBlur(item)}
                        disabled={disabled}
                        placeholder="0,00"
                        className="px-2"
                      />
                    </td>

                    <td className="px-2 py-2 w-[120px] border-b border-gray-300">
                      <CurrencyInput
                        value={preciosUsd[item.id]}
                        onChange={(val) => setPreciosUsd((prev) => ({ ...prev, [item.id]: val }))}
                        onBlur={() => handlePrecioUsdBlur(item)}
                        disabled={disabled}
                        placeholder="0,00"
                        className="px-2"
                      />
                    </td>

                    <td className="px-2 py-2 w-[64px] border-b border-gray-300">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        className="input px-2"
                        value={markUps[item.id] ?? ''}
                        onChange={(e) =>
                          setMarkUps((prev) => ({
                            ...prev,
                            [item.id]: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          }))
                        }
                        onBlur={() => handleMarkUpBlur(item)}
                        disabled={disabled}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={9} className="px-2 py-2 text-right font-semibold border-t border-gray-300">Total</td>
                <td className="px-2 py-2 text-right font-semibold whitespace-nowrap border-t border-gray-300">${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                <td colSpan={2} className="border-t border-gray-300" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {itemPasteandoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCancelarPastearUrl} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Pegar URL del producto</h2>
            <p className="text-xs text-gray-500 mb-3 break-words">{itemPasteandoUrl.descripcionSolicitada}</p>
            <input
              type="text"
              autoFocus
              value={urlDrafts[itemPasteandoUrl.id] || ''}
              onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [itemPasteandoUrl.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGuardarUrlExterna(itemPasteandoUrl);
                if (e.key === 'Escape') handleCancelarPastearUrl();
              }}
              placeholder="https://..."
              className="input text-base w-full"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={handleCancelarPastearUrl} className="btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={() => handleGuardarUrlExterna(itemPasteandoUrl)} className="btn-primary">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarAgregarItems && solicitud.estado === 'en_revision' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCerrarAgregarItems} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Agregar Artículos</h2>
              <button onClick={handleCerrarAgregarItems} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <ItemsCaptureEditor
                items={nuevosItems}
                onItemsChange={setNuevosItems}
                fileName={nuevosItemsFileName}
                onFileNameChange={setNuevosItemsFileName}
              />

              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleCerrarAgregarItems} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={handleAgregarItems}
                  disabled={isAddingItems || nuevosItems.length === 0}
                  className="btn-primary disabled:opacity-50"
                >
                  {isAddingItems ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Agregar {nuevosItems.length > 0 ? `${nuevosItems.length} ` : ''}Ítems
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
