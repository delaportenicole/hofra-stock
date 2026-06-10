import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { importarService, type ImportArticuloRow, type PreviewResult, type ImportResult } from '../../services/importar.service';
import toast from 'react-hot-toast';

type Step = 'upload' | 'preview' | 'importing' | 'result';

const BATCH_SIZE = 20;

export function ImportarPage() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportArticuloRow[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parseExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        // Skip header row and parse data
        const rows: ImportArticuloRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const nombre = String(row[0] || '').trim();
          if (!nombre) continue; // Skip empty rows

          rows.push({
            nombre,
            sku: row[1] ? String(row[1]).trim() : null,
            categoria: String(row[2] || '').trim(),
            stockActual: Number(row[3]) || 0,
            stockMinimo: Number(row[4]) || 0,
            marca: row[5] ? String(row[5]).trim() : null,
          });
        }

        if (rows.length === 0) {
          setError('El archivo no contiene datos válidos');
          return;
        }

        setParsedRows(rows);
        setFileName(file.name);
        setError(null);

        // Get preview from server
        setIsLoading(true);
        const previewResult = await importarService.preview(rows);
        setPreview(previewResult);
        setStep('preview');
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setError('Error al leer el archivo Excel');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseExcelFile(file);
    } else {
      setError('Solo se aceptan archivos Excel (.xlsx, .xls)');
    }
  }, [parseExcelFile]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    setStep('importing');
    setIsLoading(true);
    setProgress({ current: 0, total: parsedRows.length });

    // Aggregate results from all batches
    const aggregatedResult: ImportResult = {
      success: true,
      totalRows: parsedRows.length,
      imported: 0,
      skipped: 0,
      errors: [],
      rubrosCreated: [],
      marcasCreated: [],
    };

    try {
      // Process in batches
      for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
        const batch = parsedRows.slice(i, i + BATCH_SIZE);
        const batchResult = await importarService.execute(batch);

        // Aggregate results
        aggregatedResult.imported += batchResult.imported;
        aggregatedResult.skipped += batchResult.skipped;
        aggregatedResult.errors.push(...batchResult.errors.map(e => ({
          ...e,
          row: e.row + i // Adjust row number for batch offset
        })));

        // Only add unique rubros and marcas
        batchResult.rubrosCreated.forEach(r => {
          if (!aggregatedResult.rubrosCreated.includes(r)) {
            aggregatedResult.rubrosCreated.push(r);
          }
        });
        batchResult.marcasCreated.forEach(m => {
          if (!aggregatedResult.marcasCreated.includes(m)) {
            aggregatedResult.marcasCreated.push(m);
          }
        });

        // Update progress
        setProgress({ current: Math.min(i + BATCH_SIZE, parsedRows.length), total: parsedRows.length });
      }

      aggregatedResult.success = aggregatedResult.errors.length === 0;
      setResult(aggregatedResult);
      setStep('result');

      if (aggregatedResult.imported > 0) {
        toast.success(`${aggregatedResult.imported} artículos importados`);
      }
    } catch (err) {
      console.error('Error importing:', err);
      toast.error('Error al importar los artículos');
      // Show partial results if any
      if (aggregatedResult.imported > 0) {
        setResult(aggregatedResult);
        setStep('result');
      } else {
        setStep('preview');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFileName(null);
    setParsedRows([]);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar Artículos</h1>
        <p className="text-gray-600 mt-1">Importar artículos desde un archivo Excel</p>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="card p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-500 transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700">
                Arrastrá un archivo Excel aquí
              </p>
              <p className="text-sm text-gray-500 mt-1">
                o hacé click para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Formatos aceptados: .xlsx, .xls
              </p>
            </label>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center mt-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-2" />
              <span>Procesando archivo...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Formato esperado del archivo:</h3>
            <table className="text-sm text-gray-600 w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Columna Excel</th>
                  <th className="text-left py-1">Campo Artículo</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-1">Descripción y Marca</td><td>Nombre</td></tr>
                <tr><td className="py-1">SKU</td><td>SKU</td></tr>
                <tr><td className="py-1">Categoria</td><td>Rubro (se crea si no existe)</td></tr>
                <tr><td className="py-1">Stock Actual</td><td>Stock Actual</td></tr>
                <tr><td className="py-1">Stock Mínimo</td><td>Stock Mínimo</td></tr>
                <tr><td className="py-1">Marca</td><td>Marca (se crea si no existe)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-primary-600" />
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-gray-500">{parsedRows.length} artículos encontrados</p>
                </div>
              </div>
              <button onClick={handleReset} className="btn-secondary">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Artículos a importar</p>
                <p className="text-2xl font-bold text-blue-700">{parsedRows.length}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-600">Rubros a crear</p>
                <p className="text-2xl font-bold text-amber-700">{preview.rubrosToCreate.length}</p>
                {preview.rubrosToCreate.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {preview.rubrosToCreate.join(', ')}
                  </p>
                )}
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Marcas a crear</p>
                <p className="text-2xl font-bold text-purple-700">{preview.marcasToCreate.length}</p>
                {preview.marcasToCreate.length > 0 && (
                  <p className="text-xs text-purple-600 mt-1 truncate">
                    {preview.marcasToCreate.slice(0, 5).join(', ')}
                    {preview.marcasToCreate.length > 5 && ` +${preview.marcasToCreate.length - 5} más`}
                  </p>
                )}
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mín.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">{row.nombre}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{row.sku || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          preview.rubrosToCreate.includes(row.categoria)
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {row.categoria}
                          {preview.rubrosToCreate.includes(row.categoria) && ' (nuevo)'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.stockActual < 0 ? (
                          <span className="text-red-600">{row.stockActual} → 0</span>
                        ) : (
                          row.stockActual
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{row.stockMinimo}</td>
                      <td className="px-4 py-2 text-sm">
                        {row.marca ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            preview.marcasToCreate.includes(row.marca)
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.marca}
                            {preview.marcasToCreate.includes(row.marca) && ' (nueva)'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <strong>Nota:</strong> Si abandonás esta página durante la importación, el archivo terminará
              de procesarse pero no podrás ver el resumen de lo importado.
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={handleReset} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleImport} className="btn-primary">
                <Upload className="w-4 h-4 mr-2" />
                Importar {parsedRows.length} artículos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="card p-12 text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Importando artículos...</p>

          {/* Progress counter */}
          <div className="mt-4">
            <p className="text-3xl font-bold text-primary-600">
              {progress.current} <span className="text-gray-400 text-lg">/ {progress.total}</span>
            </p>
            <div className="w-64 mx-auto mt-3 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>

        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <div className="card p-6">
          <div className="text-center mb-6">
            {result.imported > 0 ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold">Importación completada</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">Total procesados</p>
              <p className="text-2xl font-bold">{result.totalRows}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-green-600">Importados</p>
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-sm text-red-600">Omitidos</p>
              <p className="text-2xl font-bold text-red-700">{result.skipped}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-600">Rubros creados</p>
              <p className="text-2xl font-bold text-blue-700">{result.rubrosCreated.length}</p>
            </div>
          </div>

          {result.rubrosCreated.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-800 mb-2">Rubros creados:</p>
              <div className="flex flex-wrap gap-2">
                {result.rubrosCreated.map((rubro, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {rubro}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.marcasCreated.length > 0 && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg">
              <p className="font-medium text-purple-800 mb-2">Marcas creadas:</p>
              <div className="flex flex-wrap gap-2">
                {result.marcasCreated.map((marca, idx) => (
                  <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                    {marca}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <p className="font-medium text-red-800 mb-2">Errores ({result.errors.length}):</p>
              <div className="max-h-40 overflow-y-auto">
                {result.errors.map((err, idx) => (
                  <p key={idx} className="text-sm text-red-700">
                    Fila {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 mt-6">
            <button onClick={handleReset} className="btn-secondary">
              Importar otro archivo
            </button>
            <a href="/articulos" className="btn-primary">
              Ver artículos
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
