import React, { useState, useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import { Manuscript } from '../types';
import { fileKind } from '../lib/fileKind';
import {
  FileText,
  Printer,
  Download,
  Bookmark,
  Share2,
  Sparkles,
  X,
  Quote,
  Check,
  Cpu,
  Send,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface PdfManuscriptViewerProps {
  manuscript: Manuscript;
  onClose: () => void;
  onPrint?: (manuscript: Manuscript) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (manuscriptId: string) => void;
  onDelete?: (manuscript: Manuscript) => void;
}

export const PdfManuscriptViewer: React.FC<PdfManuscriptViewerProps> = ({
  manuscript,
  onClose,
  onPrint,
  isBookmarked = false,
  onToggleBookmark,
  onDelete,
}) => {
  const kind = fileKind(manuscript.fileName);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(kind === 'text' ? 'ready' : 'loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const [txtContent, setTxtContent] = useState('');
  const fileBlobRef = useRef<Blob | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);
  const [showRagSidebar, setShowRagSidebar] = useState<boolean>(false);
  const [ragQuestion, setRagQuestion] = useState<string>('');
  const [ragLoading, setRagLoading] = useState<boolean>(false);
  const [ragChat, setRagChat] = useState<{ q: string; a: string; time: string }[]>([]);
  const [copiedCitation, setCopiedCitation] = useState<boolean>(false);
  const [citationFormat, setCitationFormat] = useState<'IEEE' | 'APA' | 'BibTeX'>('IEEE');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load the original file from the server
  useEffect(() => {
    if (kind === 'text') {
      setStatus('ready');
      return;
    }
    let cancelled = false;
    let url = '';
    setStatus('loading');
    setBlobUrl('');
    fileBlobRef.current = null;
    (async () => {
      try {
        const res = await fetch(`/api/manuscripts/${manuscript.id}/file`);
        if (!res.ok) throw new Error(res.status === 404 ? 'The original file is not available.' : `Server error ${res.status}.`);
        const blob = await res.blob();
        if (cancelled) return;
        fileBlobRef.current = blob;
        if (kind === 'pdf') {
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
        } else if (kind === 'txt') {
          setTxtContent(await blob.text());
        } else if (docxRef.current) {
          docxRef.current.innerHTML = '';
          const host = docxRef.current;
          await renderAsync(blob, host, undefined, { className: 'docx', inWrapper: true, breakPages: true });
          const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
          const page = host.querySelector<HTMLElement>('section.docx');
          if (wrapper && page) {
            // shrink wide pages to fit narrow screens
            const fit = (host.clientWidth - 24) / page.offsetWidth;
            if (fit < 1) wrapper.style.zoom = String(fit);
          }
        }
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'The file could not be opened.');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [manuscript.id, kind]);

  // Handle RAG Ask Gemini
  const handleAskRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuestion.trim() || ragLoading) return;

    const q = ragQuestion.trim();
    setRagLoading(true);
    setRagQuestion('');

    try {
      const res = await fetch(`/api/manuscripts/${manuscript.id}/rag-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuestion: q }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setRagChat(prev => [
          ...prev,
          { q, a: data.answer, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      } else {
        setRagChat(prev => [
          ...prev,
          { q, a: data.error || 'Failed to retrieve analysis from RAG engine.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }
    } catch (err) {
      setRagChat(prev => [
        ...prev,
        { q, a: 'Connection error communicating with R.A.I.J.I.N. HPC Node.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } finally {
      setRagLoading(false);
    }
  };

  // Generate citation text
  const getCitationText = () => {
    const authorsStr = manuscript.authors.join(', ');
    const year = manuscript.publicationDate ? manuscript.publicationDate.split('-')[0] : '2025';
    if (citationFormat === 'IEEE') {
      return `${authorsStr}, "${manuscript.title}," R.A.I.J.I.N. Engine Trans. on ${manuscript.category} Eng., vol. 14, pp. 101-114, ${year}.`;
    } else if (citationFormat === 'APA') {
      return `${authorsStr} (${year}). ${manuscript.title}. R.A.I.J.I.N. Scholarly Repository for ${manuscript.category} Engineering, 14(2), 101-114.`;
    } else {
      return `@article{raijin_${manuscript.id},\n  title={${manuscript.title}},\n  author={${authorsStr}},\n  journal={R.A.I.J.I.N. Engine Journal of Engineering},\n  year={${year}},\n  publisher={Retrieval-Augmented Intelligence for Joint Information Networks}\n}`;
    }
  };

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(getCitationText());
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2500);
  };
  // Download the original file under its original name
  const downloadLabel = kind === 'text' ? 'TXT' : kind.toUpperCase();
  const handleDownload = () => {
    const blob = fileBlobRef.current ?? new Blob([manuscript.fullText], { type: 'text/plain' });
    const name = manuscript.fileName || `${manuscript.title.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100 overflow-hidden animate-fade-in">

      {/* TOP TOOLBAR */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0 shadow-lg select-none">

        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl shrink-0 hidden sm:block">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 hidden sm:inline bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded">
                {manuscript.category}
              </span>
              {manuscript.fileName && (
                <span className="text-[11px] text-slate-400 font-mono truncate hidden md:inline">
                  {manuscript.fileName}
                </span>
              )}
            </div>
            <h1 className="font-bold text-sm text-white truncate" title={manuscript.title}>
              {manuscript.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">

          <button
            onClick={() => setShowRagSidebar(!showRagSidebar)}
            className={`p-2 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all border ${
              showRagSidebar
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 border-purple-800/50 text-purple-300 hover:bg-purple-900/50'
            }`}
            title="R.A.I.J.I.N. Assistant"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">R.A.I.J.I.N. Assistant</span>
          </button>

          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(manuscript.id)}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                isBookmarked
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Manuscript'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          <button
            onClick={handleDownload}
            disabled={status !== 'ready'}
            className="p-2 sm:px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors disabled:opacity-40"
            title={`Download original ${downloadLabel}`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{downloadLabel}</span>
          </button>

          {onPrint && (
            <button
              onClick={() => onPrint(manuscript)}
              className="p-2 sm:px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
              title="Print to Kiosk Hardware Printer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(manuscript)}
              className="p-2 sm:px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
              title="Delete this manuscript"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Delete</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative">

        <main className="flex-1 min-w-0 overflow-auto bg-slate-950 custom-scrollbar relative">

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-300 text-sm z-10" role="status">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Loading manuscript file...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="h-full flex items-center justify-center p-6" role="alert">
              <div className="max-w-sm text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="font-bold text-white text-sm">Cannot open this manuscript</p>
                <p className="text-xs text-slate-400">{errorMsg}</p>
              </div>
            </div>
          )}

          {kind === 'pdf' && blobUrl && (
            <iframe src={blobUrl} title={manuscript.title} className="w-full h-full border-none bg-slate-900" />
          )}

          {kind === 'docx' && (
            <div
              ref={docxRef}
              className={`docx-host min-h-full bg-[#808080] ${status === 'ready' ? '' : 'invisible'}`}
            />
          )}

          {kind === 'txt' && status === 'ready' && (
            <pre className="max-w-4xl mx-auto p-4 sm:p-8 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-slate-200">
              {txtContent}
            </pre>
          )}

          {kind === 'text' && (
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
              <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-slate-200">
                {manuscript.fullText}
              </div>
            </div>
          )}

        </main>


        {/* RIGHT: R.A.I.J.I.N. GEMINI RAG AI ASSISTANT DRAWER */}
        {showRagSidebar && (
          <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl shrink-0 animate-slide-left z-20">
            
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-xs text-white uppercase italic">R.A.I.J.I.N. Literature RAG</h2>
                  <p className="text-[10px] text-purple-300 font-mono">Gemini 3.6 Flash HPC Engine</p>
                </div>
              </div>
              <button
                onClick={() => setShowRagSidebar(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Citations Block */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                  <Quote className="w-3 h-3 text-indigo-400" /> Academic Citation:
                </span>
                <div className="flex space-x-1">
                  {(['IEEE', 'APA', 'BibTeX'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setCitationFormat(fmt)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors ${
                        citationFormat === fmt ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 break-all leading-tight">
                {getCitationText()}
              </div>

              <button
                onClick={handleCopyCitation}
                className="w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 transition-colors"
              >
                {copiedCitation ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3" />
                    <span>Copy Citation</span>
                  </>
                )}
              </button>
            </div>

            {/* Chat conversation history */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
              
              {/* Default Welcome */}
              <div className="p-3.5 bg-purple-950/30 border border-purple-800/40 rounded-2xl space-y-2 text-purple-200">
                <p className="font-bold text-[11px] text-white flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" /> Deep Literature Inquiry Ready
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ask specific technical questions about this manuscript's mathematical formulations, research methodology, or experimental findings.
                </p>
              </div>

              {/* Q&A Items */}
              {ragChat.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  {/* User query bubble */}
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl rounded-tr-sm text-xs font-medium ml-4">
                    {item.q}
                  </div>

                  {/* AI response bubble */}
                  <div className="p-3.5 bg-slate-950 rounded-2xl rounded-tl-sm border border-slate-800 text-xs text-slate-200 space-y-1.5 mr-2">
                    <div className="flex items-center justify-between text-[10px] text-purple-300 font-mono pb-1 border-b border-slate-800">
                      <span>R.A.I.J.I.N. RAG</span>
                      <span>{item.time}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-300">
                      {item.a}
                    </div>
                  </div>
                </div>
              ))}

              {ragLoading && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-purple-500/30 flex items-center space-x-2 text-purple-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Synthesizing literature vector embeddings...</span>
                </div>
              )}
            </div>

            {/* Question Input Form */}
            <form onSubmit={handleAskRag} className="p-3 border-t border-slate-800 bg-slate-950/90">
              <div className="relative">
                <input
                  type="text"
                  value={ragQuestion}
                  onChange={(e) => setRagQuestion(e.target.value)}
                  placeholder="Ask about this paper..."
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={ragLoading || !ragQuestion.trim()}
                  className="absolute right-1.5 top-1.5 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

          </aside>
        )}

      </div>

    </div>
  );
};
