import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { 
  LogOut, 
  Sun, 
  Moon, 
  GitBranch, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  X 
} from 'lucide-react';

interface UpdateInfo {
  current_version: string;
  current_commit: string;
  latest_commit?: string;
  has_update: boolean;
  latest_message?: string;
  latest_author?: string;
  latest_date?: string;
  repo_url: string;
  checked_at: string;
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Check update on mount
  useEffect(() => {
    checkUpdates(false);
  }, []);

  const checkUpdates = async (openModal = true) => {
    setIsCheckingUpdate(true);
    try {
      const res = await api.checkSystemUpdates();
      setUpdateInfo(res);
      if (openModal) {
        setShowUpdateModal(true);
      }
    } catch (err) {
      console.error('Failed to check updates:', err);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-2.5 py-0.5 rounded-full font-medium">
            Administrator
          </span>
        );
      case 'STAFF_ENCODER':
        return (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs px-2.5 py-0.5 rounded-full font-medium">
            Staff Encoder
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="bg-slate-900 dark:bg-black text-white h-16 border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-md transition-colors duration-150">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <img 
              src={settings.logo_url || "/logo.jpg"} 
              alt="Logo" 
              key={settings.logo_url}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm shadow-emerald-500/30"
              onError={(e) => {
                // Fallback to default /logo.jpg if custom fails
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo.jpg')) {
                  target.src = '/logo.jpg';
                }
              }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-wider text-white">{settings.company_name}</span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">{settings.company_tagline}</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* GitHub Update Checker Button */}
          <button
            onClick={() => checkUpdates(true)}
            title="Check GitHub for Updates"
            className="relative flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <GitBranch className={`w-3.5 h-3.5 text-emerald-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">GitHub Updates</span>
            {updateInfo?.has_update && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </button>

          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-2 bg-slate-800/80 py-1.5 px-3 rounded-lg border border-slate-700/60">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200">{user.full_name}</div>
                <div className="text-[10px] text-slate-400">{user.username}</div>
              </div>
              <div className="hidden lg:block ml-1">
                {getRoleBadge(user.role)}
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign Out"
            className="flex items-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 p-2 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* GitHub Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-xl max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowUpdateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">GitHub System Updates</h3>
                <p className="text-xs text-slate-400">VendoRevenue Repository</p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Current Version:</span>
                <span className="font-mono font-bold text-emerald-400">{updateInfo?.current_version || 'v2.1.0'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Installed Commit:</span>
                <span className="font-mono text-slate-300">{updateInfo?.current_commit || 'HEAD'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Latest Remote Commit:</span>
                <span className="font-mono text-slate-300">{updateInfo?.latest_commit || 'Checked'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Last Checked:</span>
                <span className="text-slate-400">{updateInfo?.checked_at || 'Just now'}</span>
              </div>
            </div>

            {updateInfo?.has_update ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3.5 mb-4 text-xs text-amber-300 flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-200">New Update Available on GitHub!</div>
                  <div className="mt-1 text-slate-300">{updateInfo.latest_message}</div>
                  <div className="mt-2 text-[11px] text-amber-400/90 font-mono bg-black/40 p-2 rounded border border-amber-500/20">
                    To apply: git pull origin main
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3.5 mb-4 text-xs text-emerald-300 flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-200">System is Up to Date</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Running latest release synchronized with GitHub repository.</div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => checkUpdates(true)}
                disabled={isCheckingUpdate}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                <span>Check Again</span>
              </button>
              <a
                href={updateInfo?.repo_url || "https://github.com/chavxxx/VendoRevenue"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition"
              >
                <span>View Repo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
