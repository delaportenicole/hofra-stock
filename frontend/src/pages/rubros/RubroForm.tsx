import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { rubrosService } from '../../services/rubros.service';
import { FormField, Input, Textarea, Checkbox } from '../../components/FormField';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { CreateRubroDto } from '@hofra/shared';

type FormData = CreateRubroDto & { activo?: boolean };

export function RubroFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    if (isEditing) {
      loadRubro();
    }
  }, [id]);

  const loadRubro = async () => {
    try {
      const rubro = await rubrosService.getById(id!);
      reset({
        nombre: rubro.nombre,
        descripcion: rubro.descripcion || undefined,
        prefijo: rubro.prefijo,
        activo: rubro.activo,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/rubros');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        await rubrosService.update(id!, data);
        toast.success('Rubro actualizado');
      } else {
        await rubrosService.create(data);
        toast.success('Rubro creado');
      }
      navigate('/rubros');
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
        <button
          onClick={() => navigate('/rubros')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Rubro' : 'Nuevo Rubro'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4 max-w-xl">
        <FormField label="Nombre" error={errors.nombre} required>
          <Input
            {...register('nombre', {
              required: 'El nombre es requerido',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
            })}
            error={errors.nombre}
            placeholder="Ej: Ferretería, Electricidad, Plomería..."
          />
        </FormField>

        <FormField label="Prefijo" error={errors.prefijo} required>
          <Input
            {...register('prefijo', {
              required: 'El prefijo es requerido',
              pattern: {
                value: /^[A-Za-z]+$/,
                message: 'Solo se permiten letras',
              },
              maxLength: { value: 10, message: 'Máximo 10 caracteres' },
            })}
            error={errors.prefijo}
            placeholder="Ej: FER, ELE, PLO..."
            style={{ textTransform: 'uppercase' }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Este prefijo se usará para generar el código de los artículos de este rubro
          </p>
        </FormField>

        <FormField label="Descripción" error={errors.descripcion}>
          <Textarea
            {...register('descripcion')}
            placeholder="Descripción opcional del rubro..."
          />
        </FormField>

        {isEditing && (
          <div className="pt-4 border-t border-gray-200">
            <Checkbox {...register('activo')} label="Rubro activo" />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/rubros')}
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
