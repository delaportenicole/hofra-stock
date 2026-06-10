import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { FormField, Input } from '../components/FormField';

interface LoginForm {
  username: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    const success = await login(data.username, data.password);
    setIsLoading(false);

    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-3xl">H</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Hofra Stock
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Gestión de Inventario
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="card p-6 space-y-4">
            <FormField label="Usuario" error={errors.username} required>
              <Input
                type="text"
                autoComplete="username"
                {...register('username', {
                  required: 'El usuario es requerido',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                })}
                error={errors.username}
                placeholder="Ingrese su nombre de usuario"
              />
            </FormField>

            <FormField label="Contraseña" error={errors.password} required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'La contraseña es requerida',
                  })}
                  error={errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </FormField>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                'Ingresando...'
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Ingresar
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500">
          Usuario demo: admin / Admin123!
        </p>
      </div>
    </div>
  );
}
