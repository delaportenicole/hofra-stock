import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, FileText, Wand2, AlertCircle, AlertTriangle, Loader2, X, Trash2 } from 'lucide-react';
import { solicitudesCotizacionService } from '../../services/solicitudesCotizacion.service';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { CreateSolicitudCotizacionItemDto } from '@hofra/shared';

type ModoCarga = 'excel' | 'texto';

type ColumnaOpcionalKey = 'etmSolicitado' | 'descripcionInglesSolicitada' | 'unidadSolicitada' | 'marcaSolicitada' | 'modeloSolicitado';

const COLUMNAS_OPCIONALES: { key: ColumnaOpcionalKey; label: string }[] = [
  { key: 'etmSolicitado', label: 'ETM' },
  { key: 'descripcionInglesSolicitada', label: 'Descripción (inglés)' },
  { key: 'unidadSolicitada', label: 'Unidad' },
  { key: 'marcaSolicitada', label: 'Marca' },
  { key: 'modeloSolicitado', label: 'Modelo' },
];

function normalizarHeader(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase();
}

interface ItemsCaptureEditorProps {
  items: CreateSolicitudCotizacionItemDto[];
  onItemsChange: (items: CreateSolicitudCotizacionItemDto[]) => void;
  fileName: string | null;
  onFileNameChange: (fileName: string | null) => void;
}

export function ItemsCaptureEditor({ items, onItemsChange, fileName, onFileNameChange }: ItemsCaptureEditorProps) {
  const [modo, setModo] = useState<ModoCarga>('excel');
  const [skippedRows, setSkippedRows] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  const [textoPegado, setTextoPegado] = useState('');
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [confirmarNormalizar, setConfirmarNormalizar] = useState(false);

  const [columnasVisibles, setColumnasVisibles] = useState<Record<ColumnaOpcionalKey, boolean>>({
    etmSolicitado: true,
    descripcionInglesSolicitada: true,
    unidadSolicitada: true,
    marcaSolicitada: true,
    modeloSolicitado: true,
  });

  const toggleColumna = (key: ColumnaOpcionalKey) => {
    setColumnasVisibles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const parseExcelFile = useCallback(
    (file: File) => {
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
          const unidadIdx = headers.findIndex((h) => h === 'UNIDAD');

          if (descIdx === -1 || cantidadIdx === -1) {
            setParseError('El archivo debe tener columnas "Descripcion" y "Cantidad" en la primera fila');
            onItemsChange([]);
            onFileNameChange(null);
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
              unidadSolicitada: unidadIdx !== -1 && row[unidadIdx] ? String(row[unidadIdx]).trim() : null,
              cantidadSolicitada: Math.trunc(cantidad),
            });
          }

          if (rows.length === 0) {
            setParseError('El archivo no contiene filas válidas (revisá que tenga Descripción y Cantidad cargadas)');
            onItemsChange([]);
            onFileNameChange(null);
            return;
          }

          onItemsChange(rows);
          setSkippedRows(skipped);
          onFileNameChange(file.name);
          setParseError(null);
        } catch (err) {
          console.error('Error parsing Excel:', err);
          setParseError('Error al leer el archivo Excel');
        }
      };
      reader.readAsBinaryString(file);
    },
    [onItemsChange, onFileNameChange]
  );

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

  const handleNormalizarClick = () => {
    if (!textoPegado.trim()) {
      toast.error('Pegá el texto con el listado del cliente');
      return;
    }
    setConfirmarNormalizar(true);
  };

  const handleConfirmarNormalizar = async () => {
    setConfirmarNormalizar(false);

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
        unidadSolicitada: item.unidad,
        cantidadSolicitada: item.cantidad,
      }));

      onItemsChange(rows);
      setSkippedRows(0);
      onFileNameChange('Texto pegado a mano');
      toast.success(`${rows.length} ítems detectados — revisalos antes de confirmar`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleReset = () => {
    onFileNameChange(null);
    onItemsChange([]);
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
      | 'unidadSolicitada'
      | 'cantidadSolicitada',
    value: string
  ) => {
    onItemsChange(
      items.map((item, i) => {
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
    onItemsChange(items.filter((_, i) => i !== index).map((item, i) => ({ ...item, orden: i })));
  };

  return (
    <div className="space-y-4">
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
                  id="items-capture-file-upload"
                />
                <label htmlFor="items-capture-file-upload" className="cursor-pointer">
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
                    <tr><td className="py-1">UNIDAD</td><td>Unidad de medida</td></tr>
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
                normalizar en ETM, Descripción, Descripción en inglés, Marca, Modelo, Unidad y Cantidad para
                que los revises antes de confirmar.
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
                  onClick={handleNormalizarClick}
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
                    {items.length} ítems
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Columnas:</span>
            {COLUMNAS_OPCIONALES.map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => toggleColumna(col.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  columnasVisibles[col.key]
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {columnasVisibles.etmSolicitado && (
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-28">ETM</th>
                  )}
                  <th className="text-left px-3 py-2 font-medium text-gray-700">Descripción</th>
                  {columnasVisibles.descripcionInglesSolicitada && (
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Descripción (inglés)</th>
                  )}
                  {columnasVisibles.marcaSolicitada && (
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-40">Marca</th>
                  )}
                  {columnasVisibles.modeloSolicitado && (
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-40">Modelo</th>
                  )}
                  {columnasVisibles.unidadSolicitada && (
                    <th className="text-left px-3 py-2 font-medium text-gray-700 w-28">Unidad</th>
                  )}
                  <th className="text-left px-3 py-2 font-medium text-gray-700 w-24">Cantidad</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    {columnasVisibles.etmSolicitado && (
                      <td className="px-3 py-1.5">
                        <input
                          value={item.etmSolicitado ?? ''}
                          onChange={(e) => updateItem(index, 'etmSolicitado', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                    )}
                    <td className="px-3 py-1.5">
                      <input
                        value={item.descripcionSolicitada}
                        onChange={(e) => updateItem(index, 'descripcionSolicitada', e.target.value)}
                        className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                      />
                    </td>
                    {columnasVisibles.descripcionInglesSolicitada && (
                      <td className="px-3 py-1.5">
                        <input
                          value={item.descripcionInglesSolicitada ?? ''}
                          onChange={(e) => updateItem(index, 'descripcionInglesSolicitada', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                    )}
                    {columnasVisibles.marcaSolicitada && (
                      <td className="px-3 py-1.5">
                        <input
                          value={item.marcaSolicitada ?? ''}
                          onChange={(e) => updateItem(index, 'marcaSolicitada', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                    )}
                    {columnasVisibles.modeloSolicitado && (
                      <td className="px-3 py-1.5">
                        <input
                          value={item.modeloSolicitado ?? ''}
                          onChange={(e) => updateItem(index, 'modeloSolicitado', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                    )}
                    {columnasVisibles.unidadSolicitada && (
                      <td className="px-3 py-1.5">
                        <input
                          value={item.unidadSolicitada ?? ''}
                          onChange={(e) => updateItem(index, 'unidadSolicitada', e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-primary-500 rounded px-2 py-1 bg-transparent focus:bg-white"
                        />
                      </td>
                    )}
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

      {confirmarNormalizar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setConfirmarNormalizar(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Confirmar normalización con IA</h3>
              </div>
              <p className="text-sm text-gray-600">
                Normalizar con IA envía el texto a la API de Claude y tiene un costo asociado (bajo, pero
                real — unos centavos de USD por uso). ¿Estás seguro de que deseas continuar?
              </p>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button type="button" onClick={() => setConfirmarNormalizar(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmarNormalizar} className="btn-primary">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
