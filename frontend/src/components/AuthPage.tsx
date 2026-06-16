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
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-fade-in-up">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        
        {/* Left branding panel with neural flows design */}
        <div className="hidden bg-gradient-to-br from-indigo-50/80 via-slate-50 to-teal-50/60 p-10 text-slate-800 lg:flex flex-col justify-between relative overflow-hidden border-r border-slate-200">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-teal-500/5 blur-3xl animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <h2 className="mt-8 text-2xl font-bold tracking-tight font-display text-slate-800">SECURE ACCESS DOMAIN</h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 max-w-sm">
              Authenticate via enterprise portal credentials to update grounding knowledge bases, chunk vectors, and deploy model profiles.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 pt-12">
            <span className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3.5 hover:border-indigo-500 hover:text-indigo-600 transition cursor-default shadow-sm flex items-center justify-center text-center">Knowledge RAG</span>
            <span className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3.5 hover:border-indigo-500 hover:text-indigo-600 transition cursor-default shadow-sm flex items-center justify-center text-center">Neural Audit</span>
            <span className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3.5 hover:border-indigo-500 hover:text-indigo-600 transition cursor-default shadow-sm flex items-center justify-center text-center">Tenant Config</span>
            <span className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3.5 hover:border-indigo-500 hover:text-indigo-600 transition cursor-default shadow-sm flex items-center justify-center text-center">API Control</span>
          </div>
        </div>

        {/* Right form input panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600 font-display">Identity Gateway</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-800 font-display uppercase">
              {mode === 'login' ? 'ESTABLISH ADMIN SESSION' : 'REGISTER SECURE ENDPOINT'}
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">Enter system administrator authorization tokens.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Email Identifier
              <span className="mt-2 flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                <Mail size={15} aria-hidden="true" className="text-slate-400" />
                <input
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400 font-semibold"
                  type="email"
                  placeholder="admin@company.com"
                  required
                />
              </span>
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Security Keyphrase
              <span className="mt-2 flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                <Lock size={15} aria-hidden="true" className="text-slate-400" />
                <input
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400 font-semibold"
                  type="password"
                  placeholder="••••••••••••"
                  minLength={6}
                  required
                />
              </span>
            </label>

            {message && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:from-indigo-700 hover:to-indigo-800 transition disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {loading ? 'Validating Token...' : mode === 'login' ? 'Establish Session' : 'Create Credentials'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="mt-5 text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
          >
            {mode === 'login' ? 'Request credentials registration' : 'Return to secure gateway session'}
          </button>
        </div>
      </div>
    </section>
  );
}
