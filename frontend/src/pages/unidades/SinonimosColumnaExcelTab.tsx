import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { sinonimosColumnaExcelService } from '../../services/sinonimosColumnaExcel.service';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { SinonimoColumnaExcel, CampoSinonimoExcel } from '@hofra/shared';

const CAMPOS: { key: CampoSinonimoExcel; label: string; ejemplo: string }[] = [
  { key: 'descripcion', label: 'Descripción', ejemplo: 'DETALLE' },
  { key: 'cantidad', label: 'Cantidad', ejemplo: 'CANT., QTY' },
  { key: 'etm', label: 'ETM', ejemplo: 'TAG' },
  { key: 'descripcion_ingles', label: 'Descripción en inglés', ejemplo: 'DESCRIPTION' },
  { key: 'marca', label: 'Marca', ejemplo: 'BRAND' },
  { key: 'modelo', label: 'Modelo', ejemplo: 'MODEL' },
  { key: 'unidad', label: 'Unidad', ejemplo: 'UM, U/M' },
];

export function SinonimosColumnaExcelTab() {
  const [sinonimos, setSinonimos] = useState<SinonimoColumnaExcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<CampoSinonimoExcel, string>>({
    etm: '',
    descripcion: '',
    descripcion_ingles: '',
    cantidad: '',
    marca: '',
    modelo: '',
    unidad: '',
  });
  const [savingCampo, setSavingCampo] = useState<CampoSinonimoExcel | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await sinonimosColumnaExcelService.getAll();
      setSinonimos(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgregar = async (campo: CampoSinonimoExcel) => {
    const sinonimo = drafts[campo].trim();
    if (!sinonimo) return;

    setSavingCampo(campo);
    try {
      const creado = await sinonimosColumnaExcelService.create({ campo, sinonimo });
      setSinonimos((prev) => [...prev, creado]);
      setDrafts((prev) => ({ ...prev, [campo]: '' }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingCampo(null);
    }
  };

  const handleEliminar = async (sinonimo: SinonimoColumnaExcel) => {
    try {
      await sinonimosColumnaExcelService.delete(sinonimo.id);
      setSinonimos((prev) => prev.filter((s) => s.id !== sinonimo.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400">Cargando...</p>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-gray-500">
        Al importar un Excel de Solicitud de Cotización, las columnas se detectan por el nombre del
        encabezado. Si un archivo usa un nombre distinto al habitual para el mismo campo (ej. "CANT."
        en vez de "Cantidad"), agregalo acá como sinónimo para que también se reconozca.
      </p>

      <div className="space-y-4">
        {CAMPOS.map((campo) => {
          const sinonimosCampo = sinonimos.filter((s) => s.campo === campo.key);
          return (
            <div key={campo.key} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{campo.label}</h3>
                <span className="text-xs text-gray-400">ej. {campo.ejemplo}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {sinonimosCampo.length === 0 ? (
                  <span className="text-xs text-gray-400">Sin sinónimos cargados</span>
                ) : (
                  sinonimosCampo.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-mono px-2 py-1 rounded"
                    >
                      {s.sinonimo}
                      <button
                        onClick={() => handleEliminar(s)}
                        className="text-gray-400 hover:text-danger-600"
                        title="Eliminar sinónimo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={drafts[campo.key]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAgregar(campo.key)}
                  placeholder="Agregar sinónimo..."
                  className="input text-sm py-1.5"
                  disabled={savingCampo === campo.key}
                />
                <button
                  onClick={() => handleAgregar(campo.key)}
                  disabled={savingCampo === campo.key || !drafts[campo.key].trim()}
                  className="btn-secondary text-sm px-3 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
