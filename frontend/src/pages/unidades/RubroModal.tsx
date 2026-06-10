import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { FormField, Input, Textarea, Checkbox } from '../../components/FormField';
import { rubrosService } from '../../services/rubros.service';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Rubro, CreateRubroDto, UpdateRubroDto } from '@hofra/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rubro: Rubro | null;
}

type FormData = CreateRubroDto & { activo?: boolean };

export function RubroModal({ isOpen, onClose, onSuccess, rubro }: Props) {
  const isEditing = !!rubro;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (isOpen) {
      if (rubro) {
        reset({
          nombre: rubro.nombre,
          prefijo: rubro.prefijo,
          descripcion: rubro.descripcion || undefined,
          activo: rubro.activo,
        });
      } else {
        reset({
          nombre: '',
          prefijo: '',
          descripcion: '',
          activo: true,
        });
      }
    }
  }, [isOpen, rubro, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await rubrosService.update(rubro.id, data as UpdateRubroDto);
        toast.success('Rubro actualizado');
      } else {
        await rubrosService.create(data);
        toast.success('Rubro creado');
      }
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Editar Rubro' : 'Nuevo Rubro'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                Este prefijo se usará para generar el código de los artículos
              </p>
            </FormField>

            <FormField label="Descripción" error={errors.descripcion}>
              <Textarea
                {...register('descripcion')}
                placeholder="Descripción opcional del rubro..."
              />
            </FormField>

            {isEditing && (
              <Checkbox {...register('activo')} label="Activo" />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
