import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { ArrowLeft, Save, Loader2, DollarSign, Plus } from 'lucide-react';
import { articulosService } from '../../services/articulos.service';
import { rubrosService } from '../../services/rubros.service';
import { proveedoresService } from '../../services/proveedores.service';
import { presentacionesService } from '../../services/presentaciones.service';
import { marcasService } from '../../services/marcas.service';
import { FormField, Input, Select, Textarea, Checkbox, Combobox } from '../../components/FormField';
import { ImageUpload } from '../../components/ImageUpload';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import { UNIDADES } from '@hofra/shared';
import toast from 'react-hot-toast';
import type { Rubro, Proveedor, Presentacion, Marca, CreateArticuloDto, UpdateArticuloDto } from '@hofra/shared';

type FormData = CreateArticuloDto & { activo?: boolean; valorDolarCostoInicial?: number };

export function ArticuloFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCodigo, setIsGeneratingCodigo] = useState(false);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [showNuevaMarcaInput, setShowNuevaMarcaInput] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  // Observar cambios en el rubro para generar código automáticamente
  const selectedRubroId = useWatch({ control, name: 'rubroId' });

  // Observar costo inicial y valor dólar para calcular USD
  const costoInicialEstimado = useWatch({ control, name: 'costoInicialEstimado' });
  const valorDolarCostoInicial = useWatch({ control, name: 'valorDolarCostoInicial' });

  // Observar marca para el combobox
  const watchMarca = useWatch({ control, name: 'marca' });

  // Calcular costo en USD
  const costoInicialEstimadoUsd =
    costoInicialEstimado && valorDolarCostoInicial
      ? costoInicialEstimado / valorDolarCostoInicial
      : null;

  const generateCodigo = useCallback(async (rubroId: string) => {
    if (!rubroId || isEditing) return;

    setIsGeneratingCodigo(true);
    try {
      const codigo = await articulosService.generateCodigo(rubroId);
      setValue('codigo', codigo);
    } catch (error) {
      console.error('Error generating codigo:', error);
    } finally {
      setIsGeneratingCodigo(false);
    }
  }, [isEditing, setValue]);

  useEffect(() => {
    if (selectedRubroId && !isEditing) {
      generateCodigo(selectedRubroId);
    }
  }, [selectedRubroId, isEditing, generateCodigo]);

  const loadMarcas = useCallback(async () => {
    try {
      const marcasData = await marcasService.getActive();
      setMarcas(marcasData);
    } catch (error) {
      console.error('Error loading marcas:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      rubrosService.getActive(),
      proveedoresService.getActive(),
      presentacionesService.getActive(),
      marcasService.getActive(),
    ]).then(([rubrosData, proveedoresData, presentacionesData, marcasData]) => {
      setRubros(rubrosData);
      setProveedores(proveedoresData);
      setPresentaciones(presentacionesData);
      setMarcas(marcasData);
    });

    if (isEditing) {
      loadArticulo();
    }
  }, [id]);

  const loadArticulo = async () => {
    try {
      const articulo = await articulosService.getById(id!);
      reset({
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        descripcion: articulo.descripcion || undefined,
        rubroId: articulo.rubroId,
        proveedorId: articulo.proveedorId || undefined,
        stockMinimo: articulo.stockMinimo,
        unidad: articulo.unidad,
        presentacion: articulo.presentacion || undefined,
        marca: articulo.marca || undefined,
        sku: articulo.sku || undefined,
        etm: articulo.etm || undefined,
        stockActual: articulo.stockActual || 0,
        ubicacion: articulo.ubicacion || undefined,
        costoInicialEstimado: articulo.costoInicialEstimado || undefined,
        valorDolarCostoInicial: articulo.valorDolarCostoInicial || undefined,
        activo: articulo.activo,
      });
      setImagenUrl(articulo.imagenUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/articulos');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        await articulosService.update(id!, data);
        toast.success('Artículo actualizado');
      } else {
        // Create the article first
        const newArticulo = await articulosService.create(data);

        // If there's a pending image, upload it
        if (pendingImageFile && newArticulo.id) {
          try {
            await articulosService.uploadImage(newArticulo.id, pendingImageFile);
          } catch (imgError) {
            console.error('Error uploading image:', imgError);
            toast.error('Artículo creado, pero hubo un error al subir la imagen');
          }
        }
        toast.success('Artículo creado');
      }
      navigate('/articulos');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    if (isEditing && id) {
      // Edit mode: upload immediately
      try {
        const url = await articulosService.uploadImage(id, file);
        setImagenUrl(url);
        toast.success('Imagen subida');
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    } else {
      // Create mode: store file for later upload
      setPendingImageFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDeleteImage = async () => {
    if (isEditing && id) {
      // Edit mode: delete from server
      try {
        await articulosService.deleteImage(id);
        setImagenUrl(null);
        toast.success('Imagen eliminada');
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    } else {
      // Create mode: just clear the pending file
      setPendingImageFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  const handleAddMarca = async (nombreMarca?: string) => {
    const marcaToAdd = nombreMarca || nuevaMarca;
    if (!marcaToAdd.trim()) return;

    try {
      const marca = await marcasService.findOrCreate(marcaToAdd.trim());
      await loadMarcas();
      setValue('marca', marca.nombre);
      setNuevaMarca('');
      setShowNuevaMarcaInput(false);
      toast.success('Marca guardada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/articulos')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Artículo' : 'Nuevo Artículo'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Código" error={errors.codigo} required>
                <div className="relative">
                  <Input
                    {...register('codigo', { required: 'El código es requerido' })}
                    error={errors.codigo}
                    placeholder={isEditing ? '' : 'Seleccione un rubro'}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}
                  />
                  {isGeneratingCodigo && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <p className="text-xs text-gray-500 mt-1">
                    Se genera automaticamente segun el rubro
                  </p>
                )}
              </FormField>

              <FormField label="Unidad" error={errors.unidad} required>
                <Select
                  {...register('unidad', { required: 'La unidad es requerida' })}
                  error={errors.unidad}
                  options={UNIDADES.map((u) => ({ value: u, label: u }))}
                />
              </FormField>

              <FormField label="Presentación" error={errors.presentacion}>
                <Select
                  {...register('presentacion')}
                  error={errors.presentacion}
                  options={presentaciones.map((p) => ({ value: p.nombre, label: p.nombre }))}
                  placeholder="Seleccionar presentación"
                />
              </FormField>
            </div>

            <FormField label="Nombre" error={errors.nombre} required>
              <Input
                {...register('nombre', {
                  required: 'El nombre es requerido',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
                error={errors.nombre}
                placeholder="Martillo carpintero 500g"
              />
            </FormField>

            <FormField label="Descripción" error={errors.descripcion}>
              <Textarea
                {...register('descripcion')}
                placeholder="Descripción detallada del artículo..."
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Rubro" error={errors.rubroId} required>
                <Select
                  {...register('rubroId', { required: 'El rubro es requerido' })}
                  error={errors.rubroId}
                  options={rubros.map((r) => ({ value: r.id, label: r.nombre }))}
                />
              </FormField>

              <FormField label="Proveedor" error={errors.proveedorId}>
                <Select
                  {...register('proveedorId')}
                  error={errors.proveedorId}
                  options={proveedores.map((p) => ({ value: p.id, label: p.razonSocial }))}
                  placeholder="Sin proveedor asignado"
                />
              </FormField>
            </div>

            {/* Campos de stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Stock Mínimo" error={errors.stockMinimo}>
                <Input
                  type="number"
                  min="0"
                  {...register('stockMinimo', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'No puede ser negativo' },
                  })}
                  error={errors.stockMinimo}
                  placeholder="10"
                />
              </FormField>

              <FormField label="Stock Actual" error={errors.stockActual}>
                <Input
                  type="number"
                  min="0"
                  {...register('stockActual', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'No puede ser negativo' },
                  })}
                  error={errors.stockActual}
                  placeholder="0"
                />
              </FormField>
            </div>

            {/* Costo Inicial Estimado */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Costo Inicial Estimado (para valuación)</h3>
              <p className="text-xs text-gray-500">
                Solo necesario para stock que no proviene de una reposición registrada
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Costo Unitario (ARS)" error={errors.costoInicialEstimado}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('costoInicialEstimado', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'No puede ser negativo' },
                    })}
                    error={errors.costoInicialEstimado}
                    placeholder="0.00"
                  />
                </FormField>

                <FormField label="Valor Dólar Oficial" error={errors.valorDolarCostoInicial}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('valorDolarCostoInicial', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'No puede ser negativo' },
                    })}
                    error={errors.valorDolarCostoInicial}
                    placeholder="1200.00"
                  />
                </FormField>

                <FormField label="Costo Unitario (USD)">
                  <div className="flex items-center h-10 px-3 bg-gray-100 border border-gray-200 rounded-lg">
                    <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-gray-700">
                      {costoInicialEstimadoUsd
                        ? costoInicialEstimadoUsd.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '-'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Auto-calculado</p>
                </FormField>
              </div>
            </div>

            {/* Campos adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Marca" error={errors.marca}>
                <div className="flex gap-2">
                  <Combobox
                    value={watchMarca || ''}
                    onChange={(value) => setValue('marca', value)}
                    options={marcas.map((m) => ({ value: m.nombre, label: m.nombre }))}
                    placeholder="Buscar o escribir marca..."
                    error={errors.marca}
                    className="flex-1"
                  />
                  {watchMarca && !marcas.some((m) => m.nombre.toLowerCase() === watchMarca.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleAddMarca(watchMarca)}
                      className="btn-primary px-3"
                      title="Guardar nueva marca"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {watchMarca && !marcas.some((m) => m.nombre.toLowerCase() === watchMarca.toLowerCase()) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Marca nueva. Haga clic en + para guardarla.
                  </p>
                )}
              </FormField>

              <FormField label="SKU" error={errors.sku}>
                <Input
                  {...register('sku')}
                  error={errors.sku}
                  placeholder="Código SKU"
                />
              </FormField>

              <FormField label="ETM" error={errors.etm}>
                <Input
                  {...register('etm')}
                  error={errors.etm}
                  placeholder="Código ETM"
                />
              </FormField>
            </div>

            <FormField label="Ubicación" error={errors.ubicacion}>
              <Input
                {...register('ubicacion')}
                error={errors.ubicacion}
                placeholder="Ej: Estante A, Pasillo 3, etc."
              />
            </FormField>

            {isEditing && (
              <div className="pt-4 border-t border-gray-200">
                <Checkbox
                  {...register('activo')}
                  label="Artículo activo"
                />
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="label">Imagen</label>
            <ImageUpload
              currentImageUrl={isEditing ? imagenUrl : previewUrl}
              onUpload={handleUploadImage}
              onDelete={handleDeleteImage}
            />
            {!isEditing && pendingImageFile && (
              <p className="mt-2 text-sm text-gray-500">
                La imagen se subirá al guardar el artículo
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/articulos')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? (
              'Guardando...'
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
