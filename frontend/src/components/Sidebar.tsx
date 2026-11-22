import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  LayoutDashboard, 
  Wifi, 
  PlusCircle, 
  Receipt, 
  UserCheck, 
  FileText, 
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Harvesters', icon: LayoutDashboard, show: true },
    { id: 'vendos', label: 'Vendo Machines', icon: Wifi, show: true },
    { id: 'harvest-encoding', label: 'Encode Harvest', icon: PlusCircle, show: true },
    { id: 'harvests', label: 'Harvest Records', icon: Receipt, show: true },
    { id: 'reports', label: 'Financial Reports', icon: FileText, show: true },
    { id: 'staff', label: 'Staff & Harvesters', icon: UserCheck, show: isAdmin },
    { id: 'settings', label: 'Settings & Customization', icon: Settings, show: isAdmin },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar Component */}
      <aside 
        className={`fixed lg:sticky top-16 left-0 bottom-0 z-40 lg:z-10 w-64 bg-slate-900 dark:bg-black/95 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] custom-scrollbar overflow-y-auto transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="py-4 px-3 space-y-1">
          {/* Header on mobile */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Navigation
            </span>
            <button 
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </div>

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
          <div className="text-slate-300 font-semibold truncate">{settings.company_name}</div>
          <div className="truncate">{settings.default_city}, {settings.default_province}</div>
          <div className="mt-1 text-[10px] text-emerald-400 flex items-center font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse shrink-0"></span>
            <span className="truncate">Connected to Central Database</span>
          </div>
        </div>
      </aside>
    </>
  );
};
