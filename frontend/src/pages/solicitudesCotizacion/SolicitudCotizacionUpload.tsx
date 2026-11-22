import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { solicitudesCotizacionService } from '../../services/solicitudesCotizacion.service';
import { clientesService } from '../../services/clientes.service';
import { ItemsCaptureEditor } from '../../components/solicitudesCotizacion/ItemsCaptureEditor';
import { FormField, Input, Select } from '../../components/FormField';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Cliente, CreateSolicitudCotizacionItemDto } from '@hofra/shared';

interface FormData {
  clienteId: string;
  numeroReferenciaCliente?: string;
}

export function SolicitudCotizacionUploadPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [fileName, setFileName] = useState<string | null>(null);
  const [items, setItems] = useState<CreateSolicitudCotizacionItemDto[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    clientesService
      .getActive()
      .then(setClientes)
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => setIsLoading(false));
  }, []);

  const onSubmit = async (data: FormData) => {
    if (items.length === 0) {
      toast.error('Cargá al menos un ítem válido');
      return;
    }

    setIsSaving(true);
    try {
      const solicitud = await solicitudesCotizacionService.create({
        clienteId: data.clienteId,
        numeroReferenciaCliente: data.numeroReferenciaCliente || null,
        nombreArchivo: fileName,
        items,
      });
      toast.success('Solicitud creada, revisá las coincidencias sugeridas');
      navigate(`/solicitudes-cotizacion/${solicitud.id}`);
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
        <button onClick={() => navigate('/solicitudes-cotizacion')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud de Cotización</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Cliente" required error={errors.clienteId}>
            <Select
              options={clientes.map((c) => ({ value: c.id, label: c.razonSocial }))}
              {...register('clienteId', { required: 'El cliente es requerido' })}
            />
          </FormField>

          <FormField label="N° Referencia del Cliente" error={errors.numeroReferenciaCliente}>
            <Input placeholder="Opcional" {...register('numeroReferenciaCliente')} />
          </FormField>
        </div>

        <ItemsCaptureEditor
          items={items}
          onItemsChange={setItems}
          fileName={fileName}
          onFileNameChange={setFileName}
        />

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/solicitudes-cotizacion')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving || items.length === 0}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Crear Solicitud y Buscar Coincidencias
          </button>
        </div>
      </form>
    </div>
  );
}
