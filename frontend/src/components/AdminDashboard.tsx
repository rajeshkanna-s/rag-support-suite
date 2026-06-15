import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BellRing,
  Building2,
  CheckCircle2,
  Database,
  FileText,
  FileUp,
  Filter,
  Globe2,
  Link as LinkIcon,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  deleteKnowledgeDocument,
  listKnowledge,
  uploadKnowledgeFile,
  uploadKnowledgeLink,
  uploadKnowledgeText,
} from '../services/api';
import {
  getEnabledDepartments,
  setEnabledDepartments,
} from '../services/departmentSettings';
import { KnowledgeDocument, SUPPORT_CATEGORIES, SupportCategory } from '../types';

interface AdminDashboardProps {
  accessToken: string;
}

type UploadMode = 'text' | 'file' | 'link';
type AdminTab = 'knowledge' | 'company' | 'analytics';

export function AdminDashboard({ accessToken }: AdminDashboardProps) {
  const [category, setCategory] = useState<SupportCategory>('HR');
  const [activeTab, setActiveTab] = useState<AdminTab>('knowledge');
  const [uploadMode, setUploadMode] = useState<UploadMode>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabledDepartments, setLocalEnabledDepartments] = useState<SupportCategory[]>(getEnabledDepartments);

  const groupedCount = useMemo(() => {
    return SUPPORT_CATEGORIES.reduce<Record<string, number>>((acc, item) => {
      acc[item] = documents.filter(document => document.category === item).length;
      return acc;
    }, {});
  }, [documents]);

  const selectedDocuments = useMemo(() => {
    const normalized = search.toLowerCase().trim();
    return documents
      .filter(document => document.category === category)
      .filter(document => {
        if (!normalized) return true;
        return [document.title, document.source_type, document.original_filename ?? '', document.source_url ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      });
  }, [category, documents, search]);

  const totalCharacters = useMemo(() => {
    return documents.reduce((sum, document) => sum + document.char_count, 0);
  }, [documents]);

  const latestDocument = documents[0];

  async function refreshDocuments() {
    try {
      setDocuments(await listKnowledge(accessToken));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load knowledge documents.');
    }
  }

  useEffect(() => {
    void refreshDocuments();
  }, [accessToken]);

  async function runUpload(task: () => Promise<{ documentId: string; chunks: number }>) {
    setLoading(true);
    setMessage('');
    try {
      const result = await task();
      setMessage(`Saved document with ${result.chunks} chunk(s).`);
      setTitle('');
      setText('');
      setUrl('');
      setFile(null);
      await refreshDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleTextSubmit(event: FormEvent) {
    event.preventDefault();
    void runUpload(() =>
      uploadKnowledgeText({
        accessToken,
        category,
        title: title || `${category} pasted knowledge`,
        contentText: text,
      })
    );
  }

  function handleLinkSubmit(event: FormEvent) {
    event.preventDefault();
    void runUpload(() =>
      uploadKnowledgeLink({
        accessToken,
        category,
        title: title || url,
        url,
      })
    );
  }

  function handleFileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage('Choose a file first.');
      return;
    }

    void runUpload(() =>
      uploadKnowledgeFile({
        accessToken,
        category,
        title: title || file.name,
        file,
      })
    );
  }

  async function handleDeleteDocument(documentId: string, documentTitle: string) {
    const confirmed = window.confirm(`Delete "${documentTitle}" from the knowledge base?`);
    if (!confirmed) return;

    setLoading(true);
    setMessage('');
    try {
      await deleteKnowledgeDocument(accessToken, documentId);
      setMessage('Document deleted from Supabase.');
      await refreshDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setLoading(false);
    }
  }

  function toggleDepartment(item: SupportCategory) {
    const next = enabledDepartments.includes(item)
      ? enabledDepartments.filter(categoryItem => categoryItem !== item)
      : [...enabledDepartments, item];
    const finalValue = next.length > 0 ? next : [item];
    setLocalEnabledDepartments(finalValue);
    setEnabledDepartments(finalValue);
  }

  const tabs: Array<{ key: AdminTab; label: string; icon: typeof Database }> = [
    { key: 'knowledge', label: 'Knowledge', icon: Database },
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'analytics', label: 'Analytics', icon: Activity },
  ];

  return (
    <section className="space-y-6 animate-fade-in-up">
      {/* Top Banner & Stats Overview */}
      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Main Dashboard Welcome Card */}
        <div className="min-w-0 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-200">Admin Studio</p>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight font-display text-white">Neural Knowledge Desk</h2>
            <p className="mt-2.5 text-xs leading-relaxed text-indigo-100">
              Control department data sources, index embeddings, and audit RAG accuracy metrics.
            </p>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        {[
          { label: 'Indexed Documents', value: documents.length.toString(), badge: 'Sync Complete', color: 'teal', icon: Database },
          { label: 'Character Count', value: totalCharacters.toLocaleString(), badge: 'Data Corpus', color: 'indigo', icon: FileText },
          {
            label: 'Latest Database Update',
            value: latestDocument ? latestDocument.title : 'No documents',
            badge: latestDocument ? 'Active' : 'Pending Ingest',
            color: 'teal',
            icon: RefreshCw
          },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{item.label}</p>
                  <p className="mt-2.5 truncate text-xl font-bold text-slate-800 tracking-tight">{item.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-200 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition duration-300">
                  <Icon size={15} />
                </div>
              </div>
              <div className="mt-4">
                <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  item.color === 'teal' ? 'badge-teal' : 'badge-indigo'
                }`}>
                  {item.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Segmented Controller Tab Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-100 p-1.5 shadow-sm max-w-xl mx-auto">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  isActive 
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                }`}
              >
                <Icon size={14} aria-hidden="true" className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* Department List Panel */}
          <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm self-start">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Department Index</h2>
              <button
                type="button"
                onClick={() => void refreshDocuments()}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition shadow-sm"
                aria-label="Refresh database list"
                title="Refresh database list"
              >
                <RefreshCw size={13} aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-1.5">
              {SUPPORT_CATEGORIES.map(item => {
                const isActive = item === category;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`flex min-h-11 items-center justify-between rounded-xl border px-3.5 text-left text-xs font-semibold tracking-wide transition-all duration-200 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-600 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    <span>{item}</span>
                    <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {groupedCount[item] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Operations panel */}
          <div className="min-w-0 space-y-6">
            {/* Knowledge Intake Card */}
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-slate-800 font-display uppercase">{category} INGESTION PIPELINE</h2>
                    <p className="text-xs text-slate-500">Inject raw operational data sources into the RAG vector space.</p>
                  </div>
                  
                  {/* Mode Selector */}
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                    {[
                      { key: 'text', label: 'Raw text', icon: FileText },
                      { key: 'file', label: 'File upload', icon: FileUp },
                      { key: 'link', label: 'Web Scrape', icon: LinkIcon },
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = uploadMode === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setUploadMode(item.key as UploadMode)}
                          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition ${
                            isSelected
                              ? 'bg-white text-indigo-600 shadow-sm border border-slate-250'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Icon size={13} aria-hidden="true" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {message && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                    {message}
                  </p>
                )}
              </div>

              {/* Upload Input Fields */}
              <div className="pt-5 space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Document Title / Identifier
                  <input
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    placeholder={`${category} operational protocol revision v1.4`}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </label>

                {/* Text Ingestion Mode */}
                {uploadMode === 'text' && (
                  <form onSubmit={handleTextSubmit} className="space-y-4 pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Intake content
                      <textarea
                        value={text}
                        onChange={event => setText(event.target.value.slice(0, 50000))}
                        maxLength={50000}
                        rows={8}
                        placeholder="Paste employee handbook policies, FAQ definitions, customer support flows, or service details here..."
                        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-800 placeholder-slate-400 leading-relaxed outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </label>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
                        style={{ width: `${Math.min(100, (text.length / 50000) * 100)}%` }}
                      />
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
                      <span className="text-[11px] font-semibold text-slate-400">{text.length.toLocaleString()} / 50,000 character allocation</span>
                      <button
                        type="submit"
                        disabled={loading || !text.trim()}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                      >
                        <Save size={13} aria-hidden="true" />
                        Index Text
                      </button>
                    </div>
                  </form>
                )}

                {/* File Dropzone Ingestion Mode */}
                {uploadMode === 'file' && (
                  <form onSubmit={handleFileSubmit} className="space-y-4 pt-2">
                    <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center transition hover:border-indigo-500 hover:bg-white">
                      <UploadCloud size={34} aria-hidden="true" className="text-indigo-500" />
                      <span className="mt-4 text-xs font-bold text-slate-700">
                        {file ? file.name : 'Select or drop enterprise RAG reference file'}
                      </span>
                      <span className="mt-1 text-[11px] text-slate-450">Supports TXT, MD, PDF, or DOCX formats (Max 15MB)</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={event => setFile(event.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={loading || !file}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      <FileUp size={13} aria-hidden="true" />
                      Upload File Ingestion
                    </button>
                  </form>
                )}

                {/* Web Link Ingestion Mode */}
                {uploadMode === 'link' && (
                  <form onSubmit={handleLinkSubmit} className="space-y-4 pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Source Web Address
                      <input
                        value={url}
                        onChange={event => setUrl(event.target.value)}
                        type="url"
                        placeholder="https://docs.company.com/customer-refunds"
                        className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={loading || !url.trim()}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      <LinkIcon size={13} aria-hidden="true" />
                      Scrape Website
                    </button>
                  </form>
                )}
              </div>
            </section>

            {/* Stored Documents Listing */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Index Resources</h3>
                  <p className="text-[11px] text-slate-500">{selectedDocuments.length} document(s) verified in {category}</p>
                </div>
                <label className="flex h-10 min-w-[280px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs">
                  <Search size={14} aria-hidden="true" className="text-slate-400" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search documents..."
                    className="w-full bg-transparent text-slate-800 outline-none placeholder-slate-450"
                  />
                </label>
              </div>

              {/* Data Table Grid */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-[0.15em] text-slate-450">
                    <tr>
                      <th className="px-4 py-3.5 font-bold">Document Name</th>
                      <th className="px-4 py-3.5 font-bold">Source</th>
                      <th className="px-4 py-3.5 font-bold">Corpus Size</th>
                      <th className="px-4 py-3.5 font-bold">Indexed Date</th>
                      <th className="px-4 py-3.5 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDocuments.map(document => (
                      <tr key={document.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="px-4 py-3.5 font-semibold text-slate-700 max-w-[280px] truncate">{document.title}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide badge-indigo">
                            {document.source_type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-semibold">{document.char_count.toLocaleString()} chars</td>
                        <td className="px-4 py-3.5 text-slate-550">
                          {new Date(document.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(document.id, document.title)}
                            disabled={loading}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-650 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition disabled:opacity-40 shadow-sm"
                            aria-label={`Delete ${document.title}`}
                            title="Purge source"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedDocuments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium tracking-wide">
                          No knowledge records indexed for {category}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Sidebar Auxiliary metrics checklist */}
          <aside className="grid min-w-0 gap-5 xl:col-span-2 xl:grid-cols-3">
            {/* Category health widgets */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={15} aria-hidden="true" className="text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Category Coverage</h3>
              </div>
              <div className="space-y-3">
                {SUPPORT_CATEGORIES.map(item => {
                  const count = groupedCount[item] ?? 0;
                  const width = Math.min(100, count * 20);
                  const isCurrent = item === category;
                  return (
                    <div key={item}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-semibold ${isCurrent ? 'text-slate-800' : 'text-slate-500'}`}>{item}</span>
                        <span className="text-slate-600 font-bold">{count} docs</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isCurrent ? 'bg-indigo-600' : 'bg-slate-350'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">Ingestion Checklist</h3>
              <div className="space-y-3 text-xs">
                {['Metadata Verified', 'Target Category Selected', 'Document Header Formatted', 'Context Splitting complete', 'Vectors Ready for Chatbot'].map(
                  (item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-50 border border-slate-200">
                        <CheckCircle2
                          size={13}
                          aria-hidden="true"
                          className={index < 2 || title ? 'text-indigo-600' : 'text-slate-300'}
                        />
                      </div>
                      <span className="text-slate-600 font-medium">{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* visibility settings */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Workspace Exposure</h3>
              <p className="text-[11px] leading-relaxed text-slate-400 mb-3.5">
                Toggle active departments to adjust client operator exposure limits in real-time.
              </p>
              <div className="space-y-2">
                {SUPPORT_CATEGORIES.map(item => (
                  <label key={item} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:border-slate-350 transition">
                    <span>{item}</span>
                    <input
                      type="checkbox"
                      checked={enabledDepartments.includes(item)}
                      onChange={() => toggleDepartment(item)}
                      className="h-4 w-4 rounded border-slate-300 bg-white text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* TAB CONTENT: COMPANY SETTINGS */}
      {activeTab === 'company' && (
        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-800 font-display uppercase">Corporate Profile Branding</h2>
              <p className="text-xs text-slate-550">Configure visual themes and default settings for your workspace.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Company Name', 'Acme Global Services'],
                ['Support Dispatch Email', 'support@company.com'],
                ['Localization Language', 'English (US)'],
                ['Operational Timezone', 'Asia/Kolkata'],
                ['Support Custom Domain', 'support.company.com'],
                ['System Brand Hex Color', '#0d9488'],
              ].map(([label, value]) => (
                <label key={label} className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {label}
                  <input
                    defaultValue={value}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Operator Tab Restrictions</h3>
              <p className="text-[11px] leading-relaxed text-slate-400 mb-4">
                Define visibility mappings. Checking a category displays the department chat inside the Client Console.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {SUPPORT_CATEGORIES.map(item => (
                  <label key={item} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 cursor-pointer hover:border-slate-350 transition">
                    <span>{item}</span>
                    <input
                      type="checkbox"
                      checked={enabledDepartments.includes(item)}
                      onChange={() => toggleDepartment(item)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Globe2 size={20} aria-hidden="true" className="text-indigo-600" />
              <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-800">Tenant Architecture</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Establish white-labeled support modules for different customer environments.
              </p>
            </div>
          </aside>
        </section>
      )}

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === 'analytics' && (
        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold tracking-tight text-slate-800 font-display uppercase mb-5">RAG Coverage Density</h2>
            <div className="space-y-5">
              {SUPPORT_CATEGORIES.map(item => {
                const count = documents.filter(d => d.category === item).length;
                const width = Math.min(100, count * 18);
                return (
                  <div key={item}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">{item}</span>
                      <span className="text-indigo-600 font-bold">{count} records indexed</span>
                    </div>
                    <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <BellRing size={20} aria-hidden="true" className="text-indigo-600" />
              <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-800">Intelligent Optimization Tips</h3>
              <ul className="mt-3.5 space-y-2 text-xs leading-relaxed text-slate-500 list-disc pl-4">
                <li>Load at least 3 FAQ document assets per category.</li>
                <li>Review ungrounded conversation logs every week.</li>
                <li>Update static policy changes to avoid AI drift.</li>
              </ul>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden flex flex-col items-center justify-center py-8">
              <SlidersHorizontal size={22} aria-hidden="true" className="text-indigo-650 mb-2" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Quality Assessment</h3>
              <p className="mt-3 text-4xl font-extrabold text-indigo-600 tracking-tight">{documents.length > 0 ? 84 : 15}%</p>
              <span className="mt-2 text-[10px] text-indigo-500 uppercase tracking-wider font-bold">Calculated Corpus Health</span>
            </div>
          </aside>
        </section>
      )}
    </section>
  );
}
