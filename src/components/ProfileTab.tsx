import React, { useState } from 'react';
import { User, Manuscript } from '../types';
import { User as UserIcon, Mail, BookOpen, Clock, Save, Check, FileText, GraduationCap } from 'lucide-react';

interface ProfileTabProps {
  user: User;
  recentManuscripts: { manuscript?: Manuscript; timestamp: string }[];
  onUpdateProfile: (updated: Partial<User>) => Promise<void>;
  onSelectManuscript: (m: Manuscript) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  recentManuscripts,
  onUpdateProfile,
  onSelectManuscript,
}) => {
  const [username, setUsername] = useState(user.username);
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await onUpdateProfile({
        username,
        fullName,
        email,
        bio,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Profile Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black shrink-0 shadow-lg">
            <GraduationCap className="w-10 h-10" />
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic">{fullName}</h2>
                <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Student #{user.studentNumber || username}</p>
              </div>
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 self-center sm:self-start">
                {user.department || 'Engineering Student'}
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
              {bio || 'No bio set. Use the profile form below to write a research bio.'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800 pt-3">
              <span className="flex items-center gap-1 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> {email}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Recently opened: {recentManuscripts.length} manuscripts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase italic">
          <UserIcon className="w-5 h-5 text-indigo-400" /> Edit Profile Details
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Student Number / Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Research Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your engineering research interest..."
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Profile updated successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="ml-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recently Opened Manuscripts Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase italic">
          <Clock className="w-5 h-5 text-indigo-400" /> Recently Opened Manuscripts
        </h3>

        {recentManuscripts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm font-bold">
            No recently opened manuscripts yet. Search and open manuscripts in the dashboard.
          </div>
        ) : (
          <div className="space-y-3">
            {recentManuscripts.map((item, idx) => {
              const ms = item.manuscript;
              if (!ms) return null;
              return (
                <div
                  key={idx}
                  onClick={() => onSelectManuscript(ms)}
                  className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-800/50 group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-1 uppercase italic">
                        {ms.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ms.authors.join(', ')} • <span className="text-indigo-400 font-bold">{ms.category}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap pl-4">
                    Opened {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
