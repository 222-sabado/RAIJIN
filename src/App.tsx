import React, { useState, useEffect } from 'react';
import { User, PrinterStatus } from './types';
import { safeFetchJson } from './lib/api';
import { Navbar } from './components/Navbar';
import { LoginForm } from './components/LoginForm';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PrinterTelemetryCard } from './components/PrinterTelemetryCard';
import { INITIAL_PRINTER_STATUS } from './data/mockDatabase';
import { X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(INITIAL_PRINTER_STATUS);
  const [showPrinterTelemetryModal, setShowPrinterTelemetryModal] = useState(false);

  // Poll printer telemetry
  const fetchPrinterStatus = async () => {
    try {
      const data = await safeFetchJson('/api/printer/status');
      if (data && data.printerStatus) {
        setPrinterStatus(data.printerStatus);
      }
    } catch (e) {
      console.warn('Printer telemetry poll error:', e);
    }
  };

  useEffect(() => {
    fetchPrinterStatus();
    const interval = setInterval(fetchPrinterStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser);
    setToken(authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  const handleUpdateProfile = async (updatedFields: Partial<User>) => {
    if (!user) return;
    try {
      const data = await safeFetchJson('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...updatedFields }),
      });
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefillPaper = async () => {
    try {
      const data = await safeFetchJson('/api/printer/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets: 250, fillInk: true }),
      });
      if (data && data.printerStatus) {
        setPrinterStatus(data.printerStatus);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePrinterConnection = async () => {
    try {
      const data = await safeFetchJson('/api/printer/toggle-connection', { method: 'POST' });
      if (data && data.printerStatus) {
        setPrinterStatus(data.printerStatus);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmPrint = async (manuscriptId: string, bookmarkAlso: boolean) => {
    if (!user) return;
    const data = await safeFetchJson(`/api/user/${user.id}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manuscriptId, bookmarkAlso }),
    });
    if (!data) {
      throw new Error('Print request failed or returned invalid response.');
    }
    if (data.error) {
      throw new Error(data.error);
    }
    if (data.printerStatus) {
      setPrinterStatus(data.printerStatus);
    }
  };

  const avgInk = Math.round(
    (printerStatus.inkLevels.black +
      printerStatus.inkLevels.cyan +
      printerStatus.inkLevels.magenta +
      printerStatus.inkLevels.yellow) /
      4
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        printerConnected={printerStatus.isConnected}
        paperCount={printerStatus.paperTray.sheetCount}
        avgInkPercent={avgInk}
        onOpenPrinterModal={() => setShowPrinterTelemetryModal(true)}
      />

      {/* Main App Body */}
      {!user ? (
        /* Authentication Screen */
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : user.role === 'admin' ? (
        /* Faculty Admin Dashboard */
        <AdminDashboard
          user={user}
          printerStatus={printerStatus}
          onLogout={handleLogout}
          onRefillPaper={handleRefillPaper}
          onToggleConnection={handleTogglePrinterConnection}
        />
      ) : (
        /* Student Kiosk Dashboard */
        <StudentDashboard
          user={user}
          printerStatus={printerStatus}
          onLogout={handleLogout}
          onUpdateProfile={handleUpdateProfile}
          onRefillPaper={handleRefillPaper}
          onToggleConnection={handleTogglePrinterConnection}
          onConfirmPrint={handleConfirmPrint}
        />
      )}

      {/* Printer Telemetry Quick Dialog */}
      {showPrinterTelemetryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setShowPrinterTelemetryModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <PrinterTelemetryCard
              status={printerStatus}
              onRefillPaper={handleRefillPaper}
              onToggleConnection={handleTogglePrinterConnection}
            />
          </div>
        </div>
      )}

    </div>
  );
}
