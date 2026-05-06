import { FormEvent, useState } from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthPageProps {
  onDone: () => void;
}

export function AuthPage({ onDone }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(mode === 'signup' ? 'Account created. You can use the admin area after login.' : '');
    onDone();
  }

  return (
    <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[1fr_420px]">
        <div className="hidden bg-[#122426] p-8 text-white lg:block">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10">
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <h2 className="mt-8 text-3xl font-semibold">Secure admin access</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-300">
            Manage department knowledge and support documents from one controlled workspace.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm text-zinc-200">
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Knowledge RAG</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Analytics</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Company setup</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Analytics</span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ocean">Admin Portal</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {mode === 'login' ? 'Login to your account' : 'Create an account'}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">Use your authorized admin credentials.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-zinc-700">
              Email
              <span className="mt-1 flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 transition focus-within:border-ocean focus-within:ring-2 focus-within:ring-ocean/15">
                <Mail size={16} aria-hidden="true" className="text-zinc-500" />
                <input
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="w-full outline-none"
                  type="email"
                  required
                />
              </span>
            </label>

            <label className="block text-sm font-medium text-zinc-700">
              Password
              <span className="mt-1 flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 transition focus-within:border-ocean focus-within:ring-2 focus-within:ring-ocean/15">
                <Lock size={16} aria-hidden="true" className="text-zinc-500" />
                <input
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full outline-none"
                  type="password"
                  minLength={6}
                  required
                />
              </span>
            </label>

            {message && (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-ocean px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-zinc-300"
            >
              {loading ? 'Please wait' : mode === 'login' ? 'Login' : 'Sign up'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="mt-4 text-sm font-medium text-ocean hover:text-teal-800"
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </section>
  );
}
