import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { FormField, Input, Checkbox } from '../../components/FormField';
import { unidadesMedidaService } from '../../services/unidadesMedida.service';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { UnidadMedida, CreateUnidadMedidaDto, UpdateUnidadMedidaDto } from '@hofra/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unidad: UnidadMedida | null;
}

type FormData = CreateUnidadMedidaDto & { activo?: boolean };

export function UnidadMedidaModal({ isOpen, onClose, onSuccess, unidad }: Props) {
  const isEditing = !!unidad;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (isOpen) {
      if (unidad) {
        reset({
          nombre: unidad.nombre,
          activo: unidad.activo,
        });
      } else {
        reset({
          nombre: '',
          activo: true,
        });
      }
    }
  }, [isOpen, unidad, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await unidadesMedidaService.update(unidad.id, data as UpdateUnidadMedidaDto);
        toast.success('Unidad de medida actualizada');
      } else {
        await unidadesMedidaService.create(data);
        toast.success('Unidad de medida creada');
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
              {isEditing ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
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
                placeholder="Ej: Kilogramo, Litro, Unidad"
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
