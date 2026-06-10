import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Lightbulb } from 'lucide-react';
import { sugerenciasService } from '../../services/sugerencias.service';
import { FormField, Input, Select, Textarea } from '../../components/FormField';
import { Badge } from '../../components/Badge';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { CreateSugerenciaDto, UpdateSugerenciaDto, PrioridadSugerencia, EstadoSugerencia } from '@hofra/shared';

type FormData = {
  titulo: string;
  descripcion: string;
  prioridad: PrioridadSugerencia;
  estado?: EstadoSugerencia;
};

const prioridadOptions = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

const estadoOptions = [
  { value: 'nueva', label: 'Nueva' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'resuelta', label: 'Resuelta' },
  { value: 'cancelada', label: 'Cancelada' },
];

export function SugerenciaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [creador, setCreador] = useState<{ nombre: string; apellido: string } | null>(null);
  const [fechaCreacion, setFechaCreacion] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      prioridad: 'media',
    },
  });

  useEffect(() => {
    if (isEditing) {
      loadSugerencia();
    }
  }, [id]);

  const loadSugerencia = async () => {
    try {
      const sugerencia = await sugerenciasService.getById(id!);
      reset({
        titulo: sugerencia.titulo,
        descripcion: sugerencia.descripcion,
        prioridad: sugerencia.prioridad,
        estado: sugerencia.estado,
      });
      setCreador(sugerencia.creador);
      setFechaCreacion(new Date(sugerencia.createdAt));
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/sugerencias');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        const updateData: UpdateSugerenciaDto = {
          titulo: data.titulo,
          descripcion: data.descripcion,
          prioridad: data.prioridad,
          estado: data.estado,
        };
        await sugerenciasService.update(id!, updateData);
        toast.success('Sugerencia actualizada');
      } else {
        const createData: CreateSugerenciaDto = {
          titulo: data.titulo,
          descripcion: data.descripcion,
          prioridad: data.prioridad,
        };
        await sugerenciasService.create(createData);
        toast.success('Sugerencia creada');
      }
      navigate('/sugerencias');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sugerencias')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Sugerencia' : 'Nueva Sugerencia'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div className="card p-6 space-y-4">
          {isEditing && creador && fechaCreacion && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                Creado por <span className="font-medium">{creador.nombre} {creador.apellido}</span> el{' '}
                <span className="font-medium">
                  {format(fechaCreacion, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                </span>
              </p>
            </div>
          )}

          <FormField label="Título" error={errors.titulo} required>
            <Input
              {...register('titulo', {
                required: 'El título es requerido',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                maxLength: { value: 200, message: 'Máximo 200 caracteres' },
              })}
              error={errors.titulo}
              placeholder="Ej: Agregar filtro de fechas en reportes"
            />
          </FormField>

          <FormField label="Descripción" error={errors.descripcion} required>
            <Textarea
              {...register('descripcion', {
                required: 'La descripción es requerida',
                minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                maxLength: { value: 2000, message: 'Máximo 2000 caracteres' },
              })}
              rows={5}
              placeholder="Describe la sugerencia con el mayor detalle posible..."
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Prioridad" error={errors.prioridad} required>
              <Select
                {...register('prioridad', { required: 'La prioridad es requerida' })}
                error={errors.prioridad}
                options={prioridadOptions}
              />
            </FormField>

            {isEditing && (
              <FormField label="Estado" error={errors.estado}>
                <Select
                  {...register('estado')}
                  error={errors.estado}
                  options={estadoOptions}
                />
              </FormField>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/sugerencias')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? (
              'Guardando...'
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear Sugerencia'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
