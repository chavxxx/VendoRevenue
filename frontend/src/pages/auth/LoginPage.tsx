import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Lock, User, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { settings } = useSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8">
        <div className="text-center mb-6">
          <div className="inline-block relative mb-3">
            <img 
              src={settings.logo_url || "/logo.jpg"} 
              alt="Logo" 
              key={settings.logo_url}
              className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo.jpg')) {
                  target.src = '/logo.jpg';
                }
              }}
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">{settings.company_name}</h1>
          <p className="text-xs text-emerald-400 mt-1 uppercase tracking-widest font-bold">
            {settings.company_tagline}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center">
            <span className="w-2 h-2 rounded-full bg-rose-500 mr-2 shrink-0"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center text-sm"
          >
            {loading ? (
              <span className="animate-spin mr-2">◌</span>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            Quick System Access
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => setDemoCredentials('admin', 'GartechAdmin2026!')}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-left text-slate-200 transition"
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-400">Admin</span>
              </div>
              <div className="text-[10px] text-slate-400">Full System Access</div>
            </button>
            <button
              onClick={() => setDemoCredentials('encoder1', 'GartechEncoder2026!')}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-left text-slate-200 transition"
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold text-blue-400">Staff Encoder</span>
              </div>
              <div className="text-[10px] text-slate-400">Vendos, Harvest & Income</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
