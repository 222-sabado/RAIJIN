import React, { useState, useEffect } from 'react';
import { Manuscript, PrinterStatus } from '../types';
import { 
  FileText, 
  Printer, 
  Download, 
  Bookmark, 
  Share2, 
  Sparkles, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Quote, 
  Check, 
  Layers, 
  Cpu, 
  Send,
  Loader2,
  Columns,
  Eye,
  FileCheck
} from 'lucide-react';

interface PdfManuscriptViewerProps {
  manuscript: Manuscript;
  onClose: () => void;
  onPrint?: (manuscript: Manuscript) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (manuscriptId: string) => void;
}

export const PdfManuscriptViewer: React.FC<PdfManuscriptViewerProps> = ({
  manuscript,
  onClose,
  onPrint,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(manuscript.pageCount || 4);
  const [viewMode, setViewMode] = useState<'paper' | 'embed' | 'twocolumn'>('paper');
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
      if (e.key === 'ArrowRight' && currentPage < totalPages) setCurrentPage(p => p + 1);
      if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage(p => p - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onClose]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 70));
  const handleResetZoom = () => setZoomLevel(100);

  // Parse sections from manuscript fullText
  const rawSections = React.useMemo(() => {
    if (!manuscript.fullText) return [];
    
    // Split by numbered sections or paragraphs
    const paragraphs = manuscript.fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return paragraphs;
  }, [manuscript.fullText]);

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

  // Download PDF file
  const handleDownloadPdf = () => {
    if (manuscript.pdfDataUrl) {
      // Direct download of uploaded base64 PDF
      const link = document.createElement('a');
      link.href = manuscript.pdfDataUrl;
      link.download = `${manuscript.title.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Generate formatted printable HTML / PDF snapshot
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${manuscript.title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.5; font-size: 11pt; }
          .header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; font-size: 9pt; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px; color: #444; }
          h1 { font-size: 18pt; text-align: center; margin: 0 0 10px 0; font-weight: bold; }
          .authors { text-align: center; font-size: 11pt; font-style: italic; margin-bottom: 15px; color: #222; }
          .abstract-box { background: #f8f9fa; border-left: 3px solid #1e293b; padding: 12px; margin: 15px 0; font-size: 10pt; }
          .keywords { font-size: 9.5pt; font-weight: bold; margin-top: 6px; }
          .content { columns: 2; column-gap: 20px; text-align: justify; margin-top: 20px; }
          h2 { font-size: 12pt; text-transform: uppercase; border-bottom: 0.5px solid #ccc; padding-bottom: 3px; break-after: avoid; font-family: sans-serif; margin-top: 15px; }
          p { margin: 0 0 10px 0; text-indent: 1.5em; }
          .footer { font-size: 8pt; text-align: center; border-top: 1px solid #ccc; margin-top: 30px; padding-top: 10px; color: #666; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div class="header">R.A.I.J.I.N. Engine • Retrieval-Augmented Intelligence for Joint Information Networks • ISSN 2940-1182</div>
        <h1>${manuscript.title}</h1>
        <div class="authors">${manuscript.authors.join(', ')}<br/><small style="font-style: normal; color: #555;">Department of ${manuscript.category} Engineering • Date: ${manuscript.publicationDate}</small></div>
        
        <div class="abstract-box">
          <strong>Abstract—</strong> ${manuscript.abstract}
          <div class="keywords">Index Terms— ${manuscript.keywords.join(', ')}.</div>
        </div>

        <div class="content">
          ${manuscript.fullText.split('\n\n').map(p => {
            if (p.match(/^[0-9]+\.\s+[A-Z\s]+/)) {
              return `<h2>${p}</h2>`;
            }
            return `<p>${p}</p>`;
          }).join('')}
        </div>

        <div class="footer">
          Published via R.A.I.J.I.N. Engine • High-Performance Computing Research Repository
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100 overflow-hidden animate-fade-in">
      
      {/* TOP TOOLBAR */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg select-none">
        
        {/* Left: Document Info & Badge */}
        <div className="flex items-center space-x-3 overflow-hidden pr-2">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded">
                {manuscript.category}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                {manuscript.fileSize || '2.4 MB'} • {totalPages} Pages
              </span>
            </div>
            <h1 className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md lg:max-w-xl" title={manuscript.title}>
              {manuscript.title}
            </h1>
          </div>
        </div>

        {/* Center: Pagination & Zoom Controls */}
        <div className="hidden lg:flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          
          {/* Page Navigator */}
          <div className="flex items-center space-x-1.5 pr-3 border-r border-slate-800">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300">
              Page <strong className="text-white font-bold">{currentPage}</strong> of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-0.5 rounded font-mono font-bold text-indigo-300 hover:bg-slate-800 text-xs"
              title="Reset Zoom"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center space-x-1 pl-3 border-l border-slate-800">
            <button
              onClick={() => setViewMode('paper')}
              className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                viewMode === 'paper' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Academic Sheet
            </button>
            <button
              onClick={() => setViewMode('twocolumn')}
              className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                viewMode === 'twocolumn' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2-Column
            </button>
            {manuscript.pdfDataUrl && (
              <button
                onClick={() => setViewMode('embed')}
                className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  viewMode === 'embed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Native PDF
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions (Print, Download, RAG AI, Close) */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Ask Gemini / RAG AI Toggle */}
          <button
            onClick={() => setShowRagSidebar(!showRagSidebar)}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all border ${
              showRagSidebar
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 border-purple-800/50 text-purple-300 hover:bg-purple-900/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">R.A.I.J.I.N. Assistant</span>
          </button>

          {/* Bookmark */}
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

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
            title="Download PDF Manuscript"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">PDF</span>
          </button>

          {/* Print Kiosk Button */}
          {onPrint && (
            <button
              onClick={() => onPrint(manuscript)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
              title="Print to Kiosk Hardware Printer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT / CENTER: PDF CANVAS VIEW */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-950 custom-scrollbar">
          
          {viewMode === 'embed' && manuscript.pdfDataUrl ? (
            /* EMBEDDED NATIVE PDF IFRAME */
            <div className="w-full h-full max-w-5xl rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
              <iframe
                src={manuscript.pdfDataUrl}
                title={manuscript.title}
                className="w-full h-full min-h-[750px] border-none"
              />
            </div>
          ) : (
            /* ACADEMIC PDF DOCUMENT CANVAS */
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="transition-transform duration-150 ease-out max-w-4xl w-full my-2 space-y-8"
            >
              {/* PDF PAGE SHEET 1 (Header + Title + Abstract + Body) */}
              <div className="bg-white text-slate-900 rounded-lg shadow-2xl p-8 sm:p-14 border border-slate-300 min-h-[1050px] flex flex-col justify-between relative selection:bg-indigo-100 selection:text-indigo-900">
                
                {/* Academic Journal Top Header Stamp */}
                <div className="border-b border-slate-400 pb-3 mb-8 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-600">
                  <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <Cpu className="w-3 h-3 text-indigo-700" /> R.A.I.J.I.N. Engine Scholarly Repository
                  </span>
                  <span>Vol. 14, No. 2 • Engineering HPC Series</span>
                  <span>ISSN 2940-1182</span>
                </div>

                {/* Main Article Header */}
                <div className="space-y-4 mb-6 text-center">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 font-serif leading-snug">
                    {manuscript.title}
                  </h1>

                  {/* Authors & Affiliation */}
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 italic font-serif">
                      {manuscript.authors.join(', ')}
                    </p>
                    <p className="text-xs text-slate-600 font-sans">
                      Department of {manuscript.category} Engineering, Grid Computing & HPC Laboratory
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Publication Date: {manuscript.publicationDate} • DOI: 10.1109/RAIJIN.{manuscript.id}
                    </p>
                  </div>

                  {/* Abstract & Keywords Callout Box */}
                  <div className="bg-slate-50 border-y-2 border-slate-300 py-4 px-6 text-left space-y-2.5 my-6">
                    <p className="text-xs text-slate-800 leading-relaxed font-serif">
                      <strong className="font-sans font-bold text-slate-950 uppercase tracking-wide text-[11px] not-italic mr-2">
                        Abstract—
                      </strong>
                      {manuscript.abstract}
                    </p>
                    <div className="text-[11px] font-sans text-slate-700 pt-1 border-t border-slate-200">
                      <strong className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mr-1.5">
                        Index Terms—
                      </strong>
                      {manuscript.keywords.join(', ')}.
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className={`${viewMode === 'twocolumn' ? 'columns-1 sm:columns-2 gap-8' : 'space-y-5'} text-justify font-serif text-[13px] leading-relaxed text-slate-900`}>
                  {rawSections.map((paragraph, idx) => {
                    const isHeading = paragraph.match(/^[0-9]+\.\s+[A-Z\s]+/);
                    if (isHeading) {
                      return (
                        <h2
                          key={idx}
                          className="font-sans font-black text-sm uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 mt-6 mb-2 break-after-avoid"
                        >
                          {paragraph}
                        </h2>
                      );
                    }

                    // Equation formula simulation styling
                    if (paragraph.includes('∂²E/∂z²') || paragraph.includes('∇ · u') || paragraph.includes('T_m =') || paragraph.includes('=')) {
                      return (
                        <div key={idx} className="my-4 p-3 bg-slate-100 rounded border border-slate-200 text-center font-mono text-xs text-slate-950 italic">
                          {paragraph}
                        </div>
                      );
                    }

                    return (
                      <p key={idx} className="text-indent-6 mb-3">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                {/* Page Footer */}
                <div className="border-t border-slate-300 pt-3 mt-12 flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>R.A.I.J.I.N. Engine • Retrieval-Augmented Intelligence for Joint Information Networks</span>
                  <span className="font-bold text-slate-800">Page {currentPage} of {totalPages}</span>
                </div>
              </div>

              {/* PDF PAGE SHEET 2 (Simulated 2nd page if multiple pages) */}
              {totalPages > 1 && (
                <div className="bg-white text-slate-900 rounded-lg shadow-2xl p-8 sm:p-14 border border-slate-300 min-h-[1050px] flex flex-col justify-between relative selection:bg-indigo-100 selection:text-indigo-900">
                  <div className="border-b border-slate-400 pb-3 mb-8 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-600">
                    <span className="font-bold text-indigo-900">R.A.I.J.I.N. Engine Research Repository</span>
                    <span>Manuscript #{manuscript.id}</span>
                    <span>Page 2</span>
                  </div>

                  <div className={`${viewMode === 'twocolumn' ? 'columns-1 sm:columns-2 gap-8' : 'space-y-5'} text-justify font-serif text-[13px] leading-relaxed text-slate-900`}>
                    <h2 className="font-sans font-black text-sm uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 mt-2 mb-2">
                      EXPERIMENTAL RESULTS & TELEMETRY
                    </h2>
                    <p className="text-indent-6">
                      The experimental protocol validated the algorithmic bounds under continuous load testing across the HPC grid cluster nodes. Telemetry streams sampled through real-time sensors demonstrated high synchronization with low jitter.
                    </p>
                    <div className="my-4 p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs font-sans text-slate-800 space-y-1">
                      <div className="font-bold uppercase tracking-wider text-[10px] text-indigo-900">Table 1. Benchmark Execution Parameters</div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-300 font-mono text-[11px]">
                        <div>HPC Cluster Nodes: 16</div>
                        <div>RAG Query Latency: 0.28 ms</div>
                        <div>Confidence Score: 0.98</div>
                      </div>
                    </div>

                    <h2 className="font-sans font-black text-sm uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 mt-6 mb-2">
                      CONCLUSION & FUTURE RESEARCH
                    </h2>
                    <p className="text-indent-6">
                      In conclusion, this research confirms that the proposed architectural model achieves superior performance in high-frequency engineering applications. Future iterations will extend the RAG index schema to support distributed sub-millisecond edge nodes.
                    </p>

                    <h2 className="font-sans font-black text-sm uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-1 mt-6 mb-2">
                      REFERENCES
                    </h2>
                    <ol className="list-decimal pl-5 text-[11px] font-sans space-y-1.5 text-slate-700">
                      <li>A. Thorne et al., "Wave Propagation in Smart Distribution Networks," IEEE Trans. Power Syst., 2024.</li>
                      <li>K. Vance, "Computational Modeling of Distributed Grid Inverters," Academic Press, 2025.</li>
                      <li>R.A.I.J.I.N. System Architecture Group, "Retrieval-Augmented Intelligence Technical Report v2.4," 2026.</li>
                    </ol>
                  </div>

                  <div className="border-t border-slate-300 pt-3 mt-12 flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Authorized Faculty Kiosk Reproduction</span>
                    <span className="font-bold text-slate-800">Page 2 of {totalPages}</span>
                  </div>
                </div>
              )}
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
