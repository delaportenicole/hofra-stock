import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Save, Shield, Check } from 'lucide-react';
import { rolesService } from '../../services/roles.service';
import { FormField, Input, Textarea } from '../../components/FormField';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Permiso, CreateRolDto, UpdateRolDto } from '@hofra/shared';

type FormData = {
  nombre: string;
  descripcion?: string;
  permisoIds: string[];
};

// Traducciones de módulos
const MODULO_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  articulos: 'Artículos',
  rubros: 'Rubros',
  clientes: 'Clientes',
  proveedores: 'Proveedores',
  entregas: 'Entregas',
  reposiciones: 'Reposiciones',
  usuarios: 'Usuarios',
  roles: 'Roles',
  auditoria: 'Auditoría',
};

// Traducciones de acciones
const ACCION_LABELS: Record<string, string> = {
  crear: 'Crear',
  leer: 'Leer',
  actualizar: 'Actualizar',
  eliminar: 'Eliminar',
};

// Orden de acciones para consistencia
const ACCION_ORDER = ['leer', 'crear', 'actualizar', 'eliminar'];

export function RoleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [permisosByModulo, setPermisosByModulo] = useState<Record<string, Permiso[]>>({});

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      permisoIds: [],
    },
  });

  const selectedPermisoIds = watch('permisoIds');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load all permissions
      const permisosData = await rolesService.getPermisos();
      setPermisos(permisosData);

      // Group permissions by module
      const grouped: Record<string, Permiso[]> = {};
      permisosData.forEach((p) => {
        if (!grouped[p.modulo]) {
          grouped[p.modulo] = [];
        }
        grouped[p.modulo].push(p);
      });

      // Sort actions within each module
      Object.keys(grouped).forEach((modulo) => {
        grouped[modulo].sort(
          (a, b) => ACCION_ORDER.indexOf(a.accion) - ACCION_ORDER.indexOf(b.accion)
        );
      });

      setPermisosByModulo(grouped);

      // Load role if editing
      if (isEditing) {
        const rol = await rolesService.getById(id!);
        reset({
          nombre: rol.nombre,
          descripcion: rol.descripcion || undefined,
          permisoIds: rol.permisos.map((p) => p.id),
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/roles');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        const updateData: UpdateRolDto = {
          nombre: data.nombre,
          descripcion: data.descripcion,
          permisoIds: data.permisoIds,
        };
        await rolesService.update(id!, updateData);
        toast.success('Rol actualizado');
      } else {
        const createData: CreateRolDto = {
          nombre: data.nombre,
          descripcion: data.descripcion,
          permisoIds: data.permisoIds,
        };
        await rolesService.create(createData);
        toast.success('Rol creado');
      }
      navigate('/roles');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermiso = (permisoId: string) => {
    const current = selectedPermisoIds || [];
    if (current.includes(permisoId)) {
      setValue(
        'permisoIds',
        current.filter((id) => id !== permisoId)
      );
    } else {
      setValue('permisoIds', [...current, permisoId]);
    }
  };

  const toggleModulo = (modulo: string) => {
    const moduloPermisos = permisosByModulo[modulo] || [];
    const moduloPermisoIds = moduloPermisos.map((p) => p.id);
    const current = selectedPermisoIds || [];

    const allSelected = moduloPermisoIds.every((id) => current.includes(id));

    if (allSelected) {
      // Remove all permisos from this module
      setValue(
        'permisoIds',
        current.filter((id) => !moduloPermisoIds.includes(id))
      );
    } else {
      // Add all permisos from this module
      const newIds = [...current];
      moduloPermisoIds.forEach((id) => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      setValue('permisoIds', newIds);
    }
  };

  const selectAll = () => {
    setValue(
      'permisoIds',
      permisos.map((p) => p.id)
    );
  };

  const clearAll = () => {
    setValue('permisoIds', []);
  };

  const isModuloFullySelected = (modulo: string) => {
    const moduloPermisos = permisosByModulo[modulo] || [];
    const moduloPermisoIds = moduloPermisos.map((p) => p.id);
    const current = selectedPermisoIds || [];
    return moduloPermisoIds.every((id) => current.includes(id));
  };

  const isModuloPartiallySelected = (modulo: string) => {
    const moduloPermisos = permisosByModulo[modulo] || [];
    const moduloPermisoIds = moduloPermisos.map((p) => p.id);
    const current = selectedPermisoIds || [];
    const selected = moduloPermisoIds.filter((id) => current.includes(id));
    return selected.length > 0 && selected.length < moduloPermisoIds.length;
  };

  if (isLoading) return <PageLoader />;

  const sortedModulos = Object.keys(permisosByModulo).sort((a, b) => {
    const labelA = MODULO_LABELS[a] || a;
    const labelB = MODULO_LABELS[b] || b;
    return labelA.localeCompare(labelB);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/roles')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Rol' : 'Nuevo Rol'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        {/* Datos del rol */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Rol</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nombre del Rol" error={errors.nombre} required>
              <Input
                {...register('nombre', {
                  required: 'El nombre es requerido',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
                error={errors.nombre}
                placeholder="Ej: Supervisor, Vendedor, etc."
              />
            </FormField>

            <FormField label="Descripción" error={errors.descripcion}>
              <Input
                {...register('descripcion')}
                placeholder="Descripción breve del rol..."
              />
            </FormField>
          </div>
        </div>

        {/* Permisos */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Permisos</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Seleccionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpiar
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Selecciona los permisos que tendrá este rol. Los usuarios con este rol heredarán estos permisos.
          </p>

          <Controller
            name="permisoIds"
            control={control}
            rules={{ validate: (value) => value.length > 0 || 'Debe asignar al menos un permiso' }}
            render={() => (
              <div className="space-y-4">
                {sortedModulos.map((modulo) => {
                  const moduloPermisos = permisosByModulo[modulo];
                  const isFullySelected = isModuloFullySelected(modulo);
                  const isPartiallySelected = isModuloPartiallySelected(modulo);

                  return (
                    <div
                      key={modulo}
                      className={`border rounded-lg overflow-hidden ${
                        isFullySelected
                          ? 'border-primary-300 bg-primary-50/50'
                          : isPartiallySelected
                          ? 'border-primary-200'
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Module header */}
                      <div
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${
                          isFullySelected ? 'bg-primary-100' : 'bg-gray-50'
                        }`}
                        onClick={() => toggleModulo(modulo)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isFullySelected
                                ? 'bg-primary-600 border-primary-600'
                                : isPartiallySelected
                                ? 'bg-primary-200 border-primary-400'
                                : 'border-gray-300'
                            }`}
                          >
                            {(isFullySelected || isPartiallySelected) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">
                            {MODULO_LABELS[modulo] || modulo}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {moduloPermisos.filter((p) => selectedPermisoIds?.includes(p.id)).length}/
                          {moduloPermisos.length}
                        </span>
                      </div>

                      {/* Permissions */}
                      <div className="px-4 py-3 flex flex-wrap gap-2">
                        {moduloPermisos.map((permiso) => {
                          const isSelected = selectedPermisoIds?.includes(permiso.id);
                          return (
                            <button
                              key={permiso.id}
                              type="button"
                              onClick={() => togglePermiso(permiso.id)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                isSelected
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {ACCION_LABELS[permiso.accion] || permiso.accion}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {errors.permisoIds && (
                  <p className="text-sm text-danger-600">{errors.permisoIds.message}</p>
                )}
              </div>
            )}
          />

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              <strong>{selectedPermisoIds?.length || 0}</strong> permisos seleccionados
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/roles')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? (
              'Guardando...'
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear Rol'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
