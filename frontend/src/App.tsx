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
import { getWorkspaceSettings, subscribeWorkspace } from './services/workspaceSettings';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'customer' | null>(null);
  const [view, setView] = useState<'chat' | 'admin' | 'auth'>('chat');
  const [routeCategory, setRouteCategory] = useState<SupportCategory | undefined>(() =>
    pathToSupportCategory(window.location.pathname)
  );
  const [workspaceSettings, setWorkspaceSettingsState] = useState(getWorkspaceSettings);

  useEffect(() => {
    return subscribeWorkspace(() => {
      setWorkspaceSettingsState(getWorkspaceSettings());
    });
  }, []);

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
    <main className="h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      <div className="grid h-screen lg:grid-cols-[272px_1fr]">
        
        {/* Refined Sidebar - Slack/Linear Style Dark Slate */}
        <aside className="h-screen overflow-hidden border-b border-slate-800 bg-slate-900 text-white lg:sticky lg:top-0 lg:border-b-0 lg:border-r lg:border-slate-800 shadow-lg">
          <div className="flex h-full flex-col px-4 py-6">
            
            {/* Header Brand Logo */}
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md transition-transform duration-300 hover:rotate-6">
                <Bot size={22} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight font-display text-white">RAG Support</h1>
                <p className="text-[10px] font-bold tracking-wide uppercase text-indigo-400">Enterprise Desk</p>
              </div>
            </div>

            {/* Workspace details inside dark container */}
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3.5 mb-6">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                <Building2 size={12} aria-hidden="true" className="text-indigo-400" />
                Workspace
              </div>
              <p className="mt-1.5 text-sm font-semibold text-white tracking-tight">{workspaceSettings.companyName}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
                Production Sandbox
              </p>
            </div>

            {/* Navigation buttons */}
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => navigate(categoryToPath(routeCategory ?? 'HR'))}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                  view === 'chat'
                    ? 'bg-slate-800 text-white border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <MessageSquareText size={16} aria-hidden="true" className={view === 'chat' ? 'text-white' : 'text-slate-400'} />
                Ticket Console
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                  view === 'admin' || view === 'auth'
                    ? 'bg-slate-800 text-white border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <Database size={16} aria-hidden="true" className={view === 'admin' || view === 'auth' ? 'text-white' : 'text-slate-400'} />
                Admin Studio
              </button>
            </nav>

            {/* User Access Card */}
            <div className="mt-auto bg-slate-800/40 border border-slate-700/30 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <ShieldCheck size={12} aria-hidden="true" className="text-indigo-400" />
                Access Layer
              </div>
              <p className="mt-1.5 truncate text-xs font-semibold text-slate-200">{userLabel}</p>
              <p className="text-[11px] capitalize text-indigo-400 mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {role ?? (session ? 'Authorized Admin' : 'Public Operator')}
              </p>
            </div>

            {session && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-red-950/20 hover:border-red-900/30 hover:text-red-400 px-3 py-2.5 text-xs font-medium text-slate-400 transition-colors"
              >
                <LogOut size={14} aria-hidden="true" />
                Disconnect Session
              </button>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <section className="min-w-0 overflow-y-auto bg-slate-50 flex flex-col h-screen">
          
          {/* Sub Content Grid */}
          <div className={`flex-1 ${view === 'chat' ? 'flex flex-col min-h-0' : 'overflow-y-auto'} px-4 py-6 sm:px-6 lg:px-8`}>
            <div className="flex gap-2 mb-4 lg:hidden shrink-0">
              <button
                type="button"
                onClick={() => navigate(categoryToPath(routeCategory ?? 'HR'))}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold ${
                  view === 'chat'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Customer Console
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold ${
                  view === 'admin' || view === 'auth'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Admin Studio
              </button>
            </div>

            {/* Mount page views */}
            <div className={`animate-fade-in-up ${view === 'chat' ? 'flex-1 flex flex-col min-h-0' : ''}`}>
              {view === 'chat' && (
                <CustomerChat
                  fixedCategory={routeCategory}
                  onCategoryChange={newCategory => navigate(categoryToPath(newCategory))}
                />
              )}
              {view === 'auth' && <AuthPage onDone={() => setView('admin')} />}
              {view === 'admin' &&
                (session ? (
                  <AdminDashboard accessToken={session.access_token} />
                ) : (
                  <AuthPage onDone={() => setView('admin')} />
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
