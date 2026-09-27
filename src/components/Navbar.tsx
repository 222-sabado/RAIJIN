import React from 'react';
import { User } from '../types';
import { 
  BookOpen, 
  Cpu, 
  Printer, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  printerConnected: boolean;
  paperCount: number;
  avgInkPercent: number;
  onOpenPrinterModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  printerConnected,
  paperCount,
  avgInkPercent,
  onOpenPrinterModal,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Kiosk Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-tight text-white uppercase italic">R.A.I.J.I.N.</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-black px-2.5 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1 uppercase tracking-wider">
                <Cpu className="w-3 h-3 text-indigo-400" /> HPC Grid RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Retrieval-Augmented Intelligence for Joint Information Networks
            </p>
          </div>
        </div>

        {/* Center Hardware Telemetry Summary */}
        <div className="hidden md:flex items-center space-x-4 bg-slate-950 rounded-xl px-4 py-1.5 border border-slate-800 text-xs">
          <button 
            onClick={onOpenPrinterModal}
            className="flex items-center space-x-2.5 hover:text-indigo-300 transition-colors"
            title="Click for detailed printer telemetry & sensor specs"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Kiosk Printer:</span>
            {printerConnected ? (
              <span className="flex items-center text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ONLINE
              </span>
            ) : (
              <span className="flex items-center text-amber-400 font-bold text-xs">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> OFFLINE
              </span>
            )}
            <span className="text-slate-700">|</span>
            <span className="text-slate-300 font-medium">Paper: <strong className="text-white font-bold">{paperCount}</strong> sheets</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300 font-medium">Ink: <strong className="text-white font-bold">{avgInkPercent}%</strong></span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* User Badge & Logout */}
          {user ? (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-xs shadow-sm">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-bold text-slate-100 leading-snug">{user.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                    {user.role === 'admin' ? (
                      <span className="text-amber-400 font-bold flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-0.5" /> Faculty Admin
                      </span>
                    ) : (
                      <span>Student #{user.studentNumber || user.username}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
