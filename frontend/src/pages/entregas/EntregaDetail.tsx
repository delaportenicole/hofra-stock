import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { stockService } from '../../services/stock.service';
import { PageLoader } from '../../components/LoadingSpinner';
import { Badge } from '../../components/Badge';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { EntregaConRelaciones } from '@hofra/shared';

export function EntregaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [entrega, setEntrega] = useState<EntregaConRelaciones | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntrega();
  }, [id]);

  const loadEntrega = async () => {
    try {
      const data = await stockService.getEntregaById(id!);
      setEntrega(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/entregas');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!entrega) return null;

  const totalItems = entrega.items.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/entregas')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Entrega {entrega.numeroCotizacionInterna}
          </h1>
          <p className="text-sm text-gray-500">
            {format(new Date(entrega.fechaEntrega), "EEEE d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detalle de artículos */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Artículos Entregados ({entrega.items.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entrega.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.open(`/articulos/${item.articuloId}`, '_blank')}
                    >
                      <td className="px-4 py-3 font-mono text-sm">{item.articulo.codigo}</td>
                      <td className="px-4 py-3 font-medium">{item.articulo.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.articulo.unidad}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="danger">-{item.cantidad}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-medium text-gray-700">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="danger" className="text-base">-{totalItems}</Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar con info */}
        <div className="space-y-6">
          {/* Cliente */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Cliente</h3>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Razón Social</dt>
                <dd className="font-medium">{entrega.cliente.razonSocial}</dd>
              </div>
              {entrega.cliente.cuit && (
                <div>
                  <dt className="text-sm text-gray-500">CUIT</dt>
                  <dd className="font-mono">{entrega.cliente.cuit}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Info de la entrega */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Información</h3>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">N° Cotización Interna</dt>
                <dd className="font-mono font-medium text-primary-600">{entrega.numeroCotizacionInterna}</dd>
              </div>
              {entrega.purchaseOrder && (
                <div>
                  <dt className="text-sm text-gray-500">Purchase Order</dt>
                  <dd className="font-mono">{entrega.purchaseOrder}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Fecha de Entrega</dt>
                <dd>{format(new Date(entrega.fechaEntrega), 'dd/MM/yyyy HH:mm', { locale: es })}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Total Artículos</dt>
                <dd>{entrega.items.length} tipos, {totalItems} unidades</dd>
              </div>
              {entrega.observaciones && (
                <div>
                  <dt className="text-sm text-gray-500">Observaciones</dt>
                  <dd className="text-sm">{entrega.observaciones}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
