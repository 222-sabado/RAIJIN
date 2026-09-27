import React, { useState, useEffect } from 'react';
import { User, Manuscript, EngineeringDiscipline, PrinterStatus } from '../types';
import { safeFetchJson } from '../lib/api';
import { ProfileTab } from './ProfileTab';
import { PrinterTelemetryCard } from './PrinterTelemetryCard';
import { PrintModal } from './PrintModal';
import { PdfManuscriptViewer } from './PdfManuscriptViewer';
import { 
  Search, 
  User as UserIcon, 
  Bookmark, 
  History, 
  Printer, 
  Settings, 
  LogOut, 
  Sparkles, 
  FileText, 
  Eye, 
  Tag, 
  Calendar, 
  Send, 
  Bot, 
  Cpu, 
  Check, 
  Sliders, 
  ChevronRight, 
  Zap, 
  Layers
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  printerStatus: PrinterStatus;
  onLogout: () => void;
  onUpdateProfile: (updated: Partial<User>) => Promise<void>;
  onRefillPaper: () => Promise<void>;
  onToggleConnection: () => Promise<void>;
  onConfirmPrint: (manuscriptId: string, bookmarkAlso: boolean) => Promise<void>;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  printerStatus,
  onLogout,
  onUpdateProfile,
  onRefillPaper,
  onToggleConnection,
  onConfirmPrint,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'profile' | 'bookmarks' | 'history' | 'prints' | 'printer' | 'settings'>('search');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<EngineeringDiscipline | 'All'>('All');
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchLatency, setSearchLatency] = useState('0.24');

  // Selected Manuscript for Detail/Reader View
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);

  // User saved states
  const [bookmarks, setBookmarks] = useState<Manuscript[]>([]);
  const [readingHistory, setReadingHistory] = useState<{ manuscript?: Manuscript; timestamp: string }[]>([]);
  const [printLogs, setPrintLogs] = useState<any[]>([]);

  // Print Modal trigger state
  const [printModalTarget, setPrintModalTarget] = useState<Manuscript | null>(null);
  const [printModalIncludeBookmark, setPrintModalIncludeBookmark] = useState(false);

  // RAG AI Query State inside Manuscript Reader
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState('');
  const [ragLoading, setRagLoading] = useState(false);

  // Suggested search tags from Image 1
  const suggestedTags: EngineeringDiscipline[] = [
    'Electrical',
    'Electromechanical',
    'Electronics Communications',
    'Mechanical',
  ];

  // Fetch Manuscripts on search query or tag change
  const fetchManuscripts = async (queryStr = searchQuery, category = selectedDiscipline) => {
    setLoadingSearch(true);
    try {
      const data = await safeFetchJson('/api/manuscripts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, category, sortBy: 'relevance' }),
      });
      if (data && data.manuscripts) {
        setManuscripts(data.manuscripts);
        if (data.latencyMs) setSearchLatency(data.latencyMs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSearch(false);
    }
  };

  useEffect(() => {
    fetchManuscripts(searchQuery, selectedDiscipline);
  }, [selectedDiscipline]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchManuscripts(searchQuery, selectedDiscipline);
  };

  // Load User Data
  const loadUserData = async () => {
    try {
      const [bmData, histData, printData] = await Promise.all([
        safeFetchJson(`/api/user/${user.id}/bookmarks`),
        safeFetchJson(`/api/user/${user.id}/history`),
        safeFetchJson(`/api/user/${user.id}/prints`),
      ]);

      if (bmData && bmData.bookmarks) setBookmarks(bmData.bookmarks);
      if (histData && histData.history) setReadingHistory(histData.history);
      if (printData && printData.prints) setPrintLogs(printData.prints);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user.id]);

  // Open Manuscript Reader
  const handleOpenManuscript = async (ms: Manuscript) => {
    setSelectedManuscript(ms);
    setRagAnswer('');
    setRagQuestion('');

    // Record History
    try {
      await safeFetchJson(`/api/user/${user.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscriptId: ms.id }),
      });
      loadUserData();
    } catch (e) {
      console.error(e);
    }
  };

  // Bookmark Toggle Action
  const handleToggleBookmark = async (manuscriptId: string) => {
    const isBookmarked = bookmarks.some((b) => b.id === manuscriptId);
    try {
      if (isBookmarked) {
        await safeFetchJson(`/api/user/${user.id}/bookmarks/${manuscriptId}`, { method: 'DELETE' });
      } else {
        await safeFetchJson(`/api/user/${user.id}/bookmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manuscriptId }),
        });
      }
      loadUserData();
    } catch (e) {
      console.error(e);
    }
  };

  // RAG Ask Question
  const handleAskRag = async () => {
    if (!ragQuestion.trim() || !selectedManuscript) return;
    setRagLoading(true);
    setRagAnswer('');

    try {
      const data = await safeFetchJson(`/api/manuscripts/${selectedManuscript.id}/rag-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuestion: ragQuestion }),
      });
      if (data && data.answer) {
        setRagAnswer(data.answer);
      } else if (data && data.error) {
        setRagAnswer(`Error: ${data.error}`);
      } else {
        setRagAnswer('Unable to generate answer from RAG engine.');
      }
    } catch (e) {
      setRagAnswer('Failed to query RAG engine.');
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          
          {/* Student Profile Quick Tile */}
          <div 
            onClick={() => { setActiveTab('profile'); setSelectedManuscript(null); }}
            className="p-3 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500/50 cursor-pointer transition-all flex items-center space-x-3 group shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-black text-white group-hover:text-indigo-300 truncate">
                {user.fullName}
              </h4>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                #{user.studentNumber || user.username}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 text-xs font-extrabold uppercase tracking-wider">
            <button
              onClick={() => { setActiveTab('search'); setSelectedManuscript(null); }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeTab === 'search' && !selectedManuscript
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Manuscripts</span>
            </button>

            <button
              onClick={() => { setActiveTab('profile'); setSelectedManuscript(null); }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => { setActiveTab('bookmarks'); setSelectedManuscript(null); }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between transition-all ${
                activeTab === 'bookmarks'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Bookmark className="w-4 h-4" />
                <span>Bookmarks</span>
              </div>
              {bookmarks.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                  {bookmarks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('history'); setSelectedManuscript(null); }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Reading History</span>
            </button>

            <button
              onClick={() => { setActiveTab('prints'); setSelectedManuscript(null); }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeTab === 'prints'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Printed Manuscripts</span>
            </button>

            <button
              onClick={() => { setActiveTab('printer'); setSelectedManuscript(null); }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between transition-all ${
                activeTab === 'printer'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Cpu className="w-4 h-4" />
                <span>Printer Telemetry</span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${printerStatus.isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setSelectedManuscript(null); }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3 transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Kiosk Settings</span>
            </button>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full px-3.5 py-3 bg-slate-950 hover:bg-red-500/10 hover:text-red-400 border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Kiosk</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        
        {/* VIEW 1: MANUSCRIPT PDF VIEWER */}
        {selectedManuscript ? (
          <PdfManuscriptViewer
            manuscript={selectedManuscript}
            onClose={() => setSelectedManuscript(null)}
            onPrint={(ms) => {
              setPrintModalTarget(ms);
              setPrintModalIncludeBookmark(false);
            }}
            isBookmarked={bookmarks.some((b) => b.id === selectedManuscript.id)}
            onToggleBookmark={handleToggleBookmark}
          />
        ) : activeTab === 'search' ? (
          
          /* VIEW 2: SEARCH DASHBOARD (BOLD TYPOGRAPHY STYLE) */
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* TOP SEARCH BAR & SUGGESTIONS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-400 tracking-tighter uppercase italic block">
                    GRID-POWERED HPC ACCESS
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase italic leading-none">
                    RESEARCH LITERATURE KIOSK
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSearchSubmit} className="relative pt-2">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5 text-indigo-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchManuscripts(e.target.value, selectedDiscipline);
                  }}
                  placeholder="Search by title, author, or keywords (e.g. Wave Propagation)"
                  className="block w-full pl-12 pr-32 py-4 bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl text-slate-100 font-bold text-sm sm:text-base placeholder-slate-500 focus:outline-none shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-3 bottom-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  Search
                </button>
              </form>

              {/* SUGGESTED TAGS FROM IMAGE 1 */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-black uppercase text-slate-400 italic mr-1">
                  SUGGESTED:
                </span>
                
                <button
                  type="button"
                  onClick={() => setSelectedDiscipline('All')}
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                    selectedDiscipline === 'All'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  All Disciplines
                </button>

                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const newTag = selectedDiscipline === tag ? 'All' : tag;
                      setSelectedDiscipline(newTag);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                      selectedDiscipline === tag
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

            </div>

            {/* HPC Literature Results Metadata Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-bold">
              <div>
                Showing <strong className="text-white font-black">{manuscripts.length}</strong> manuscripts
                {selectedDiscipline !== 'All' && <span> in <strong className="text-indigo-400 font-black">{selectedDiscipline}</strong></span>}
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>HPC Vector Retrieval Latency: <strong className="text-white font-mono">{searchLatency} ms</strong></span>
              </div>
            </div>

            {/* Manuscripts List */}
            {loadingSearch ? (
              <div className="text-center py-12 text-slate-500 text-sm font-bold">
                Searching HPC literature index...
              </div>
            ) : manuscripts.length === 0 ? (
              <div className="text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="mx-auto w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-white uppercase italic">No Manuscripts Available</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {searchQuery
                      ? `No manuscripts matched your search query "${searchQuery}".`
                      : 'The literature index has no published manuscripts currently. Research literature is uploaded and managed by kiosk faculty administrators.'}
                  </p>
                </div>
                {searchQuery && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedDiscipline('All'); fetchManuscripts('', 'All'); }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                    >
                      Clear Search Filter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {manuscripts.map((ms) => {
                  const isBookmarked = bookmarks.some((b) => b.id === ms.id);
                  return (
                    <div
                      key={ms.id}
                      className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all shadow-xl group space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 text-[10px] font-black rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                              {ms.category}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" /> {ms.publicationDate}
                            </span>
                          </div>

                          <h3 
                            onClick={() => handleOpenManuscript(ms)}
                            className="text-lg font-black text-white group-hover:text-indigo-300 cursor-pointer transition-colors leading-tight uppercase italic"
                          >
                            {ms.title}
                          </h3>

                          <p className="text-xs text-slate-400 font-medium">
                            Authors: <strong className="text-slate-200 font-bold">{ms.authors.join(', ')}</strong>
                          </p>
                        </div>

                        {/* Quick Bookmark Toggle Icon */}
                        <button
                          onClick={() => handleToggleBookmark(ms.id)}
                          className={`p-2.5 rounded-xl transition-colors ${
                            isBookmarked
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Bookmark Manuscript"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed italic">
                        {ms.abstract}
                      </p>

                      {/* Keywords Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {ms.keywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-400 text-[10px] font-mono border border-slate-800"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center space-x-4 text-slate-400 text-[11px] font-medium">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {ms.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Printer className="w-3.5 h-3.5 text-indigo-400" /> {ms.printsCount} prints
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenManuscript(ms)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center space-x-1"
                          >
                            <span>Read Full Text</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ) : activeTab === 'profile' ? (
          
          /* VIEW 3: PROFILE TAB */
          <ProfileTab
            user={user}
            recentManuscripts={readingHistory}
            onUpdateProfile={onUpdateProfile}
            onSelectManuscript={handleOpenManuscript}
          />
        ) : activeTab === 'bookmarks' ? (
          
          /* VIEW 4: BOOKMARKS */
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-indigo-400" /> Bookmarked Research Manuscripts
            </h2>

            {bookmarks.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-sm font-bold">
                No bookmarked manuscripts yet. Click "Bookmark" on any manuscript to save it here.
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks.map((ms) => (
                  <div
                    key={ms.id}
                    className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
                        {ms.category}
                      </span>
                      <h3
                        onClick={() => handleOpenManuscript(ms)}
                        className="text-base font-black text-white hover:text-indigo-300 cursor-pointer transition-colors mt-1.5 uppercase italic"
                      >
                        {ms.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        Authors: {ms.authors.join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleOpenManuscript(ms)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md"
                      >
                        Read Text
                      </button>
                      <button
                        onClick={() => handleToggleBookmark(ms.id)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-bold rounded-xl"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'history' ? (
          
          /* VIEW 5: HISTORY */
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" /> Reading History
            </h2>

            {readingHistory.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-sm font-bold">
                Your history is empty. Opened manuscripts will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {readingHistory.map((item, idx) => {
                  const ms = item.manuscript;
                  if (!ms) return null;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenManuscript(ms)}
                      className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-md"
                    >
                      <div>
                        <h4 className="text-sm font-black text-white uppercase italic">{ms.title}</h4>
                        <p className="text-xs text-slate-400">{ms.authors.join(', ')} • {ms.category}</p>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'prints' ? (
          
          /* VIEW 6: PRINT LOGS */
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" /> Printed Manuscripts Log
            </h2>

            {printLogs.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-sm font-bold">
                You haven't printed any manuscripts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {printLogs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md"
                  >
                    <div>
                      <h4 className="text-sm font-black text-white uppercase italic">{job.manuscriptTitle}</h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Job ID: #{job.id} • {job.pages} Pages Printed
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black rounded-full uppercase tracking-wider">
                        {job.status}
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        {new Date(job.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'printer' ? (
          
          /* VIEW 7: PRINTER TELEMETRY CARD */
          <div className="max-w-5xl mx-auto">
            <PrinterTelemetryCard
              status={printerStatus}
              onRefillPaper={onRefillPaper}
              onToggleConnection={onToggleConnection}
            />
          </div>
        ) : (
          
          /* VIEW 8: KIOSK SETTINGS */
          <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" /> Kiosk Settings
            </h2>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Automatic Logout Timeout</h4>
                  <p className="text-xs text-slate-400 font-medium">Automatically ends kiosk session after 10 minutes of inactivity.</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-200 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
                  10 Minutes
                </span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* PRINT CONFIRMATION MODAL */}
      {printModalTarget && (
        <PrintModal
          manuscript={printModalTarget}
          printerStatus={printerStatus}
          includeBookmark={printModalIncludeBookmark}
          onClose={() => setPrintModalTarget(null)}
          onConfirmPrint={async (msId, bkmk) => {
            await onConfirmPrint(msId, bkmk);
            loadUserData();
          }}
        />
      )}

    </div>
  );
};
