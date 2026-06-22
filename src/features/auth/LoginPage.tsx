import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../../shared/schemas';
import { useAuthStore } from '../../stores/authStore';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const setUser = useAuthStore(state => state.setUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.auth.login(data.username, data.password);
      if (res.ok) {
        setUser(res.data);
      } else {
        setError(res.error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F2F1D] via-[#14472A] to-[#1F6B3B] relative overflow-hidden px-4">
      {/* Background decorative glowing circles */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#1F6B3B] opacity-20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#2563EB] opacity-10 blur-[120px]" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 transform transition-all duration-300 hover:scale-[1.01] z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1F6B3B]/10 text-[#1F6B3B] mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">Fazal POS & Inventory</h1>
          <p className="text-sm text-[#6B7280] mt-1">Sign in to manage store operations</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#6B7280]">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                {...register('username')}
                placeholder="e.g. admin"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg text-sm text-[#111827] transition-all duration-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1F6B3B]/20"
              />
            </div>
            {errors.username && (
              <p className="text-xs text-red-600 mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#6B7280]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg text-sm text-[#111827] transition-all duration-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1F6B3B]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B7280] hover:text-[#111827]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#1F6B3B] hover:bg-[#195A31] disabled:bg-emerald-800/50 text-white rounded-lg text-sm font-semibold transition-colors duration-200 shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-[#6B7280]">
          Fazal POS & Inventory • Offline-First Retail ERP
        </div>
      </div>
    </div>
  );
}
