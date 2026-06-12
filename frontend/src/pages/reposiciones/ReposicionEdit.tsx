import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Save, Package, DollarSign, Calculator } from 'lucide-react';
import { stockService } from '../../services/stock.service';
import { proveedoresService } from '../../services/proveedores.service';
import { FormField, Input, Select, Textarea } from '../../components/FormField';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Badge } from '../../components/Badge';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Proveedor, ReposicionConRelaciones, UpdateReposicionDto } from '@hofra/shared';

type FormData = UpdateReposicionDto;

export function ReposicionEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reposicion, setReposicion] = useState<ReposicionConRelaciones | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>();

  const watchCostoReposicion = watch('costoReposicion');
  const watchValorDolar = watch('valorDolarOficial');

  // Calcular costo unitario en dólares
  const costoUnitarioDolares =
    watchCostoReposicion && watchValorDolar
      ? (watchCostoReposicion / watchValorDolar).toFixed(2)
      : null;

  // Calcular importe total de reposición
  const importeTotal =
    watchCostoReposicion && reposicion?.cantidad
      ? watchCostoReposicion * reposicion.cantidad
      : null;

  // Calcular importe total en dólares
  const importeTotalDolares =
    importeTotal && watchValorDolar
      ? (importeTotal / watchValorDolar).toFixed(2)
      : null;

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [reposicionData, proveedoresData] = await Promise.all([
        stockService.getReposicionById(id!),
        proveedoresService.getActive(),
      ]);

      if (reposicionData.estado !== 'en_curso') {
        toast.error('Solo se pueden editar reposiciones en curso');
        navigate('/reposiciones');
        return;
      }

      setReposicion(reposicionData);
      setProveedores(proveedoresData);

      reset({
        proveedorId: reposicionData.proveedorId,
        costoReposicion: reposicionData.costoReposicion || undefined,
        valorDolarOficial: reposicionData.valorDolarOficial || undefined,
        observaciones: reposicionData.observaciones || undefined,
        fechaVencimiento: reposicionData.fechaVencimiento
          ? new Date(reposicionData.fechaVencimiento).toISOString().split('T')[0] as unknown as Date
          : undefined,
        lotePartida: reposicionData.lotePartida || undefined,
        linkCompra: reposicionData.linkCompra || undefined,
        lugarCompra: reposicionData.lugarCompra || undefined,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/reposiciones');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const submitData = {
        ...data,
        linkCompra: data.linkCompra?.trim() || undefined,
      };
      await stockService.updateReposicion(id!, submitData);
      toast.success('Reposicion actualizada');
      navigate(`/reposiciones/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!reposicion) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/reposiciones/${id}`)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Editar Reposicion</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 card p-6 space-y-6">
          {/* Info del articulo (solo lectura) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Articulo</p>
            <p className="font-semibold">{reposicion.articulo.nombre}</p>
            <p className="text-sm text-gray-500 font-mono">{reposicion.articulo.codigo}</p>
            <div className="mt-2">
              <Badge variant="success">+{reposicion.cantidad} unidades</Badge>
            </div>
          </div>

          {/* Proveedor */}
          <FormField label="Proveedor" error={errors.proveedorId}>
            <Select
              {...register('proveedorId')}
              error={errors.proveedorId}
              options={proveedores.map((p) => ({
                value: p.id,
                label: p.nombreFantasia || p.razonSocial,
              }))}
            />
          </FormField>

          {/* Costos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Costos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Costo Unitario por Artículo (ARS)" error={errors.costoReposicion}>
                <Controller
                  name="costoReposicion"
                  control={control}
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

              <FormField label="Valor Dolar Oficial" error={errors.valorDolarOficial}>
                <Controller
                  name="valorDolarOficial"
                  control={control}
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
                {importeTotalDolares && reposicion && (
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-sm text-blue-600">Importe Total de Reposición en USD</p>
                    <p className="text-2xl font-bold text-blue-900">USD {importeTotalDolares}</p>
                    <p className="text-xs text-blue-500 mt-1">
                      = {reposicion.cantidad} unidades × ${watchCostoReposicion?.toLocaleString('es-AR')} c/u
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
            <button type="button" onClick={() => navigate(`/reposiciones/${id}`)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Guardando...' : <><Save className="w-5 h-5 mr-2" />Guardar Cambios</>}
            </button>
          </div>
        </form>

        {/* Panel lateral */}
        <div className="card p-6 h-fit">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-6 h-6 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Articulo</h3>
          </div>

          {reposicion.articulo.imagenUrl && (
            <img
              src={reposicion.articulo.imagenUrl}
              alt={reposicion.articulo.nombre}
              className="w-full h-32 object-cover rounded-lg mb-4"
            />
          )}

          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Codigo</dt>
              <dd className="font-mono font-medium">{reposicion.articulo.codigo}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Nombre</dt>
              <dd className="font-medium">{reposicion.articulo.nombre}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Stock Actual</dt>
              <dd className="font-medium">{reposicion.articulo.stock}</dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Nota: No se puede modificar el articulo ni la cantidad de una reposicion ya registrada.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
