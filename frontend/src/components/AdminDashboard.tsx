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
    <section className="space-y-5">
      <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="min-w-0 rounded-md border border-zinc-200 bg-[#112b2e] p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-200">Admin Studio</p>
          <h2 className="mt-2 text-2xl font-semibold">AI readiness center</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Govern company knowledge and content quality across every department.
          </p>
        </div>

        {[
          { label: 'Documents', value: documents.length.toString(), badge: 'Indexed' },
          { label: 'Characters', value: totalCharacters.toLocaleString(), badge: 'Corpus' },
          {
            label: 'Latest Update',
            value: latestDocument ? latestDocument.title : 'No documents',
            badge: latestDocument ? 'Synced' : 'Pending',
          },
        ].map(item => (
          <div key={item.label} className="min-w-0 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{item.label}</p>
            <p className="mt-3 truncate text-2xl font-semibold">{item.value}</p>
            <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
              {item.badge}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-zinc-200 bg-white p-1 shadow-sm">
        <div className="grid gap-1 md:grid-cols-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex h-11 items-center justify-center gap-2 rounded text-sm font-medium transition ${
                  activeTab === tab.key ? 'bg-ocean text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'knowledge' && (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Department Data</h2>
              <button
                type="button"
                onClick={() => void refreshDocuments()}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
                aria-label="Refresh documents"
                title="Refresh documents"
              >
                <RefreshCw size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {SUPPORT_CATEGORIES.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`flex min-h-12 items-center justify-between rounded-md border px-3 text-left text-sm transition ${
                    item === category
                      ? 'border-ocean bg-teal-50 font-semibold text-ocean'
                      : 'border-zinc-200 text-zinc-700 hover:border-ocean hover:bg-zinc-50'
                  }`}
                >
                  <span>{item}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500">
                    {groupedCount[item] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="min-w-0 rounded-md border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{category} Knowledge Intake</h2>
                    <p className="text-sm text-zinc-500">Add verified content to this department knowledge base.</p>
                  </div>
                  <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-1">
                    {[
                      { key: 'text', label: 'Text', icon: FileText },
                      { key: 'file', label: 'File', icon: FileUp },
                      { key: 'link', label: 'Link', icon: LinkIcon },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setUploadMode(item.key as UploadMode)}
                          className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm transition ${
                            uploadMode === item.key
                              ? 'bg-white font-semibold text-ocean shadow-sm'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          <Icon size={15} aria-hidden="true" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {message && (
                  <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {message}
                  </p>
                )}
              </div>

              <div className="p-5">
                <label className="block text-sm font-medium text-zinc-700">
                  Title
                  <input
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    placeholder={`${category} policy update`}
                    className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                  />
                </label>

                {uploadMode === 'text' && (
                  <form onSubmit={handleTextSubmit} className="mt-5">
                    <textarea
                      value={text}
                      onChange={event => setText(event.target.value.slice(0, 50000))}
                      maxLength={50000}
                      rows={13}
                      placeholder="Paste department support content, policy text, SOPs, FAQs, or process notes."
                      className="w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                    />
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-ocean transition-all"
                        style={{ width: `${Math.min(100, (text.length / 50000) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-zinc-500">{text.length.toLocaleString()} / 50,000 characters</span>
                      <button
                        type="submit"
                        disabled={loading || !text.trim()}
                        className="flex h-10 items-center justify-center gap-2 rounded-md bg-ocean px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-zinc-300"
                      >
                        <Save size={16} aria-hidden="true" />
                        Save Text
                      </button>
                    </div>
                  </form>
                )}

                {uploadMode === 'file' && (
                  <form onSubmit={handleFileSubmit} className="mt-5">
                    <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition hover:border-ocean">
                      <UploadCloud size={34} aria-hidden="true" className="text-ocean" />
                      <span className="mt-3 text-sm font-semibold text-zinc-800">
                        {file ? file.name : 'Drop or choose PDF, DOCX, TXT, or MD'}
                      </span>
                      <span className="mt-1 text-xs text-zinc-500">Content is extracted, chunked, embedded, and stored.</span>
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
                      className="mt-3 flex h-10 items-center justify-center gap-2 rounded-md bg-ocean px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-zinc-300"
                    >
                      <FileUp size={16} aria-hidden="true" />
                      Upload File
                    </button>
                  </form>
                )}

                {uploadMode === 'link' && (
                  <form onSubmit={handleLinkSubmit} className="mt-5">
                    <input
                      value={url}
                      onChange={event => setUrl(event.target.value)}
                      type="url"
                      placeholder="https://example.com/support-policy"
                      className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                    />
                    <button
                      type="submit"
                      disabled={loading || !url.trim()}
                      className="mt-3 flex h-10 items-center justify-center gap-2 rounded-md bg-ocean px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-zinc-300"
                    >
                      <LinkIcon size={16} aria-hidden="true" />
                      Capture Link
                    </button>
                  </form>
                )}
              </div>
            </section>

            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Stored Documents</h3>
                  <p className="text-sm text-zinc-500">{selectedDocuments.length} document(s) in {category}</p>
                </div>
                <label className="flex h-10 min-w-[280px] items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm">
                  <Search size={16} aria-hidden="true" className="text-zinc-500" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search documents"
                    className="w-full outline-none"
                  />
                </label>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-y border-zinc-200 bg-zinc-50 text-xs uppercase tracking-[0.08em] text-zinc-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Title</th>
                      <th className="px-3 py-3 font-semibold">Type</th>
                      <th className="px-3 py-3 font-semibold">Characters</th>
                      <th className="px-3 py-3 font-semibold">Created</th>
                      <th className="px-3 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDocuments.map(document => (
                      <tr key={document.id} className="border-b border-zinc-100">
                        <td className="px-3 py-3 font-medium text-zinc-800">{document.title}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">
                            {document.source_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-zinc-600">{document.char_count.toLocaleString()}</td>
                        <td className="px-3 py-3 text-zinc-600">
                          {new Date(document.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(document.id, document.title)}
                            disabled={loading}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            aria-label={`Delete ${document.title}`}
                            title="Delete source"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedDocuments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                          No documents found for this department.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="grid min-w-0 gap-4 xl:col-span-2 xl:grid-cols-2">
            <div className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter size={16} aria-hidden="true" className="text-ocean" />
                <h3 className="text-sm font-semibold">Category Health</h3>
              </div>
              <div className="mt-4 space-y-3">
                {SUPPORT_CATEGORIES.map(item => {
                  const count = groupedCount[item] ?? 0;
                  const width = Math.min(100, count * 20);
                  return (
                    <div key={item}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-700">{item}</span>
                        <span className="text-zinc-500">{count}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full ${item === category ? 'bg-ocean' : 'bg-zinc-300'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold">Publishing Checklist</h3>
              <div className="mt-4 space-y-3 text-sm">
                {['Source verified', 'Category selected', 'Title added', 'Chunks generated', 'Ready for RAG'].map(
                  (item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2
                        size={17}
                        aria-hidden="true"
                        className={index < 2 || title ? 'text-emerald-600' : 'text-zinc-300'}
                      />
                      <span>{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold">Customer Department View</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Admin controls which departments customers can access. Enable one for a single-department chat.
              </p>
              <div className="mt-4 space-y-2">
                {SUPPORT_CATEGORIES.map(item => (
                  <label key={item} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm">
                    <span>{item}</span>
                    <input
                      type="checkbox"
                      checked={enabledDepartments.includes(item)}
                      onChange={() => toggleDepartment(item)}
                      className="h-4 w-4 accent-[#0f6b6e]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'company' && (
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Company Workspace Settings</h2>
            <p className="mt-1 text-sm text-zinc-500">Brand and operational settings for a reusable company portal.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Company name', 'Acme Global Services'],
                ['Support email', 'support@company.com'],
                ['Default language', 'English'],
                ['Business timezone', 'Asia/Kolkata'],
                ['Portal domain', 'support.company.com'],
                ['Brand color', '#0f6b6e'],
              ].map(([label, value]) => (
                <label key={label} className="block text-sm font-medium text-zinc-700">
                  {label}
                  <input
                    defaultValue={value}
                    className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                  />
                </label>
              ))}
            </div>
            <div className="mt-8 rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold">Customer Department Visibility</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Turn on the departments customers can choose. If only one is enabled, customers see only that chat.
              </p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {SUPPORT_CATEGORIES.map(item => (
                  <label key={item} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span>{item}</span>
                    <input
                      type="checkbox"
                      checked={enabledDepartments.includes(item)}
                      onChange={() => toggleDepartment(item)}
                      className="h-4 w-4 accent-[#0f6b6e]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <Globe2 size={22} aria-hidden="true" className="text-ocean" />
              <h3 className="mt-3 text-sm font-semibold">Multi-company Ready</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Use these settings to adapt the portal branding and support defaults for any company.
              </p>
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'analytics' && (
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Knowledge Coverage</h2>
            <div className="mt-5 space-y-4">
              {SUPPORT_CATEGORIES.map(item => {
                const count = groupedCount[item] ?? 0;
                const width = Math.min(100, count * 18);
                return (
                  <div key={item}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item}</span>
                      <span className="text-zinc-500">{count} documents</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-ocean" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <BellRing size={22} aria-hidden="true" className="text-ocean" />
              <h3 className="mt-3 text-sm font-semibold">Recommended Actions</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                <li>Add at least 3 documents per department.</li>
                <li>Review unanswered ticket questions weekly.</li>
                <li>Refresh stale policies every quarter.</li>
              </ul>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <SlidersHorizontal size={22} aria-hidden="true" className="text-ocean" />
              <h3 className="mt-3 text-sm font-semibold">Quality Score</h3>
              <p className="mt-2 text-3xl font-semibold">{documents.length > 0 ? 72 : 18}%</p>
            </div>
          </aside>
        </section>
      )}
    </section>
  );
}
