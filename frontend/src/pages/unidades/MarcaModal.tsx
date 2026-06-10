import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { FormField, Input, Textarea, Checkbox } from '../../components/FormField';
import { marcasService } from '../../services/marcas.service';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Marca, CreateMarcaDto, UpdateMarcaDto } from '@hofra/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  marca: Marca | null;
}

type FormData = CreateMarcaDto & { activo?: boolean };

export function MarcaModal({ isOpen, onClose, onSuccess, marca }: Props) {
  const isEditing = !!marca;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (isOpen) {
      if (marca) {
        reset({
          nombre: marca.nombre,
          descripcion: marca.descripcion || '',
          activo: marca.activo,
        });
      } else {
        reset({
          nombre: '',
          descripcion: '',
          activo: true,
        });
      }
    }
  }, [isOpen, marca, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await marcasService.update(marca.id, data as UpdateMarcaDto);
        toast.success('Marca actualizada');
      } else {
        await marcasService.create(data);
        toast.success('Marca creada');
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
              {isEditing ? 'Editar Marca' : 'Nueva Marca'}
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
                placeholder="Ej: Stanley, 3M, Bosch"
              />
            </FormField>

            <FormField label="Descripción" error={errors.descripcion}>
              <Textarea
                {...register('descripcion')}
                placeholder="Descripción opcional..."
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
