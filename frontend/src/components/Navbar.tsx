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
  X,
  Menu
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

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
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
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Admin
          </span>
        );
      case 'STAFF_ENCODER':
        return (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Encoder
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="bg-slate-900 dark:bg-black text-white h-16 border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 shadow-md transition-colors duration-150">
        {/* Left: Mobile Hamburger Toggle + Brand & Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Mobile Menu Hamburger Button */}
          {user && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-emerald-400" />
              ) : (
                <Menu className="w-5 h-5 text-emerald-400" />
              )}
            </button>
          )}

          <div className="relative group shrink-0">
            <img 
              src={settings.logo_url || "/logo.jpg"} 
              alt="Logo" 
              key={settings.logo_url}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm shadow-emerald-500/30"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo.jpg')) {
                  target.src = '/logo.jpg';
                }
              }}
            />
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-lg tracking-wide sm:tracking-wider text-white truncate">
                {settings.company_name}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block truncate">{settings.company_tagline}</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* GitHub Update Checker Button */}
          <button
            onClick={() => checkUpdates(true)}
            title="Check GitHub for Updates"
            className="relative flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
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
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </button>

          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-2 bg-slate-800/80 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg border border-slate-700/60">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">{user.full_name}</div>
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
            className="flex items-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 p-1.5 sm:p-2 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* GitHub Update Checker Modal */}
      {showUpdateModal && updateInfo && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowUpdateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">System Update & Release Status</h3>
                <p className="text-xs text-slate-400 font-mono">Repo: chavxxx/VendoRevenue</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Installed Version</span>
                  <span className="font-bold text-sm text-white font-mono">{updateInfo.current_version} ({updateInfo.current_commit})</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block text-right">Latest Remote</span>
                  <span className="font-bold text-sm text-emerald-400 font-mono text-right block">
                    {updateInfo.latest_commit ? updateInfo.latest_commit : 'Verified'}
                  </span>
                </div>
              </div>

              {updateInfo.has_update ? (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>New updates are available on GitHub!</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Commit: <span className="font-mono">{updateInfo.latest_message}</span>
                  </p>
                  <p className="text-[10px] text-amber-400 font-mono">
                    Author: {updateInfo.latest_author} • {updateInfo.latest_date}
                  </p>
                  <div className="pt-2">
                    <span className="text-[11px] block font-semibold text-white">To update your server, run via SSH:</span>
                    <code className="block bg-black/60 p-2 rounded-lg text-emerald-400 font-mono text-[11px] mt-1 select-all">
                      sudo ./scripts/update.sh
                    </code>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center space-x-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>System is up to date!</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Running latest commit: <span className="font-mono text-emerald-400">{updateInfo.latest_message}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Checked on {updateInfo.checked_at}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <a
                href={updateInfo.repo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-white"
              >
                <span>View GitHub Repository</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => checkUpdates(true)}
                disabled={isCheckingUpdate}
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                <span>Check Again</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
