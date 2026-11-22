import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Wifi, 
  PlusCircle, 
  Receipt, 
  Users, 
  UserCheck, 
  FileText, 
  Settings
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Harvesters', icon: LayoutDashboard, show: true },
    { id: 'vendos', label: 'Vendo Machines', icon: Wifi, show: true },
    { id: 'harvest-encoding', label: 'Encode Harvest', icon: PlusCircle, show: true },
    { id: 'harvests', label: 'Harvest Records', icon: Receipt, show: true },
    { id: 'reports', label: 'Financial Reports', icon: FileText, show: true },
    { id: 'partners', label: 'Location Partners', icon: Users, show: isAdmin },
    { id: 'staff', label: 'Staff & Harvesters', icon: UserCheck, show: isAdmin },
    { id: 'settings', label: 'Settings & Audit', icon: Settings, show: isAdmin },
  ];

  return (
    <aside className="w-64 bg-slate-900 dark:bg-black/95 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 custom-scrollbar overflow-y-auto transition-colors duration-150">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          Navigation
        </div>
        
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </div>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <div className="text-slate-300 font-semibold">GARTECH VENDO v2.1</div>
        <div>Valencia City, Bukidnon</div>
        <div className="mt-1 text-[10px] text-emerald-400 flex items-center font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
          Connected to Central Database
        </div>
      </div>
    </aside>
  );
};
