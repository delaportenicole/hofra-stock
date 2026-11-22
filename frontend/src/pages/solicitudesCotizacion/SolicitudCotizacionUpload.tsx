import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { ArrowLeft, Upload, FileSpreadsheet, FileText, Wand2, AlertCircle, Loader2, X, Trash2 } from 'lucide-react';
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

type ModoCarga = 'excel' | 'texto';

function normalizarHeader(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase();
}

export function SolicitudCotizacionUploadPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [modo, setModo] = useState<ModoCarga>('excel');
  const [fileName, setFileName] = useState<string | null>(null);
  const [items, setItems] = useState<CreateSolicitudCotizacionItemDto[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  const [textoPegado, setTextoPegado] = useState('');
  const [isNormalizing, setIsNormalizing] = useState(false);

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
        const descIngIdx = headers.findIndex((h) => h === 'DESCRIPCION EN INGLES');
        const cantidadIdx = headers.findIndex((h) => h === 'CANTIDAD');
        const marcaIdx = headers.findIndex((h) => h === 'MARCA');
        const modeloIdx = headers.findIndex((h) => h === 'MODELO');

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
            descripcionInglesSolicitada: descIngIdx !== -1 && row[descIngIdx] ? String(row[descIngIdx]).trim() : null,
            marcaSolicitada: marcaIdx !== -1 && row[marcaIdx] ? String(row[marcaIdx]).trim() : null,
            modeloSolicitado: modeloIdx !== -1 && row[modeloIdx] ? String(row[modeloIdx]).trim() : null,
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

  const handleNormalizarTexto = async () => {
    if (!textoPegado.trim()) {
      toast.error('Pegá el texto con el listado del cliente');
      return;
    }

    setIsNormalizing(true);
    setParseError(null);
    try {
      const normalizados = await solicitudesCotizacionService.normalizarTexto(textoPegado);

      if (normalizados.length === 0) {
        setParseError('No se detectó ningún ítem en el texto');
        return;
      }

      const rows: CreateSolicitudCotizacionItemDto[] = normalizados.map((item, i) => ({
        orden: i,
        etmSolicitado: item.etm,
        descripcionSolicitada: item.descripcion,
        descripcionInglesSolicitada: item.descripcionIngles,
        marcaSolicitada: item.marca,
        modeloSolicitado: item.modelo,
        cantidadSolicitada: item.cantidad,
      }));

      setItems(rows);
      setSkippedRows(0);
      setFileName('Texto pegado a mano');
      toast.success(`${rows.length} ítems detectados — revisalos antes de crear la solicitud`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setItems([]);
    setSkippedRows(0);
    setParseError(null);
    setTextoPegado('');
  };

  const updateItem = (
    index: number,
    field:
      | 'etmSolicitado'
      | 'descripcionSolicitada'
      | 'descripcionInglesSolicitada'
      | 'marcaSolicitada'
      | 'modeloSolicitado'
      | 'cantidadSolicitada',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'cantidadSolicitada') {
          return { ...item, cantidadSolicitada: Math.max(1, Math.trunc(Number(value)) || 1) };
        }
        if (field === 'descripcionSolicitada') {
          return { ...item, descripcionSolicitada: value };
        }
        return { ...item, [field]: value || null };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, orden: i })));
  };

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

        {!fileName && (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setModo('excel')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  modo === 'excel' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-300 text-gray-600'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                Subir Excel
              </button>
              <button
                type="button"
                onClick={() => setModo('texto')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  modo === 'texto' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-300 text-gray-600'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Pegar texto
              </button>
            </div>

            {modo === 'excel' && (
              <>
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
                      <tr><td className="py-1">DESCRIPCION EN INGLES</td><td>Descripción en Inglés</td></tr>
                      <tr><td className="py-1">CANTIDAD</td><td>Cantidad (requerido)</td></tr>
                      <tr><td className="py-1">MARCA</td><td>Marca</td></tr>
                      <tr><td className="py-1">MODELO</td><td>Modelo</td></tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {modo === 'texto' && (
              <>
                <label className="label">Pegá el texto del cliente</label>
                <p className="text-sm text-gray-500 mb-2">
                  Pegá el mail, mensaje de WhatsApp o listado tal cual te lo mandó el cliente. La IA lo va a
                  normalizar en Descripción, Marca, Modelo y Cantidad para que los revises antes de crear la solicitud.
                </p>
                <textarea
                  value={textoPegado}
                  onChange={(e) => setTextoPegado(e.target.value)}
                  rows={10}
                  maxLength={20000}
                  placeholder={'Ej:\n3 bombas de agua Grundfos modelo CM5\n1 motor Siemens 10hp\n...'}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={handleNormalizarTexto}
                    disabled={isNormalizing || !textoPegado.trim()}
                    className="btn-primary"
                  >
                    {isNormalizing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Normalizar con IA
                  </button>
                </div>
              </>
            )}

            {parseError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{parseError}</span>
              </div>
            )}
          </div>
        )}

        {fileName && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {modo === 'excel' ? (
                    <FileSpreadsheet className="w-6 h-6 text-primary-600" />
                  ) : (
                    <FileText className="w-6 h-6 text-primary-600" />
                  )}
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
                  Cambiar
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-28">ETM</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Descripción</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Descripción (inglés)</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-40">Marca</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-40">Modelo</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-24">Cantidad</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="px-3 py-1.5">
                        <input
                          value={item.etmSolicitado ?? ''}
                          onChange={(e) => updateItem(index, 'etmSolicitado', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={item.descripcionSolicitada}
                          onChange={(e) => updateItem(index, 'descripcionSolicitada', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={item.descripcionInglesSolicitada ?? ''}
                          onChange={(e) => updateItem(index, 'descripcionInglesSolicitada', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={item.marcaSolicitada ?? ''}
                          onChange={(e) => updateItem(index, 'marcaSolicitada', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={item.modeloSolicitado ?? ''}
                          onChange={(e) => updateItem(index, 'modeloSolicitado', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          min={1}
                          value={item.cantidadSolicitada}
                          onChange={(e) => updateItem(index, 'cantidadSolicitada', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button type="button" onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
