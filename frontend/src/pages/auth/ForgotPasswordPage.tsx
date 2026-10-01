import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});
type ForgotForm = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (_data: ForgotForm) => {
    // Simulate sending — in production, call your API
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950 rounded-2xl flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[--text]">Check your email</h1>
          <p className="mt-2 text-sm text-[--text-muted]">
            If an account exists with that email, we've sent a password reset link.
          </p>
        </div>
        <Link to="/login" className="btn btn-secondary btn-md">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[--text]">Reset your password</h1>
        <p className="mt-1 text-sm text-[--text-muted]">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label" htmlFor="forgot-email">Email address</label>
          <input
            id="forgot-email"
            type="email"
            className="input"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg w-full">
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[--text-muted]">
        Remember your password?{' '}
        <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
