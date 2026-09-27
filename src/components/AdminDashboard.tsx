import React, { useState, useEffect } from 'react';
import { User, Manuscript, SystemLog, UsageAnalytics, EngineeringDiscipline, PrinterStatus } from '../types';
import { safeFetchJson } from '../lib/api';
import { PrinterTelemetryCard } from './PrinterTelemetryCard';
import { ManuscriptUploadSection } from './ManuscriptUploadSection';
import { PdfManuscriptViewer } from './PdfManuscriptViewer';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  BarChart3, 
  Terminal, 
  Edit3, 
  Trash2, 
  Plus, 
  Sparkles, 
  Search, 
  Save, 
  X, 
  CheckCircle2, 
  Cpu, 
  Layers, 
  Database, 
  Lock, 
  Users, 
  Globe, 
  Share2, 
  FileCode, 
  Filter,
  Eye
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  printerStatus: PrinterStatus;
  onLogout: () => void;
  onRefillPaper: () => Promise<void>;
  onToggleConnection: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  printerStatus,
  onLogout,
  onRefillPaper,
  onToggleConnection,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'manuscripts' | 'upload' | 'analytics' | 'logs' | 'printer' | 'djangoAdmin'>('manuscripts');

  // Manuscripts State
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [editingManuscript, setEditingManuscript] = useState<Manuscript | null>(null);
  const [viewingManuscript, setViewingManuscript] = useState<Manuscript | null>(null);
  const [djangoSection, setDjangoSection] = useState<'pdfJournals' | 'socialAccounts'>('pdfJournals');
  const [searchAdminQuery, setSearchAdminQuery] = useState('');

  // Upload Form State
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<EngineeringDiscipline>('Electrical');
  const [uploadRawText, setUploadRawText] = useState('');
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideAuthors, setOverrideAuthors] = useState('');
  const [overrideAbstract, setOverrideAbstract] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  // Analytics & System Logs State
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);

  // Fetch Manuscripts and System Info
  const loadAdminData = async () => {
    try {
      const [msData, logsData, analyticsData] = await Promise.all([
        safeFetchJson('/api/manuscripts/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '', category: 'All' }),
        }),
        safeFetchJson('/api/admin/logs'),
        safeFetchJson('/api/admin/analytics'),
      ]);

      if (msData && msData.manuscripts) setManuscripts(msData.manuscripts);
      if (logsData && logsData.logs) setSystemLogs(logsData.logs);
      if (analyticsData && analyticsData.analytics) setAnalytics(analyticsData.analytics);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Handle Manuscript Edit Save
  const handleSaveManuscriptEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManuscript) return;

    try {
      const data = await safeFetchJson(`/api/manuscripts/${editingManuscript.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingManuscript),
      });
      if (data) {
        setEditingManuscript(null);
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Manuscript Delete
  const handleDeleteManuscript = async (id: string) => {
    if (!confirm('Are you sure you want to delete this manuscript from the kiosk database?')) return;
    try {
      await safeFetchJson(`/api/manuscripts/${id}`, { method: 'DELETE' });
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle PDF Upload & Gemini Auto-Extraction
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadSuccessMsg('');

    try {
      const res = await fetch('/api/manuscripts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadFileName || 'uploaded_research_manuscript.pdf',
          category: uploadCategory,
          rawText: uploadRawText,
          overrideTitle,
          overrideAuthors,
          overrideAbstract,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadSuccessMsg(`Manuscript "${data.manuscript.title}" indexed successfully!`);
        setUploadFileName('');
        setUploadRawText('');
        setOverrideTitle('');
        setOverrideAuthors('');
        setOverrideAbstract('');
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* ADMIN SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          
          <div className="p-3.5 bg-indigo-950/60 border border-indigo-800/60 rounded-2xl flex items-center space-x-3 shadow-md">
            <div className="p-2 bg-indigo-600 rounded-xl text-white font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase italic">R.A.I.J.I.N. Admin</h3>
              <p className="text-[10px] text-indigo-300 font-mono font-bold">admin_group2 • Faculty</p>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs font-extrabold uppercase tracking-wider">
            <button
              onClick={() => setActiveAdminTab('manuscripts')}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeAdminTab === 'manuscripts'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Manage Manuscripts</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('upload')}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeAdminTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Manuscript</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('analytics')}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeAdminTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Usage Analytics</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('logs')}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeAdminTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>System Logs</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('printer')}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeAdminTab === 'printer'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Printer Maintenance</span>
            </button>

            {/* TAB FOR DJANGO ADMIN PANEL RECREATION (IMAGE 3) */}
            <button
              onClick={() => setActiveAdminTab('djangoAdmin')}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeAdminTab === 'djangoAdmin'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-black'
                  : 'text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 hover:bg-emerald-900/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Django Administration</span>
            </button>
          </nav>

        </div>

        <button
          onClick={onLogout}
          className="w-full py-3 bg-slate-950 hover:bg-red-500/10 hover:text-red-400 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
        >
          Exit Admin Dashboard
        </button>
      </aside>

      {/* MAIN ADMIN AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        
        {/* SECTION 1: MANAGE MANUSCRIPTS */}
        {activeAdminTab === 'manuscripts' ? (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic">Manuscript Records Management</h2>
                <p className="text-xs text-slate-400 font-medium">View, edit document metadata, or purge records from the HPC literature index.</p>
              </div>

              <button
                onClick={() => setActiveAdminTab('upload')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New PDF Manuscript</span>
              </button>
            </div>

            {/* Filter Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchAdminQuery}
                onChange={(e) => setSearchAdminQuery(e.target.value)}
                placeholder="Filter manuscripts by title or author..."
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Table */}
            {manuscripts.length === 0 ? (
              <div className="text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
                <div className="mx-auto w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-white uppercase italic">No Manuscripts in Repository</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    The literature dataset has been cleared. Upload new PDF manuscripts to index them into the R.A.I.J.I.N. repository.
                  </p>
                </div>
                <button
                  onClick={() => setActiveAdminTab('upload')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF Manuscript</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="p-4">Title & Details</th>
                        <th className="p-4">Authors</th>
                        <th className="p-4">Discipline</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Views/Prints</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {manuscripts
                        .filter(
                          (m) =>
                            m.title.toLowerCase().includes(searchAdminQuery.toLowerCase()) ||
                            m.authors.join(' ').toLowerCase().includes(searchAdminQuery.toLowerCase())
                        )
                        .map((ms) => (
                          <tr key={ms.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-4 max-w-xs">
                              <button
                                onClick={() => setViewingManuscript(ms)}
                                className="font-bold text-white hover:text-indigo-300 transition-colors text-left truncate block max-w-xs"
                              >
                                {ms.title}
                              </button>
                              <div className="text-[10px] text-slate-500 truncate">{ms.id} • {ms.fileSize || '2.4 MB'}</div>
                            </td>
                            <td className="p-4 text-slate-300">{ms.authors.join(', ')}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider">
                                {ms.category}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">{ms.publicationDate}</td>
                            <td className="p-4 text-slate-300 font-mono text-[11px] font-bold">
                              {ms.views} v / {ms.printsCount} p
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => setViewingManuscript(ms)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center space-x-1 shadow-md"
                                  title="View Full Manuscript PDF"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Manuscript</span>
                                </button>
                                <button
                                  onClick={() => setEditingManuscript(ms)}
                                  className="p-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-xl transition-colors"
                                  title="Edit Document Details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteManuscript(ms.id)}
                                  className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl transition-colors"
                                  title="Delete Manuscript"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit Manuscript Modal */}
            {editingManuscript && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-black text-white text-base uppercase italic">Edit Manuscript Details</h3>
                    <button onClick={() => setEditingManuscript(null)} className="text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveManuscriptEdit} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold uppercase text-slate-300 mb-1">Title</label>
                      <input
                        type="text"
                        value={editingManuscript.title}
                        onChange={(e) => setEditingManuscript({ ...editingManuscript, title: e.target.value })}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold uppercase text-slate-300 mb-1">Authors (comma separated)</label>
                        <input
                          type="text"
                          value={editingManuscript.authors.join(', ')}
                          onChange={(e) =>
                            setEditingManuscript({ ...editingManuscript, authors: e.target.value.split(',').map((s) => s.trim()) })
                          }
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold uppercase text-slate-300 mb-1">Engineering Discipline</label>
                        <select
                          value={editingManuscript.category}
                          onChange={(e) =>
                            setEditingManuscript({ ...editingManuscript, category: e.target.value as EngineeringDiscipline })
                          }
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Electrical">Electrical</option>
                          <option value="Electromechanical">Electromechanical</option>
                          <option value="Mechanical">Mechanical</option>
                          <option value="Electronics Communications">Electronics Communications</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-slate-300 mb-1">Abstract</label>
                      <textarea
                        rows={3}
                        value={editingManuscript.abstract}
                        onChange={(e) => setEditingManuscript({ ...editingManuscript, abstract: e.target.value })}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 resize-none font-normal focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingManuscript(null)}
                        className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold uppercase tracking-wider rounded-xl"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider rounded-xl flex items-center space-x-1 shadow-lg shadow-indigo-600/30">
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        ) : activeAdminTab === 'upload' ? (
          
          /* SECTION 2: UPLOAD MANUSCRIPT TAB (PDF Auto-Extract + Gemini) */
          <ManuscriptUploadSection
            userRole="admin"
            onUploadSuccess={() => loadAdminData()}
          />
        ) : activeAdminTab === 'analytics' ? (
          
          /* SECTION 3: USAGE ANALYTICS */
          <div className="space-y-6 max-w-5xl mx-auto">
            <div>
              <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" /> Kiosk & HPC System Analytics
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">Real-time telemetry on literature queries, print frequencies, and HPC cluster latency.</p>
            </div>

            {analytics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Indexed Manuscripts</div>
                  <div className="text-2xl font-black text-white mt-1 italic">{analytics.totalManuscripts}</div>
                  <div className="text-[10px] font-mono text-indigo-400 mt-1">across 4 engineering domains</div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Searches Today</div>
                  <div className="text-2xl font-black text-white mt-1 italic">{analytics.totalSearchesToday}</div>
                  <div className="text-[10px] font-mono text-emerald-400 mt-1">Avg Latency: {analytics.avgHpcLatencyMs} ms</div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Printed Documents</div>
                  <div className="text-2xl font-black text-white mt-1 italic">{analytics.totalPrintsToday}</div>
                  <div className="text-[10px] font-mono text-purple-400 mt-1">Kiosk Station #1</div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">HPC GPU Grid Nodes</div>
                  <div className="text-2xl font-black text-white mt-1 italic">
                    {analytics.hpcNodeStatus.activeNodes}/{analytics.hpcNodeStatus.totalNodes}
                  </div>
                  <div className="text-[10px] font-mono text-indigo-400 mt-1">FAISS Index: 15.2k vectors</div>
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase italic">Literature Queries by Engineering Discipline</h3>
              <div className="space-y-3">
                {Object.entries(analytics?.searchesByCategory || {}).map(([cat, countVal]) => {
                  const numCount = Number(countVal) || 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300 font-bold">
                        <span>{cat}</span>
                        <span className="font-mono text-indigo-300">{numCount} queries</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, (numCount / 50) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeAdminTab === 'logs' ? (
          
          /* SECTION 4: SYSTEM LOGS */
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" /> Kiosk & HPC Cluster Audit Logs
            </h2>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 font-mono text-xs space-y-2 max-h-[600px] overflow-y-auto shadow-2xl">
              {systemLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{log.timestamp}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        log.level === 'HPC_EVENT'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <div className="text-slate-200 font-bold">[{log.source}] {log.message}</div>
                  {log.details && <div className="text-[11px] text-slate-400">{log.details}</div>}
                </div>
              ))}
            </div>
          </div>
        ) : activeAdminTab === 'printer' ? (
          
          /* SECTION 5: PRINTER MAINTENANCE */
          <div className="max-w-5xl mx-auto">
            <PrinterTelemetryCard
              status={printerStatus}
              onRefillPaper={onRefillPaper}
              onToggleConnection={onToggleConnection}
            />
          </div>
        ) : (
          
          /* SECTION 6: AUTHENTIC RECREATION OF DJANGO ADMINISTRATION (IMAGE 3) */
          <div className="bg-slate-100 text-slate-800 min-h-[700px] rounded-xl overflow-hidden shadow-2xl font-sans border border-slate-300">
            
            {/* Django Admin Header */}
            <div className="bg-[#417690] text-white p-3 px-6 flex items-center justify-between">
              <h1 className="text-lg font-normal tracking-wide">Django administration</h1>
              <div className="text-xs text-slate-200">
                WELCOME, <strong className="text-white">ADMIN_GROUP2</strong>. / <span className="underline cursor-pointer">VIEW SITE</span> / <span className="underline cursor-pointer">CHANGE PASSWORD</span>
              </div>
            </div>

            {/* Breadcrumb Bar (Photo 3) */}
            <div className="bg-[#264b5d] text-slate-200 text-xs p-2 px-6 border-b border-slate-400 flex items-center space-x-1">
              <span>Home</span>
              <span>›</span>
              <span>{djangoSection === 'pdfJournals' ? 'Research App' : 'Social Accounts'}</span>
              <span>›</span>
              <span className="text-white font-semibold">
                {djangoSection === 'pdfJournals' ? 'Pdf journals' : 'Social accounts'}
              </span>
            </div>

            {/* Django Admin Split Body */}
            <div className="flex flex-col md:flex-row">
              
              {/* Django Admin Left Sidebar (Image 3) */}
              <div className="w-full md:w-64 bg-[#f8f9fa] border-r border-slate-300 p-3 space-y-4 text-xs">
                
                {/* Search Filter Box */}
                <input
                  type="text"
                  placeholder="Start typing to filter..."
                  className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                />

                {/* Group 1: ACCOUNTS */}
                <div className="space-y-1">
                  <div className="bg-[#79aec8] text-white font-bold p-1.5 uppercase text-[10px] tracking-wider">
                    ACCOUNTS
                  </div>
                  <div className="flex items-center justify-between p-1 pl-2 hover:bg-slate-200 cursor-pointer text-slate-700">
                    <span className="text-[#447e9b]">Email addresses</span>
                    <span className="text-[10px] text-[#447e9b] hover:underline">+ Add</span>
                  </div>
                </div>

                {/* Group 2: AUTHENTICATION AND AUTHORIZATION */}
                <div className="space-y-1">
                  <div className="bg-[#79aec8] text-white font-bold p-1.5 uppercase text-[10px] tracking-wider">
                    AUTHENTICATION AND AUTHORIZATION
                  </div>
                  <div className="flex items-center justify-between p-1 pl-2 hover:bg-slate-200 cursor-pointer text-slate-700">
                    <span className="text-[#447e9b]">Groups</span>
                    <span className="text-[10px] text-[#447e9b] hover:underline">+ Add</span>
                  </div>
                </div>

                {/* Group 3: MYAPP / RESEARCH_APP */}
                <div className="space-y-1">
                  <div className="bg-[#79aec8] text-white font-bold p-1.5 uppercase text-[10px] tracking-wider">
                    MYAPP / RESEARCH_APP
                  </div>
                  <div 
                    onClick={() => setDjangoSection('pdfJournals')}
                    className={`flex items-center justify-between p-1 pl-2 cursor-pointer ${
                      djangoSection === 'pdfJournals' ? 'bg-[#ffffcc] text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-[#447e9b]">Pdf journals</span>
                    <span 
                      onClick={(e) => { e.stopPropagation(); setActiveAdminTab('upload'); }}
                      className="text-[10px] text-[#447e9b] hover:underline"
                    >
                      + Add
                    </span>
                  </div>
                </div>

                {/* Group 4: SITES */}
                <div className="space-y-1">
                  <div className="bg-[#79aec8] text-white font-bold p-1.5 uppercase text-[10px] tracking-wider">
                    SITES
                  </div>
                  <div className="flex items-center justify-between p-1 pl-2 hover:bg-slate-200 cursor-pointer text-slate-700">
                    <span className="text-[#447e9b]">Sites</span>
                    <span className="text-[10px] text-[#447e9b] hover:underline">+ Add</span>
                  </div>
                </div>

                {/* Group 5: SOCIAL ACCOUNTS (Highlighted) */}
                <div className="space-y-1">
                  <div className="bg-[#79aec8] text-white font-bold p-1.5 uppercase text-[10px] tracking-wider">
                    SOCIAL ACCOUNTS
                  </div>
                  <div 
                    onClick={() => setDjangoSection('socialAccounts')}
                    className={`flex items-center justify-between p-1 pl-2 cursor-pointer ${
                      djangoSection === 'socialAccounts' ? 'bg-[#ffffcc] text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-slate-900">Social accounts</span>
                    <span className="text-[10px] text-[#447e9b] hover:underline">+ Add</span>
                  </div>
                  <div className="flex items-center justify-between p-1 pl-2 hover:bg-slate-200 cursor-pointer text-slate-700">
                    <span className="text-[#447e9b]">Social application tokens</span>
                    <span className="text-[10px] text-[#447e9b] hover:underline">+ Add</span>
                  </div>
                  <div className="flex items-center justify-between p-1 pl-2 hover:bg-slate-200 cursor-pointer text-slate-700">
                    <span className="text-[#447e9b]">Social applications</span>
                    <span className="text-[10px] text-[#447e9b] hover:underline">+ Add</span>
                  </div>
                </div>

              </div>

              {/* Django Admin Main Content Table */}
              {djangoSection === 'pdfJournals' ? (
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-normal text-slate-700">Select pdf journal to view / change</h2>
                    <button 
                      onClick={() => setActiveAdminTab('upload')}
                      className="px-3 py-1 bg-[#417690] hover:bg-[#2c5366] text-white text-xs font-semibold rounded shadow-sm"
                    >
                      + Add pdf journal
                    </button>
                  </div>

                  {/* Action Bar */}
                  <div className="p-2 bg-[#f8f9fa] border border-slate-300 text-xs flex items-center space-x-2">
                    <span className="text-slate-600 font-semibold">Action:</span>
                    <select className="border border-slate-300 p-1 text-xs bg-white rounded">
                      <option>---------</option>
                      <option>Delete selected pdf journals</option>
                    </select>
                    <button className="px-2 py-1 bg-white border border-slate-300 text-slate-700 text-xs">
                      Go
                    </button>
                    <span className="text-slate-500 text-[11px] ml-auto">{manuscripts.length} pdf journals indexed</span>
                  </div>

                  {manuscripts.length === 0 ? (
                    <div className="p-12 text-center bg-white border border-slate-300 rounded space-y-3">
                      <p className="text-slate-600 text-sm font-medium">No pdf journals found in database.</p>
                      <button
                        onClick={() => setActiveAdminTab('upload')}
                        className="px-4 py-2 bg-[#417690] hover:bg-[#2c5366] text-white text-xs font-bold rounded"
                      >
                        + Add and Upload PDF Manuscript
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-300">
                      <table className="w-full border-collapse text-xs text-left">
                        <thead className="bg-[#79aec8] text-white">
                          <tr>
                            <th className="p-2 border-r border-slate-300 w-8 text-center"><input type="checkbox" /></th>
                            <th className="p-2 border-r border-slate-300">MANUSCRIPT TITLE</th>
                            <th className="p-2 border-r border-slate-300">DISCIPLINE</th>
                            <th className="p-2 border-r border-slate-300">AUTHORS</th>
                            <th className="p-2 border-r border-slate-300">PUBLICATION DATE</th>
                            <th className="p-2 text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {manuscripts.map((ms, idx) => (
                            <tr key={ms.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}>
                              <td className="p-2 border-r border-slate-300 text-center"><input type="checkbox" /></td>
                              <td className="p-2 border-r border-slate-300 font-medium">
                                <button
                                  onClick={() => setViewingManuscript(ms)}
                                  className="text-[#447e9b] hover:underline font-bold text-left block"
                                >
                                  {ms.title}
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono">{ms.id}</span>
                              </td>
                              <td className="p-2 border-r border-slate-300 font-medium">{ms.category}</td>
                              <td className="p-2 border-r border-slate-300">{ms.authors.join(', ')}</td>
                              <td className="p-2 border-r border-slate-300 font-mono text-[11px]">{ms.publicationDate}</td>
                              <td className="p-2 text-right">
                                <button
                                  onClick={() => setViewingManuscript(ms)}
                                  className="px-3 py-1 bg-[#417690] hover:bg-[#2c5366] text-white text-[11px] font-bold rounded shadow-sm inline-flex items-center space-x-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>VIEW MANUSCRIPT</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 pt-2">
                    {manuscripts.length} pdf journals
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-normal text-slate-700">Select social account to change</h2>
                    <button className="px-3 py-1 bg-[#417690] text-white text-xs font-semibold rounded">
                      + Add social account
                    </button>
                  </div>

                  {/* Action Bar */}
                  <div className="p-2 bg-[#f8f9fa] border border-slate-300 text-xs flex items-center space-x-2">
                    <span className="text-slate-600 font-semibold">Action:</span>
                    <select className="border border-slate-300 p-1 text-xs bg-white rounded">
                      <option>---------</option>
                      <option>Delete selected social accounts</option>
                    </select>
                    <button className="px-2 py-1 bg-white border border-slate-300 text-slate-700 text-xs">
                      Go
                    </button>
                    <span className="text-slate-500 text-[11px] ml-auto">3 selected</span>
                  </div>

                  {/* Record List Table */}
                  <table className="w-full border-collapse border border-slate-300 text-xs text-left">
                    <thead className="bg-[#79aec8] text-white">
                      <tr>
                        <th className="p-2 border border-slate-300 w-8">
                          <input type="checkbox" />
                        </th>
                        <th className="p-2 border border-slate-300">USER</th>
                        <th className="p-2 border border-slate-300">PROVIDER</th>
                        <th className="p-2 border border-slate-300">UID</th>
                        <th className="p-2 border border-slate-300">LAST LOGIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-white">
                        <td className="p-2"><input type="checkbox" /></td>
                        <td className="p-2 text-[#447e9b] font-medium">1234 (Peter Parker)</td>
                        <td className="p-2">Student Auth Portal</td>
                        <td className="p-2 font-mono">std-1234-uuid</td>
                        <td className="p-2 text-slate-500">Aug. 9, 2026, 04:30 a.m.</td>
                      </tr>
                      <tr className="bg-[#f8f9fa]">
                        <td className="p-2"><input type="checkbox" /></td>
                        <td className="p-2 text-[#447e9b] font-medium">2024101 (Maria Dela Cruz)</td>
                        <td className="p-2">Student Auth Portal</td>
                        <td className="p-2 font-mono">std-2024101-uuid</td>
                        <td className="p-2 text-slate-500">Aug. 8, 2026, 02:15 p.m.</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="p-2"><input type="checkbox" /></td>
                        <td className="p-2 text-[#447e9b] font-medium">admin_group2 (Faculty Admin)</td>
                        <td className="p-2">Faculty Group 2</td>
                        <td className="p-2 font-mono">adm-group2-uuid</td>
                        <td className="p-2 text-slate-500">Aug. 9, 2026, 04:37 a.m.</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="text-xs text-slate-500 pt-2">
                    3 social accounts
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* FULL MANUSCRIPT VIEWER MODAL FOR ADMIN */}
        {viewingManuscript && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-5xl my-auto">
              <PdfManuscriptViewer
                manuscript={viewingManuscript}
                onClose={() => setViewingManuscript(null)}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
