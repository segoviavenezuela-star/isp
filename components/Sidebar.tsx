
import React from 'react';
import { LayoutDashboard, Users, CreditCard, Database, Router as RouterIcon, ShieldCheck, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  openMikrotik: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, openMikrotik }) => {
  const { currentUser, logout } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'subscribers', label: 'Suscriptores', icon: <Users size={20} /> },
    { id: 'payments', label: 'Pagos y Caja', icon: <CreditCard size={20} /> },
    { id: 'backup', label: 'Respaldo', icon: <Database size={20} /> },
    { id: 'administration', label: 'Administración', icon: <ShieldCheck size={20} />, restricted: true },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-20 print:hidden">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wider">W&S ISP</h1>
        <p className="text-xs text-slate-400 mt-1">
            {currentUser ? `Hola, ${currentUser.fullName.split(' ')[0]}` : 'Service Provider Manager'}
        </p>
        {currentUser && (
             <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-600 text-slate-300">
                 {currentUser.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : currentUser.role}
             </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
            // EXCLUSIVE ACCESS: Only SUPER_ADMIN (Level 1) can see the Administration menu
            if (item.id === 'administration' && currentUser?.role !== 'SUPER_ADMIN') {
                return null;
            }

            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center px-6 py-4 transition-colors duration-200 ${
                  currentView === item.id
                    ? 'bg-blue-600 text-white border-r-4 border-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            )
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={openMikrotik}
          className="w-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-4 rounded-lg transition-colors text-sm"
        >
          <RouterIcon size={16} className="mr-2" />
          <span>Config Mikrotik</span>
        </button>
        
        <button
          onClick={logout}
          className="w-full flex items-center justify-center bg-red-900/30 hover:bg-red-900/50 text-red-200 py-2 px-4 rounded-lg transition-colors text-sm border border-red-900/50"
        >
          <LogOut size={16} className="mr-2" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
