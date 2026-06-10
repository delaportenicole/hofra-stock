import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Save, Eye, EyeOff, Shield } from 'lucide-react';
import { usuariosService } from '../../services/usuarios.service';
import { rolesService } from '../../services/roles.service';
import { FormField, Input } from '../../components/FormField';
import { PageLoader } from '../../components/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { CreateUsuarioDto, UpdateUsuarioDto, Rol } from '@hofra/shared';

type FormData = {
  username: string;
  email: string;
  password?: string;
  nombre: string;
  apellido: string;
  roleIds: string[];
  activo?: boolean;
};

export function UsuarioFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      roleIds: [],
    },
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Always load roles
      const rolesData = await rolesService.getAll({ limit: 100 });
      setRoles(rolesData.data);

      // Load usuario if editing
      if (isEditing) {
        const usuario = await usuariosService.getById(id!);
        reset({
          username: usuario.username,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          roleIds: usuario.roles.map((r) => r.id),
          activo: usuario.activo,
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        const updateData: UpdateUsuarioDto = {
          username: data.username,
          email: data.email,
          nombre: data.nombre,
          apellido: data.apellido,
          roleIds: data.roleIds,
          activo: data.activo,
        };
        await usuariosService.update(id!, updateData);
        toast.success('Usuario actualizado');
      } else {
        const createData: CreateUsuarioDto = {
          username: data.username,
          email: data.email,
          password: data.password!,
          nombre: data.nombre,
          apellido: data.apellido,
          roleIds: data.roleIds,
        };
        await usuariosService.create(createData);
        toast.success('Usuario creado');
      }
      navigate('/usuarios');
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
        <button onClick={() => navigate('/usuarios')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        {/* Datos personales */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos Personales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nombre" error={errors.nombre} required>
              <Input
                {...register('nombre', {
                  required: 'El nombre es requerido',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
                error={errors.nombre}
                placeholder="Juan"
              />
            </FormField>

            <FormField label="Apellido" error={errors.apellido} required>
              <Input
                {...register('apellido', {
                  required: 'El apellido es requerido',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
                error={errors.apellido}
                placeholder="Pérez"
              />
            </FormField>

            <FormField label="Nombre de Usuario" error={errors.username} required>
              <Input
                {...register('username', {
                  required: 'El nombre de usuario es requerido',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                  maxLength: { value: 50, message: 'Máximo 50 caracteres' },
                  pattern: {
                    value: /^[a-zA-Z0-9_.-]+$/,
                    message: 'Solo letras, números, puntos, guiones y guiones bajos',
                  },
                })}
                error={errors.username}
                placeholder="jperez"
              />
              <p className="text-xs text-gray-500 mt-1">Este será el usuario para iniciar sesión</p>
            </FormField>

            <FormField label="Email" error={errors.email} required>
              <Input
                type="email"
                {...register('email', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email inválido',
                  },
                })}
                error={errors.email}
                placeholder="juan.perez@empresa.com"
              />
            </FormField>

            {!isEditing && (
              <FormField label="Contraseña" error={errors.password} required className="md:col-span-2">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'La contraseña es requerida',
                      minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                    })}
                    error={errors.password}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>
            )}
          </div>
        </div>

        {/* Roles */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Roles y Permisos</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Seleccione los roles que tendrá el usuario. Los permisos se heredan de los roles asignados.
          </p>

          <Controller
            name="roleIds"
            control={control}
            rules={{ validate: (value) => value.length > 0 || 'Debe asignar al menos un rol' }}
            render={({ field }) => (
              <div className="space-y-2">
                {roles.map((rol) => (
                  <label
                    key={rol.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      field.value.includes(rol.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={field.value.includes(rol.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...field.value, rol.id]);
                        } else {
                          field.onChange(field.value.filter((id: string) => id !== rol.id));
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{rol.nombre}</p>
                      {rol.descripcion && (
                        <p className="text-sm text-gray-500">{rol.descripcion}</p>
                      )}
                    </div>
                  </label>
                ))}
                {errors.roleIds && (
                  <p className="text-sm text-danger-600">{errors.roleIds.message}</p>
                )}
              </div>
            )}
          />
        </div>

        {/* Estado (solo edición) */}
        {isEditing && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado</h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('activo')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Usuario activo</span>
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Los usuarios inactivos no pueden iniciar sesión en el sistema.
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/usuarios')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? (
              'Guardando...'
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear Usuario'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
