import React, { useState } from 'react';
import { Manuscript, PrinterStatus } from '../types';
import { Printer, Bookmark, Check, AlertTriangle, FileText, X } from 'lucide-react';

interface PrintModalProps {
  manuscript: Manuscript;
  printerStatus: PrinterStatus;
  includeBookmark: boolean;
  onClose: () => void;
  onConfirmPrint: (manuscriptId: string, bookmarkAlso: boolean) => Promise<void>;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  manuscript,
  printerStatus,
  includeBookmark,
  onClose,
  onConfirmPrint,
}) => {
  const [printing, setPrinting] = useState(false);
  const [bookmarkChecked, setBookmarkChecked] = useState(includeBookmark);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const pages = manuscript.pageCount || 12;
  const hasEnoughPaper = printerStatus.paperTray.sheetCount >= pages;

  const handlePrint = async () => {
    if (!hasEnoughPaper) {
      setErrorMsg(`Not enough paper in paper tray (${printerStatus.paperTray.sheetCount} sheets remaining vs ${pages} required).`);
      return;
    }
    if (!printerStatus.isConnected) {
      setErrorMsg('Printer is currently offline. Please connect printer or inform faculty admin.');
      return;
    }

    setPrinting(true);
    setErrorMsg('');

    try {
      await onConfirmPrint(manuscript.id, bookmarkChecked);
      setSuccessMsg(`Print job dispatched! ${pages} pages sent to ${printerStatus.model}.`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Print job failed.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-2xl">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase italic">Kiosk Print Job Confirmation</h3>
            <p className="text-xs text-slate-400 font-mono">Station #1 • {printerStatus.model}</p>
          </div>
        </div>

        {/* Document Info Box */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-slate-100 uppercase italic line-clamp-2">{manuscript.title}</h4>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Authors: {manuscript.authors.join(', ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-900 font-bold">
            <div>Total Pages: <strong className="text-white font-mono">{pages} pages</strong></div>
            <div>Discipline: <strong className="text-indigo-400">{manuscript.category}</strong></div>
          </div>
        </div>

        {/* Paper & Ink Availability Check */}
        <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-bold text-[11px] uppercase tracking-wider">Paper Tray Status:</span>
            <span className={hasEnoughPaper ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>
              {printerStatus.paperTray.sheetCount} sheets ready ({hasEnoughPaper ? 'OK' : 'Low Paper'})
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-bold text-[11px] uppercase tracking-wider">Printer Connection:</span>
            <span className={printerStatus.isConnected ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
              {printerStatus.isConnected ? 'ONLINE / READY' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Option: Bookmark simultaneously */}
        <label className="flex items-center space-x-3 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-950 transition-colors">
          <input
            type="checkbox"
            checked={bookmarkChecked}
            onChange={(e) => setBookmarkChecked(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
          />
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
            <Bookmark className="w-4 h-4 text-indigo-400" />
            <span>Also save this manuscript to my Bookmarks</span>
          </div>
        </label>

        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-2xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-2xl flex items-center space-x-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={printing || !hasEnoughPaper || !printerStatus.isConnected}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>{printing ? 'Dispatching Print...' : bookmarkChecked ? 'Bookmark & Print Now' : 'Print Now'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
