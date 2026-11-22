import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { LoginPage } from './pages/auth/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/admin/DashboardPage';
import { VendosPage } from './pages/admin/VendosPage';
import { HarvestEncodingPage } from './pages/encoder/HarvestEncodingPage';
import { HarvestsPage } from './pages/admin/HarvestsPage';
import { PartnersPage } from './pages/admin/PartnersPage';
import { StaffPage } from './pages/admin/StaffPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

const AppContent: React.FC = () => {
  const { user, loading, isEncoder, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  useEffect(() => {
    if (user) {
      if (isEncoder) {
        setCurrentTab('harvest-encoding');
      } else {
        setCurrentTab('dashboard');
      }
    }
  }, [user, isEncoder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-cyber-green border-t-transparent animate-spin"></div>
          <span className="text-sm font-semibold tracking-wider text-slate-300">Loading GARTECH VENDO...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'vendos':
        return <VendosPage />;
      case 'harvest-encoding':
        return <HarvestEncodingPage />;
      case 'harvests':
        return <HarvestsPage />;
      case 'partners':
        return isAdmin ? <PartnersPage /> : <DashboardPage />;
      case 'reports':
        return <ReportsPage />;
      case 'staff':
        return isAdmin ? <StaffPage /> : <DashboardPage />;
      case 'settings':
        return isAdmin ? <SettingsPage /> : <DashboardPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <main className="flex-1 custom-scrollbar overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;
