import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
  terms: z.boolean().refine((v) => v, 'You must accept the terms'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function SignupPage() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password') || '';

  const onSubmit = async (data: SignupForm) => {
    setError('');
    try {
      const res = await apiClient.post('/auth/signup', {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      const { token, userId, profile } = res.data.data;
      setToken(token);
      setUser({ userId, name: data.fullName, profile });
      navigate('/onboarding');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || '';
      if (msg.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists.');
      } else {
        setError('Unable to create account. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--text]">Create your account</h1>
        <p className="mt-1 text-sm text-[--text-muted]">
          Start finding better local business leads today.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            className="input"
            placeholder="Your full name"
            autoComplete="name"
            {...register('fullName')}
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="signup-password">Password</label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password requirements */}
          {password && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {passwordRequirements.map((req) => {
                const met = req.test(password);
                return (
                  <div key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-[--text-muted]'}`}>
                    <Check className={`w-3 h-3 ${met ? 'opacity-100' : 'opacity-30'}`} />
                    {req.label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            type="password"
            className="input"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-[--border] accent-brand-600"
            {...register('terms')}
          />
          <span className="text-sm text-[--text-muted]">
            I agree to the{' '}
            <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline">Privacy Policy</a>
          </span>
        </label>
        {errors.terms && <p className="text-xs text-red-500 -mt-2">{errors.terms.message}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-lg w-full"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[--text-muted]">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
