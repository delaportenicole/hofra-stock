import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { clientesService } from '../../services/clientes.service';
import { FormField, Input, Textarea } from '../../components/FormField';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { CreateClienteDto } from '@hofra/shared';

type FormData = CreateClienteDto & { activo?: boolean };

export function ClienteFormPage() {
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
      loadCliente();
    }
  }, [id]);

  const loadCliente = async () => {
    try {
      const cliente = await clientesService.getById(id!);
      reset({
        razonSocial: cliente.razonSocial,
        cuit: cliente.cuit,
        direccion: cliente.direccion || undefined,
        telefono: cliente.telefono || undefined,
        email: cliente.email || undefined,
        contacto: cliente.contacto || undefined,
        notas: cliente.notas || undefined,
        activo: cliente.activo,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        await clientesService.update(id!, data);
        toast.success('Cliente actualizado');
      } else {
        await clientesService.create(data);
        toast.success('Cliente creado');
      }
      navigate('/clientes');
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
        <button onClick={() => navigate('/clientes')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Razón Social" error={errors.razonSocial} required className="md:col-span-2">
            <Input
              {...register('razonSocial', { required: 'La razón social es requerida' })}
              error={errors.razonSocial}
              placeholder="Empresa S.A."
            />
          </FormField>

          <FormField label="CUIT" error={errors.cuit} required>
            <Input
              {...register('cuit', {
                required: 'El CUIT es requerido',
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
              placeholder="contacto@empresa.com"
            />
          </FormField>

          <FormField label="Contacto" error={errors.contacto}>
            <Input {...register('contacto')} placeholder="Juan Pérez" />
          </FormField>

          <FormField label="Dirección" error={errors.direccion} className="md:col-span-2">
            <Textarea {...register('direccion')} placeholder="Av. Corrientes 1234, CABA" />
          </FormField>

          <FormField label="Notas" error={errors.notas} className="md:col-span-2">
            <Textarea {...register('notas')} placeholder="Notas internas sobre el cliente..." />
          </FormField>

          {isEditing && (
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('activo')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Cliente activo</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/clientes')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Guardando...' : <><Save className="w-5 h-5 mr-2" />{isEditing ? 'Actualizar' : 'Crear'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
