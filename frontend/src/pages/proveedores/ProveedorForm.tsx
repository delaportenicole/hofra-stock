import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { proveedoresService } from '../../services/proveedores.service';
import { FormField, Input, Textarea, Checkbox } from '../../components/FormField';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { CreateProveedorDto } from '@hofra/shared';

type FormData = CreateProveedorDto & { activo?: boolean };

export function ProveedorFormPage() {
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
      loadProveedor();
    }
  }, [id]);

  const loadProveedor = async () => {
    try {
      const proveedor = await proveedoresService.getById(id!);
      reset({
        razonSocial: proveedor.razonSocial,
        nombreFantasia: proveedor.nombreFantasia || undefined,
        cuit: proveedor.cuit || undefined,
        direccion: proveedor.direccion || undefined,
        telefono: proveedor.telefono || undefined,
        email: proveedor.email || undefined,
        contacto: proveedor.contacto || undefined,
        notas: proveedor.notas || undefined,
        activo: proveedor.activo,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        await proveedoresService.update(id!, data);
        toast.success('Proveedor actualizado');
      } else {
        await proveedoresService.create(data);
        toast.success('Proveedor creado');
      }
      navigate('/proveedores');
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
          onClick={() => navigate('/proveedores')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Razón Social" error={errors.razonSocial} required className="md:col-span-2">
            <Input
              {...register('razonSocial', { required: 'La razón social es requerida' })}
              error={errors.razonSocial}
              placeholder="Proveedor S.A."
            />
          </FormField>

          <FormField label="Nombre de Fantasía" error={errors.nombreFantasia} className="md:col-span-2">
            <Input
              {...register('nombreFantasia')}
              error={errors.nombreFantasia}
              placeholder="Nombre comercial del proveedor"
            />
          </FormField>

          <FormField label="CUIT" error={errors.cuit}>
            <Input
              {...register('cuit', {
                pattern: {
                  value: /^(20|23|24|25|26|27|30|33|34)-?\d{8}-?\d$/,
                  message: 'CUIT inválido. Formato: XX-XXXXXXXX-X',
                },
              })}
              error={errors.cuit}
              placeholder="30-12345678-9"
            />
          </FormField>

          <FormField label="Teléfono" error={errors.telefono}>
            <Input {...register('telefono')} placeholder="011-4555-1234" />
          </FormField>

          <FormField label="Email" error={errors.email}>
            <Input
              type="email"
              {...register('email', {
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
              })}
              error={errors.email}
              placeholder="contacto@proveedor.com"
            />
          </FormField>

          <FormField label="Contacto" error={errors.contacto}>
            <Input {...register('contacto')} placeholder="Juan Pérez" />
          </FormField>

          <FormField label="Dirección" error={errors.direccion} className="md:col-span-2">
            <Textarea {...register('direccion')} placeholder="Av. Corrientes 1234, CABA" />
          </FormField>

          <FormField label="Notas" error={errors.notas} className="md:col-span-2">
            <Textarea {...register('notas')} placeholder="Notas internas sobre el proveedor..." />
          </FormField>

          {isEditing && (
            <div className="md:col-span-2 pt-4 border-t border-gray-200">
              <Checkbox {...register('activo')} label="Proveedor activo" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/proveedores')}
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
