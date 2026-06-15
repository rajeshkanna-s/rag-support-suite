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
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-brand-borderDark/60 bg-slate-950/80 backdrop-blur-md shadow-2xl animate-fade-in-up">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        
        {/* Left branding panel with neural flows design */}
        <div className="hidden bg-gradient-to-br from-brand-indigo/35 via-slate-950 to-brand-teal/20 p-10 text-white lg:flex flex-col justify-between relative overflow-hidden border-r border-brand-borderDark/60">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-brand-indigo/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-brand-teal/10 blur-3xl animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-teal text-white shadow-glow-indigo">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <h2 className="mt-8 text-2xl font-bold tracking-tight font-display bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">SECURE ACCESS DOMAIN</h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-400 max-w-sm">
              Authenticate via enterprise portal credentials to update grounding knowledge bases, chunk vectors, and deploy model profiles.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 text-xs font-semibold tracking-wide uppercase text-slate-300 pt-12">
            <span className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5 hover:border-brand-teal/20 transition cursor-default">Knowledge RAG</span>
            <span className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5 hover:border-brand-indigo/20 transition cursor-default">Neural Audit</span>
            <span className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5 hover:border-brand-teal/20 transition cursor-default">Tenant Config</span>
            <span className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5 hover:border-brand-indigo/20 transition cursor-default">API Control</span>
          </div>
        </div>

        {/* Right form input panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-slate-950/40">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-indigo">Identity Gateway</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-white font-display">
              {mode === 'login' ? 'ESTABLISH ADMIN SESSION' : 'REGISTER SECURE ENDPOINT'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Enter system administrator authorization tokens.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Email Identifier
              <span className="mt-2.5 flex h-11 items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3.5 focus-within:border-brand-indigo focus-within:ring-1 focus-within:ring-brand-indigo/20 transition-all">
                <Mail size={15} aria-hidden="true" className="text-slate-500" />
                <input
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder-slate-600"
                  type="email"
                  placeholder="admin@company.com"
                  required
                />
              </span>
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Security Keyphrase
              <span className="mt-2.5 flex h-11 items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3.5 focus-within:border-brand-indigo focus-within:ring-1 focus-within:ring-brand-indigo/20 transition-all">
                <Lock size={15} aria-hidden="true" className="text-slate-500" />
                <input
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder-slate-600"
                  type="password"
                  placeholder="••••••••••••"
                  minLength={6}
                  required
                />
              </span>
            </label>

            {message && (
              <p className="rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-xs font-semibold text-amber-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-indigo to-brand-indigoDark text-xs font-bold uppercase tracking-wider text-white shadow-glow-indigo hover:brightness-110 transition disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none"
            >
              {loading ? 'Validating Token...' : mode === 'login' ? 'Establish Session' : 'Create Credentials'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="mt-4 text-center text-xs font-semibold text-brand-indigo hover:text-indigo-400 transition"
          >
            {mode === 'login' ? 'Request credentials registration' : 'Return to secure gateway session'}
          </button>
        </div>
      </div>
    </section>
  );
}
