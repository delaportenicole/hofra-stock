import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Save, Package, DollarSign, Calculator } from 'lucide-react';
import { stockService } from '../../services/stock.service';
import { articulosService } from '../../services/articulos.service';
import { proveedoresService } from '../../services/proveedores.service';
import { FormField, Input, Select, Textarea } from '../../components/FormField';
import { CurrencyInput } from '../../components/CurrencyInput';
import { ArticuloCombobox } from '../../components/ArticuloCombobox';
import { Badge, StockBadge } from '../../components/Badge';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Proveedor, ArticuloConRelaciones, CreateReposicionDto } from '@hofra/shared';

type FormData = CreateReposicionDto;

export function ReposicionFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedArticuloId = searchParams.get('articuloId');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [articulos, setArticulos] = useState<ArticuloConRelaciones[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [selectedArticulo, setSelectedArticulo] = useState<ArticuloConRelaciones | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      articuloId: preselectedArticuloId || undefined,
    },
  });

  const watchArticuloId = watch('articuloId');
  const watchCantidad = watch('cantidad');
  const watchCostoReposicion = watch('costoReposicion');
  const watchValorDolar = watch('valorDolarOficial');

  // Calcular costo unitario en dólares
  const costoUnitarioDolares =
    watchCostoReposicion && watchValorDolar
      ? (watchCostoReposicion / watchValorDolar).toFixed(2)
      : null;

  // Calcular importe total de reposición
  const importeTotal =
    watchCostoReposicion && watchCantidad
      ? watchCostoReposicion * watchCantidad
      : null;

  // Calcular importe total en dólares
  const importeTotalDolares =
    importeTotal && watchValorDolar
      ? (importeTotal / watchValorDolar).toFixed(2)
      : null;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (watchArticuloId) {
      const art = articulos.find((a) => a.id === watchArticuloId);
      setSelectedArticulo(art || null);
      if (art && art.proveedorId) {
        setValue('proveedorId', art.proveedorId);
      }
    } else {
      setSelectedArticulo(null);
    }
  }, [watchArticuloId, articulos]);

  const loadData = async () => {
    try {
      const [articulosRes, proveedoresData] = await Promise.all([
        articulosService.getAll({ limit: 500, activo: true }),
        proveedoresService.getActive(),
      ]);
      setArticulos(articulosRes.data);
      setProveedores(proveedoresData);

      if (preselectedArticuloId) {
        const art = articulosRes.data.find((a) => a.id === preselectedArticuloId);
        setSelectedArticulo(art || null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      // Limpiar link de compra vacío
      const submitData = {
        ...data,
        linkCompra: data.linkCompra?.trim() || undefined,
      };
      await stockService.createReposicion(submitData);
      toast.success('Reposicion registrada');
      navigate('/reposiciones');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleArticuloSelect = (articulo: ArticuloConRelaciones | null) => {
    if (articulo) {
      setValue('articuloId', articulo.id, { shouldDirty: true, shouldValidate: true });
      setSelectedArticulo(articulo);
      if (articulo.proveedorId) {
        setValue('proveedorId', articulo.proveedorId, { shouldDirty: true });
      }
    } else {
      setValue('articuloId', '', { shouldDirty: true });
      setSelectedArticulo(null);
    }
  };

  // Ordenar proveedores alfabeticamente
  const proveedoresOrdenados = [...proveedores].sort((a, b) =>
    (a.nombreFantasia || a.razonSocial).localeCompare(b.nombreFantasia || b.razonSocial, 'es', { sensitivity: 'base' })
  );

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/reposiciones')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Reposicion</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 card p-6 space-y-6">
          {/* Datos principales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Datos del Articulo</h3>

            {/* Articulo - Combobox con busqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Articulo <span className="text-red-500">*</span>
              </label>
              <ArticuloCombobox
                articulos={articulos}
                value={watchArticuloId || null}
                onChange={handleArticuloSelect}
                placeholder="Buscar por codigo o nombre..."
                allowZeroStock
              />
              {errors.articuloId && (
                <p className="mt-1 text-sm text-red-600">{errors.articuloId.message}</p>
              )}
              <input type="hidden" {...register('articuloId', { required: 'El articulo es requerido' })} />
            </div>

            {/* Fila 2: Proveedor + Cantidad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Proveedor" error={errors.proveedorId} required>
                <Select
                  {...register('proveedorId', { required: 'El proveedor es requerido' })}
                  error={errors.proveedorId}
                  options={proveedoresOrdenados.map((p) => ({
                    value: p.id,
                    label: p.nombreFantasia || p.razonSocial,
                  }))}
                />
              </FormField>

              <FormField label="Cantidad" error={errors.cantidad} required>
                <Input
                  type="number"
                  min="1"
                  {...register('cantidad', {
                    required: 'La cantidad es requerida',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Minimo 1' },
                  })}
                  error={errors.cantidad}
                />
              </FormField>
            </div>
          </div>

          {/* Costos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Costos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Costo Unitario por Artículo (ARS)" error={errors.costoReposicion} required>
                <Controller
                  name="costoReposicion"
                  control={control}
                  rules={{
                    required: 'El costo es requerido',
                    min: { value: 0.01, message: 'El costo debe ser mayor a 0' },
                  }}
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      error={!!errors.costoReposicion}
                      placeholder="0,00"
                    />
                  )}
                />
                <p className="text-xs text-gray-500 mt-1">Precio por unidad de artículo</p>
              </FormField>

              <FormField label="Valor Dolar Oficial" error={errors.valorDolarOficial} required>
                <Controller
                  name="valorDolarOficial"
                  control={control}
                  rules={{
                    required: 'El valor del dolar es requerido',
                    min: { value: 0.01, message: 'El valor debe ser mayor a 0' },
                  }}
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      error={!!errors.valorDolarOficial}
                      placeholder="1.200,00"
                    />
                  )}
                />
              </FormField>
            </div>

            {(costoUnitarioDolares || importeTotal) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <Calculator className="w-5 h-5" />
                  Resumen de Costos
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {costoUnitarioDolares && (
                    <div>
                      <p className="text-sm text-blue-600">Costo Unitario en USD</p>
                      <p className="text-lg font-bold text-blue-800">USD {costoUnitarioDolares}</p>
                    </div>
                  )}
                  {importeTotal && (
                    <div>
                      <p className="text-sm text-blue-600">Importe Total (ARS)</p>
                      <p className="text-lg font-bold text-blue-800">
                        ${importeTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
                {importeTotalDolares && (
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-sm text-blue-600">Importe Total de Reposición en USD</p>
                    <p className="text-2xl font-bold text-blue-900">USD {importeTotalDolares}</p>
                    <p className="text-xs text-blue-500 mt-1">
                      = {watchCantidad} unidades × ${watchCostoReposicion?.toLocaleString('es-AR')} c/u
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lote y Vencimiento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Lote y Vencimiento</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Lote / Partida" error={errors.lotePartida}>
                <Input
                  type="text"
                  placeholder="Ej: LOTE-2024-001"
                  {...register('lotePartida')}
                  error={errors.lotePartida}
                />
              </FormField>

              <FormField label="Fecha de Vencimiento" error={errors.fechaVencimiento}>
                <Input
                  type="date"
                  {...register('fechaVencimiento')}
                  error={errors.fechaVencimiento}
                />
              </FormField>
            </div>
          </div>

          {/* Lugar de Compra */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informacion de Compra</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Lugar de Compra" error={errors.lugarCompra}>
                <Input
                  type="text"
                  placeholder="Ej: MercadoLibre, Local Centro, etc."
                  {...register('lugarCompra')}
                  error={errors.lugarCompra}
                />
              </FormField>

              <FormField label="Link de Compra" error={errors.linkCompra}>
                <Input
                  type="url"
                  placeholder="https://..."
                  {...register('linkCompra')}
                  error={errors.linkCompra}
                />
              </FormField>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-4">
            <FormField label="Observaciones" error={errors.observaciones}>
              <Textarea {...register('observaciones')} placeholder="Notas adicionales..." />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate('/reposiciones')} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="btn-success">
              {isSaving ? 'Registrando...' : <><Save className="w-5 h-5 mr-2" />Registrar Reposicion</>}
            </button>
          </div>
        </form>

        {/* Panel lateral - Info del articulo */}
        {selectedArticulo && (
          <div className="card p-6 h-fit">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Articulo Seleccionado</h3>
            </div>

            {selectedArticulo.imagenUrl && (
              <img
                src={selectedArticulo.imagenUrl}
                alt={selectedArticulo.nombre}
                className="w-full rounded-lg mb-4"
              />
            )}

            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Codigo</dt>
                <dd className="font-mono font-medium">{selectedArticulo.codigo}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Nombre</dt>
                <dd className="font-medium">{selectedArticulo.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Rubro</dt>
                <dd><Badge variant="primary">{selectedArticulo.rubro.nombre}</Badge></dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Stock Actual</dt>
                <dd><StockBadge stock={selectedArticulo.stock} stockMinimo={selectedArticulo.stockMinimo} /></dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Stock Minimo</dt>
                <dd className="font-medium">{selectedArticulo.stockMinimo}</dd>
              </div>
              {selectedArticulo.ubicacion && (
                <div>
                  <dt className="text-sm text-gray-500">Ubicacion</dt>
                  <dd className="font-medium">{selectedArticulo.ubicacion}</dd>
                </div>
              )}
            </dl>

            {watchCantidad > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Stock despues de reposicion:</p>
                <p className="text-2xl font-bold text-green-600">
                  {selectedArticulo.stock + (watchCantidad || 0)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
