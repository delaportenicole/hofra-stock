import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, Loader2, X } from 'lucide-react';
import { solicitudesCotizacionService } from '../../services/solicitudesCotizacion.service';
import { clientesService } from '../../services/clientes.service';
import { FormField, Input, Select } from '../../components/FormField';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Cliente, CreateSolicitudCotizacionItemDto } from '@hofra/shared';

interface FormData {
  clienteId: string;
  numeroReferenciaCliente?: string;
}

function normalizarHeader(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function SolicitudCotizacionUploadPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [fileName, setFileName] = useState<string | null>(null);
  const [items, setItems] = useState<CreateSolicitudCotizacionItemDto[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

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

  const parseExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (jsonData.length === 0) {
          setParseError('El archivo está vacío');
          return;
        }

        // Buscamos las columnas por nombre de encabezado (no por posición fija),
        // porque distintos archivos traen columnas extra intercaladas (Precio, Moneda, Modelo, etc.)
        const headers = (jsonData[0] as unknown[]).map((h) => normalizarHeader(String(h ?? '')));
        const etmIdx = headers.findIndex((h) => h === 'ETM');
        const descIdx = headers.findIndex((h) => h === 'DESCRIPCION');
        const cantidadIdx = headers.findIndex((h) => h === 'CANTIDAD');
        const marcaIdx = headers.findIndex((h) => h === 'MARCA');

        if (descIdx === -1 || cantidadIdx === -1) {
          setParseError('El archivo debe tener columnas "Descripcion" y "Cantidad" en la primera fila');
          setItems([]);
          setFileName(null);
          return;
        }

        const rows: CreateSolicitudCotizacionItemDto[] = [];
        let skipped = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const descripcion = String(row[descIdx] || '').trim();
          const cantidad = Number(row[cantidadIdx]);

          if (!descripcion || !cantidad || cantidad <= 0) {
            skipped++;
            continue;
          }

          rows.push({
            orden: rows.length,
            etmSolicitado: etmIdx !== -1 && row[etmIdx] ? String(row[etmIdx]).trim() : null,
            descripcionSolicitada: descripcion,
            marcaSolicitada: marcaIdx !== -1 && row[marcaIdx] ? String(row[marcaIdx]).trim() : null,
            cantidadSolicitada: Math.trunc(cantidad),
          });
        }

        if (rows.length === 0) {
          setParseError('El archivo no contiene filas válidas (revisá que tenga Descripción y Cantidad cargadas)');
          setItems([]);
          setFileName(null);
          return;
        }

        setItems(rows);
        setSkippedRows(skipped);
        setFileName(file.name);
        setParseError(null);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setParseError('Error al leer el archivo Excel');
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        parseExcelFile(file);
      } else {
        setParseError('Solo se aceptan archivos Excel (.xlsx, .xls)');
      }
    },
    [parseExcelFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleReset = () => {
    setFileName(null);
    setItems([]);
    setSkippedRows(0);
    setParseError(null);
  };

  const onSubmit = async (data: FormData) => {
    if (items.length === 0) {
      toast.error('Subí un archivo Excel con al menos un ítem válido');
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

        {!fileName && (
          <div>
            <label className="label">Archivo de Solicitud (Excel)</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-primary-500 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="solicitud-file-upload"
              />
              <label htmlFor="solicitud-file-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="font-medium text-gray-700">Arrastrá el Excel del cliente aquí</p>
                <p className="text-sm text-gray-500 mt-1">o hacé click para seleccionar</p>
              </label>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2 text-sm">Formato esperado del archivo:</h3>
              <p className="text-sm text-gray-600 mb-2">
                La primera fila debe tener los nombres de columna. Se buscan por nombre, así que
                no importa el orden ni si hay otras columnas de por medio (Precio, Modelo, etc.):
              </p>
              <table className="text-sm text-gray-600 w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Encabezado</th>
                    <th className="text-left py-1">Campo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1">ETM</td><td>ETM</td></tr>
                  <tr><td className="py-1">DESCRIPCION</td><td>Descripción (requerido)</td></tr>
                  <tr><td className="py-1">CANTIDAD</td><td>Cantidad (requerido)</td></tr>
                  <tr><td className="py-1">MARCA</td><td>Marca</td></tr>
                </tbody>
              </table>
            </div>

            {parseError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{parseError}</span>
              </div>
            )}
          </div>
        )}

        {fileName && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-primary-600" />
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-gray-600">
                    {items.length} ítems para buscar
                    {skippedRows > 0 && ` · ${skippedRows} filas omitidas (sin descripción o cantidad)`}
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleReset} className="btn-secondary">
                <X className="w-4 h-4 mr-2" />
                Cambiar archivo
              </button>
            </div>
          </div>
        )}

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
