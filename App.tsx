
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Subscribers } from './components/Subscribers';
import { Payments } from './components/Payments';
import { Backup } from './components/Backup';
import { Administration } from './components/Administration';
import { Login } from './components/Login';
import { MikrotikModal } from './components/MikrotikModal';

const AppContent: React.FC = () => {
  const { currentUser } = useApp();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMikrotikOpen, setIsMikrotikOpen] = useState(false);

  // If not logged in, show login screen
  if (!currentUser) {
      return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'subscribers': return <Subscribers />;
      case 'payments': return <Payments />;
      case 'backup': return <Backup />;
      case 'administration': return <Administration />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        openMikrotik={() => setIsMikrotikOpen(true)}
      />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen print:ml-0 print:p-0 print:h-auto print:overflow-visible">
        {renderView()}
      </main>

      <MikrotikModal 
        isOpen={isMikrotikOpen} 
        onClose={() => setIsMikrotikOpen(false)} 
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
