import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, X, Image as ImageIcon } from 'lucide-react';
import { stockService } from '../../services/stock.service';
import { articulosService } from '../../services/articulos.service';
import { clientesService } from '../../services/clientes.service';
import { FormField, Input, Select, Textarea } from '../../components/FormField';
import { ArticuloCombobox } from '../../components/ArticuloCombobox';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Cliente, ArticuloConRelaciones, CreateEntregaDto, CreateEntregaItemDto } from '@hofra/shared';

interface FormData {
  clienteId: string;
  numeroCotizacion: string;
  purchaseOrder?: string;
  observaciones?: string;
}

interface CartItem {
  articuloId: string;
  articulo: ArticuloConRelaciones;
  cantidad: number;
}

export function EntregaFormPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [articulos, setArticulos] = useState<ArticuloConRelaciones[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedArticulo, setSelectedArticulo] = useState<ArticuloConRelaciones | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [imagenAmpliada, setImagenAmpliada] = useState<{ url: string; nombre: string } | null>(null);
  const cantidadInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [articulosRes, clientesData] = await Promise.all([
        articulosService.getAll({ limit: 500, activo: true }),
        clientesService.getActive(),
      ]);
      setArticulos(articulosRes.data);
      setClientes(clientesData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableStock = (articuloId: string): number => {
    const articulo = articulos.find(a => a.id === articuloId);
    if (!articulo) return 0;

    // Subtract already added quantities from cart
    const inCart = cartItems
      .filter(item => item.articuloId === articuloId)
      .reduce((sum, item) => sum + item.cantidad, 0);

    return articulo.stock - inCart;
  };

  const handleArticuloSelect = (articulo: ArticuloConRelaciones | null) => {
    setSelectedArticulo(articulo);
    if (articulo) {
      // Focus en el campo de cantidad
      setTimeout(() => cantidadInputRef.current?.focus(), 100);
    }
  };

  const handleAddToCart = () => {
    if (!selectedArticulo || cantidad < 1) return;

    const availableStock = getAvailableStock(selectedArticulo.id);
    if (cantidad > availableStock) {
      toast.error(`Stock insuficiente. Disponible: ${availableStock}`);
      return;
    }

    // Check if article already in cart
    const existingIndex = cartItems.findIndex(item => item.articuloId === selectedArticulo.id);

    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...cartItems];
      newItems[existingIndex].cantidad += cantidad;
      setCartItems(newItems);
    } else {
      // Add new item
      setCartItems([...cartItems, {
        articuloId: selectedArticulo.id,
        articulo: selectedArticulo,
        cantidad,
      }]);
    }

    // Reset selection
    setSelectedArticulo(null);
    setCantidad(1);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, newCantidad: number) => {
    if (newCantidad < 1) return;

    const item = cartItems[index];
    const articulo = articulos.find(a => a.id === item.articuloId);
    if (!articulo) return;

    // Calculate available stock (current stock minus other cart items for same article)
    const otherCartQuantity = cartItems
      .filter((_, i) => i !== index && cartItems[i].articuloId === item.articuloId)
      .reduce((sum, item) => sum + item.cantidad, 0);

    const maxAvailable = articulo.stock - otherCartQuantity;

    if (newCantidad > maxAvailable) {
      toast.error(`Stock insuficiente. Máximo disponible: ${maxAvailable}`);
      return;
    }

    const newItems = [...cartItems];
    newItems[index].cantidad = newCantidad;
    setCartItems(newItems);
  };

  const onSubmit = async (data: FormData) => {
    if (cartItems.length === 0) {
      toast.error('Debe agregar al menos un artículo');
      return;
    }

    setIsSaving(true);
    try {
      const entregaData: CreateEntregaDto = {
        clienteId: data.clienteId,
        numeroCotizacionInterna: `#${data.numeroCotizacion}`,
        purchaseOrder: data.purchaseOrder || undefined,
        items: cartItems.map(item => ({
          articuloId: item.articuloId,
          cantidad: item.cantidad,
        })),
        observaciones: data.observaciones,
      };

      await stockService.createEntrega(entregaData);
      toast.success('Entrega registrada');
      navigate('/entregas');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  const availableStock = selectedArticulo ? getAvailableStock(selectedArticulo.id) : 0;

  // Calcular costo total del carrito
  const calcularSubtotal = (item: CartItem): number => {
    return (item.articulo.costoInicialEstimado || 0) * item.cantidad;
  };

  const costoTotal = cartItems.reduce((sum, item) => sum + calcularSubtotal(item), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/entregas')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Entrega</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Datos de la entrega */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos de la Entrega</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Cliente" error={errors.clienteId} required>
              <Select
                {...register('clienteId', { required: 'El cliente es requerido' })}
                error={errors.clienteId}
                options={clientes.map((c) => ({
                  value: c.id,
                  label: c.razonSocial,
                }))}
              />
            </FormField>

            <FormField label="N° Cotización Interna" error={errors.numeroCotizacion} required>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-500 font-mono font-medium">
                  #
                </span>
                <input
                  type="text"
                  {...register('numeroCotizacion', {
                    required: 'El número de cotización es requerido',
                  })}
                  className={`input rounded-l-none flex-1 ${errors.numeroCotizacion ? 'border-danger-500' : ''}`}
                  placeholder="12345"
                />
              </div>
            </FormField>

            <FormField label="Purchase Order">
              <Input
                {...register('purchaseOrder')}
                placeholder="PO-12345"
              />
            </FormField>
          </div>
        </div>

        {/* Agregar artículos */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agregar Artículos</h2>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="label">Buscar artículo por código o nombre</label>
              <ArticuloCombobox
                articulos={articulos}
                value={selectedArticulo?.id || null}
                onChange={handleArticuloSelect}
                getAvailableStock={getAvailableStock}
                placeholder="Escribí código o nombre del artículo..."
              />
            </div>

            <div className="w-32">
              <label className="label">Cantidad</label>
              <input
                ref={cantidadInputRef}
                type="number"
                min="1"
                max={availableStock > 0 ? availableStock : undefined}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                className="input"
              />
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedArticulo || cantidad < 1 || cantidad > availableStock}
              className="btn-primary h-10"
            >
              <Plus className="w-5 h-5 mr-1" />
              Agregar
            </button>
          </div>

          {selectedArticulo && (
            <p className="mt-2 text-sm text-gray-500">
              Stock disponible: {availableStock}
              {selectedArticulo.costoInicialEstimado && (
                <span className="ml-2">• Costo: ${selectedArticulo.costoInicialEstimado.toLocaleString('es-AR')}</span>
              )}
            </p>
          )}
        </div>

        {/* Carrito / Ticket */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Artículos a Entregar ({cartItems.length})
            </h2>
          </div>

          {cartItems.length === 0 ? (
            <p className="px-6 py-8 text-gray-500 text-center">
              No hay artículos agregados. Use el formulario de arriba para agregar artículos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">Img</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cartItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        {item.articulo.imagenUrl ? (
                          <button
                            type="button"
                            onClick={() => setImagenAmpliada({ url: item.articulo.imagenUrl!, nombre: item.articulo.nombre })}
                            className="w-10 h-10 rounded border border-gray-200 overflow-hidden hover:border-primary-500 hover:shadow-md transition-all cursor-pointer"
                            title="Click para ampliar"
                          >
                            <img
                              src={item.articulo.imagenUrl}
                              alt={item.articulo.nombre}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center mx-auto">
                            <ImageIcon className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{item.articulo.codigo}</td>
                      <td className="px-4 py-3 font-medium">{item.articulo.nombre}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(index, item.cantidad - 1)}
                            className="p-1 rounded hover:bg-gray-200"
                            disabled={item.cantidad <= 1}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-16 text-center input py-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(index, item.cantidad + 1)}
                            className="p-1 rounded hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {item.articulo.costoInicialEstimado
                          ? `$${item.articulo.costoInicialEstimado.toLocaleString('es-AR')}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.articulo.costoInicialEstimado
                          ? `$${calcularSubtotal(item).toLocaleString('es-AR')}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(index)}
                          className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {cartItems.length > 0 && (
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right font-semibold text-gray-700">
                        Total Entrega:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-primary-700">
                        ${costoTotal.toLocaleString('es-AR')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="card p-6">
          <FormField label="Observaciones" error={errors.observaciones}>
            <Textarea {...register('observaciones')} placeholder="Notas adicionales..." />
          </FormField>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/entregas')} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || cartItems.length === 0}
            className="btn-danger"
          >
            {isSaving ? 'Registrando...' : <><Save className="w-5 h-5 mr-2" />Registrar Entrega</>}
          </button>
        </div>
      </form>

      {/* Modal de imagen ampliada */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setImagenAmpliada(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={imagenAmpliada.url}
              alt={imagenAmpliada.nombre}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-3 text-sm">{imagenAmpliada.nombre}</p>
          </div>
        </div>
      )}
    </div>
  );
}
