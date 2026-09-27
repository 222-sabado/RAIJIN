import React, { useState } from 'react';
import { User } from '../types';
import { GraduationCap, Lock, User as UserIcon, ShieldCheck, Eye, EyeOff, ArrowRight, AlertCircle, Info, BookOpen } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Student Login Fields
  const [studentNumber, setStudentNumber] = useState('1234');
  const [studentSurname, setStudentSurname] = useState('PARKER');

  // Admin Login Fields (as per Image 2)
  const [adminUsername, setAdminUsername] = useState('admin_group2');
  const [adminPassword, setAdminPassword] = useState('7654');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = isAdminMode
        ? { username: adminUsername, password: adminPassword, isAdmin: true }
        : { username: studentNumber, password: studentSurname, isAdmin: false };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server returned invalid non-JSON response.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Tech Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-500/20">
            <GraduationCap className="w-9 h-9" />
          </div>
        </div>
        <div className="text-center">
          <span className="text-xs font-bold text-indigo-400 tracking-tighter uppercase italic mb-1 block">
            GRID-POWERED HPC LITERATURE RETRIEVAL
          </span>
          <h2 className="text-center text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight uppercase italic">
            R.A.I.J.I.N. Engine
          </h2>
          <p className="mt-1.5 text-center text-xs sm:text-sm text-slate-400 font-medium">
            Retrieval-Augmented Intelligence for Joint Information Networks
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          
          {/* Card Header Switcher */}
          <div className="flex border-b border-slate-800 mb-6 pb-2">
            <button
              type="button"
              onClick={() => { setIsAdminMode(false); setErrorMsg(''); }}
              className={`flex-1 pb-2 text-xs font-extrabold uppercase tracking-wider border-b-2 text-center transition-colors ${
                !isAdminMode
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => { setIsAdminMode(true); setErrorMsg(''); }}
              className={`flex-1 pb-2 text-xs font-extrabold uppercase tracking-wider border-b-2 text-center transition-colors ${
                isAdminMode
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Admin Portal
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isAdminMode ? (
            /* STUDENT LOGIN FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Student Number
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="e.g. 1234"
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password (Surname in ALL CAPS)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={studentSurname}
                    onChange={(e) => setStudentSurname(e.target.value)}
                    placeholder="e.g. PARKER"
                    className="block w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Hint Helper */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5 text-indigo-400" /> Demo Credentials Ready:
                </div>
                <div>Username: <strong className="text-white font-mono">1234</strong> | Password: <strong className="text-white font-mono">PARKER</strong> (Peter Parker)</div>
                <div>Username: <strong className="text-white font-mono">2024101</strong> | Password: <strong className="text-white font-mono">DELACRUZ</strong></div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Login to Student Kiosk</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setIsAdminMode(true)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center space-x-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Login as Admin for Website (Faculty Portal)</span>
                </button>
              </div>
            </form>
          ) : (
            /* ADMIN LOGIN FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center pb-2">
                <div className="mx-auto w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mb-2">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-100 uppercase italic">Admin Login</h3>
                <p className="text-xs text-slate-400 font-medium">Access the R.A.I.J.I.N. Admin Dashboard</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admin Username
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Admin Username"
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admin Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Admin Password"
                    className="block w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Admin Demo Hint */}
              <div className="p-3.5 bg-indigo-950/40 rounded-2xl border border-indigo-800/40 text-[11px] text-indigo-200">
                <div className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Faculty Admin Example Credentials:
                </div>
                <div>Username: <strong className="text-white font-mono">admin_group2</strong></div>
                <div>Code / Password: <strong className="text-white font-mono">7654</strong></div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating Admin...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Login to Admin Dashboard</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsAdminMode(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider"
                >
                  ← Back to Student Login
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
