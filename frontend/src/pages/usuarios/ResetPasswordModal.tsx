import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import { FormField, Input } from '../../components/FormField';
import { usuariosService } from '../../services/usuarios.service';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { UsuarioConRoles } from '@hofra/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuario: UsuarioConRoles | null;
}

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

export function ResetPasswordModal({ isOpen, onClose, onSuccess, usuario }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: FormData) => {
    if (!usuario) return;

    try {
      await usuariosService.resetPassword(usuario.id, data.newPassword);
      reset();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !usuario) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={handleClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Key className="w-5 h-5 text-warning-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Resetear Contraseña</h2>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Establecer nueva contraseña para <strong>{usuario.nombre} {usuario.apellido}</strong> ({usuario.email})
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Nueva Contraseña" error={errors.newPassword} required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  {...register('newPassword', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                  })}
                  error={errors.newPassword}
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

            <FormField label="Confirmar Contraseña" error={errors.confirmPassword} required>
              <Input
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword', {
                  required: 'Debe confirmar la contraseña',
                  validate: (value) => value === newPassword || 'Las contraseñas no coinciden',
                })}
                error={errors.confirmPassword}
                placeholder="Repetir contraseña"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={handleClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-warning">
                {isSubmitting ? 'Guardando...' : 'Resetear Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
