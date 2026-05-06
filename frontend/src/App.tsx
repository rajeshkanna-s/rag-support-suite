import { useEffect, useState } from 'react';
import {
  Bell,
  Bot,
  Building2,
  Database,
  LogOut,
  MessageSquareText,
  Search,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthPage } from './components/AuthPage';
import { CustomerChat } from './components/CustomerChat';
import { supabase } from './services/supabase';
import {
  categoryToPath,
  pathToSupportCategory,
  SupportCategory,
} from './types';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'customer' | null>(null);
  const [view, setView] = useState<'chat' | 'admin' | 'auth'>('chat');
  const [routeCategory, setRouteCategory] = useState<SupportCategory | undefined>(() =>
    pathToSupportCategory(window.location.pathname)
  );

  function syncViewFromPath() {
    const path = window.location.pathname;
    const category = pathToSupportCategory(path);
    setRouteCategory(category);

    if (category) {
      setView('chat');
      return;
    }

    if (path === '/admin') {
      setView('admin');
      return;
    }

    if (path !== '/') {
      window.history.replaceState({}, '', categoryToPath('HR'));
      setRouteCategory('HR');
    }

    setView('chat');
  }

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    syncViewFromPath();
  }

  async function loadProfile(nextSession: Session | null) {
    setSession(nextSession);
    setRole(null);

    if (!nextSession) return;
    setRole('admin');
  }

  useEffect(() => {
    syncViewFromPath();
    window.addEventListener('popstate', syncViewFromPath);
    supabase.auth.getSession().then(({ data }) => void loadProfile(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadProfile(nextSession);
    });

    return () => {
      window.removeEventListener('popstate', syncViewFromPath);
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate(categoryToPath(routeCategory ?? 'HR'));
  }

  const userLabel = session?.user.email ?? 'Guest';

  return (
    <main className="h-screen overflow-hidden bg-[#eef2f5] text-ink">
      <div className="grid h-screen lg:grid-cols-[272px_1fr]">
        <aside className="h-screen overflow-hidden border-b border-[#183235] bg-[#102326] text-white lg:sticky lg:top-0 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-4 py-5">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#16a085] text-white shadow-sm">
                <Bot size={24} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-semibold">RAG Support Suite</h1>
                <p className="text-xs text-zinc-300">Enterprise support desk</p>
              </div>
            </div>

            <div className="mt-5 rounded-md border border-white/10 bg-white/[0.06] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">
                <Building2 size={14} aria-hidden="true" />
                Workspace
              </div>
              <p className="mt-2 text-sm font-semibold">Acme Global Services</p>
              <p className="text-xs text-zinc-400">Production environment</p>
            </div>

            <nav className="mt-6 grid gap-1">
              <button
                type="button"
                onClick={() => navigate(categoryToPath(routeCategory ?? 'HR'))}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                  view === 'chat'
                    ? 'bg-white font-semibold text-[#102326]'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <MessageSquareText size={18} aria-hidden="true" />
                Ticket Console
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                  view === 'admin' || view === 'auth'
                    ? 'bg-white font-semibold text-[#102326]'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Database size={18} aria-hidden="true" />
                Admin Studio
              </button>
            </nav>

            <div className="mt-auto rounded-md border border-white/10 bg-white/[0.06] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                <ShieldCheck size={14} aria-hidden="true" />
                Access
              </div>
              <p className="mt-2 truncate text-sm font-medium text-white">{userLabel}</p>
              <p className="text-xs capitalize text-zinc-400">{role ?? (session ? 'checking' : 'public')}</p>
            </div>

            {session && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut size={15} aria-hidden="true" />
                Logout
              </button>
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-y-auto">
          <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ocean">
                  {view === 'chat'
                    ? 'Customer operations'
                    : 'Knowledge operations'}
                </p>
                <h2 className="mt-1 text-[28px] font-semibold tracking-normal">
                  {view === 'chat'
                    ? 'Omnichannel Support Console'
                    : 'AI Knowledge Control Center'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="hidden h-10 min-w-[320px] items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm xl:flex">
                  <Search size={16} aria-hidden="true" className="text-zinc-500" />
                  <input
                    placeholder="Search tickets, documents, customers"
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell size={17} aria-hidden="true" />
                </button>
                <span className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Online
                </span>
                <span className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700">
                  <UserCircle size={16} aria-hidden="true" />
                  {session ? 'Signed in' : 'Public access'}
                </span>
              </div>
            </div>
          </header>

          <div className="max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(categoryToPath(routeCategory ?? 'HR'))}
              className={`mb-4 mr-2 rounded-md border px-3 py-2 text-sm lg:hidden ${
                view === 'chat' ? 'border-ocean bg-teal-50 text-ocean' : 'border-zinc-300 bg-white'
              }`}
            >
              Customer View
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className={`mb-4 rounded-md border px-3 py-2 text-sm lg:hidden ${
                view === 'admin' || view === 'auth'
                  ? 'border-ocean bg-teal-50 text-ocean'
                  : 'border-zinc-300 bg-white'
              }`}
            >
              Admin
            </button>

            {view === 'chat' && <CustomerChat fixedCategory={routeCategory} />}
            {view === 'auth' && <AuthPage onDone={() => setView('admin')} />}
            {view === 'admin' &&
              (session ? (
                <AdminDashboard accessToken={session.access_token} />
              ) : (
                <AuthPage onDone={() => setView('admin')} />
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
