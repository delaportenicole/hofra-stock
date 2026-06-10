import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { stockService } from '../../services/stock.service';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { usePagination } from '../../hooks/usePagination';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { EntregaConRelaciones } from '@hofra/shared';

export function EntregasListPage() {
  const navigate = useNavigate();
  const [entregas, setEntregas] = useState<EntregaConRelaciones[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { page, limit, setPage, setLimit } = usePagination();

  useEffect(() => {
    loadEntregas();
  }, [page, limit]);

  const loadEntregas = async () => {
    setIsLoading(true);
    try {
      const result = await stockService.getEntregas({ page, limit });
      setEntregas(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalCantidad = (entrega: EntregaConRelaciones): number => {
    return entrega.items.reduce((sum, item) => sum + item.cantidad, 0);
  };

  const handlePrint = (entrega: EntregaConRelaciones, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar navegación al hacer click en la fila

    const fechaFormateada = format(new Date(entrega.fechaEntrega), "dd/MM/yyyy HH:mm", { locale: es });
    const costoTotal = entrega.items.reduce((sum, item) => {
      return sum + (item.articulo.costoInicialEstimado || 0) * item.cantidad;
    }, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Entrega - ${entrega.numeroCotizacionInterna}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-group { margin-bottom: 10px; }
          .info-label { font-weight: bold; color: #666; font-size: 12px; }
          .info-value { font-size: 14px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Comprobante de Entrega</h1>

        <div class="header-info">
          <div>
            <div class="info-group">
              <div class="info-label">N° Cotización Interna</div>
              <div class="info-value" style="font-size: 18px; font-weight: bold;">${entrega.numeroCotizacionInterna}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Fecha de Entrega</div>
              <div class="info-value">${fechaFormateada}</div>
            </div>
          </div>
          <div>
            <div class="info-group">
              <div class="info-label">Cliente</div>
              <div class="info-value" style="font-size: 16px;">${entrega.cliente.razonSocial}</div>
            </div>
            ${entrega.cliente.cuit ? `
            <div class="info-group">
              <div class="info-label">CUIT</div>
              <div class="info-value">${entrega.cliente.cuit}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Artículo</th>
              <th class="text-center">Cantidad</th>
              <th class="text-right">Costo Unit.</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${entrega.items.map(item => `
              <tr>
                <td style="font-family: monospace;">${item.articulo.codigo}</td>
                <td>${item.articulo.nombre}</td>
                <td class="text-center">${item.cantidad} ${item.articulo.unidad || 'u'}</td>
                <td class="text-right">$${(item.articulo.costoInicialEstimado || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td class="text-right">$${((item.articulo.costoInicialEstimado || 0) * item.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td class="text-center">${entrega.items.reduce((sum, i) => sum + i.cantidad, 0)}</td>
              <td></td>
              <td class="text-right">$${costoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        ${entrega.observaciones ? `
        <div style="margin-top: 20px;">
          <div class="info-label">Observaciones</div>
          <div class="info-value">${entrega.observaciones}</div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Documento generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
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

  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: EntregaConRelaciones) => (
        <span>{format(new Date(item.fechaEntrega), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
      ),
    },
    {
      key: 'cotizacion',
      header: 'N° Cotización',
      render: (item: EntregaConRelaciones) => (
        <span className="font-mono font-medium text-primary-600">{item.numeroCotizacionInterna}</span>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (item: EntregaConRelaciones) => item.cliente.razonSocial,
    },
    {
      key: 'articulos',
      header: 'Artículos',
      render: (item: EntregaConRelaciones) => (
        <div className="space-y-1">
          {item.items.slice(0, 2).map((i, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm font-mono text-gray-500">{i.articulo.codigo}</span>
              <span className="text-sm">{i.articulo.nombre}</span>
              <Badge variant="danger" className="text-xs">-{i.cantidad}</Badge>
            </div>
          ))}
          {item.items.length > 2 && (
            <span className="text-xs text-gray-500">+{item.items.length - 2} más...</span>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total Items',
      render: (item: EntregaConRelaciones) => (
        <Badge variant="secondary">{item.items.length} art.</Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Imprimir',
      render: (item: EntregaConRelaciones) => (
        <button
          onClick={(e) => handlePrint(item, e)}
          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Imprimir entrega"
        >
          <Printer className="w-5 h-5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
        <PermissionGuard modulo="entregas" accion="crear">
          <Link to="/entregas/nueva" className="btn-danger">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Entrega
          </Link>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={entregas}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onRowClick={(item) => navigate(`/entregas/${item.id}`)}
        emptyMessage="No hay entregas registradas"
      />
    </div>
  );
}
