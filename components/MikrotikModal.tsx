
import React, { useState } from 'react';
import { X, Server, Wifi, Check, AlertCircle, Loader } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MikrotikConfig } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MikrotikModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { connectToMikrotik, mikrotikConfig, mikrotikStatus } = useApp();
  const [formData, setFormData] = useState<MikrotikConfig>(
    mikrotikConfig || { ip: '', user: '', pass: '', port: 8728 }
  );
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Attempt connection
    const success = await connectToMikrotik(formData);
    
    setIsLoading(false);
    if (success) {
        setTimeout(onClose, 1000); // Close after a brief success message
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="bg-blue-600 p-2 rounded-lg">
                 <Server size={24} />
             </div>
             <div>
                <h3 className="text-xl font-bold">Conexión Mikrotik</h3>
                <p className="text-xs text-slate-400">API Port 8728 (REST/API)</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {mikrotikStatus === 'CONNECTED' && !isLoading && (
              <div className="bg-green-900/50 border border-green-500 text-green-200 p-3 rounded flex items-center">
                  <Check size={18} className="mr-2"/> Conexión Establecida
              </div>
          )}
           {mikrotikStatus === 'ERROR' && !isLoading && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded flex items-center">
                  <AlertCircle size={18} className="mr-2"/> Error de conexión o credenciales
              </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">IP Router</label>
            <input 
              required
              className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="192.168.88.1"
              value={formData.ip}
              onChange={e => setFormData({...formData, ip: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Usuario</label>
            <input 
              required
              className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="admin"
              value={formData.user}
              onChange={e => setFormData({...formData, user: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Contraseña</label>
            <input 
              type="password"
              className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={formData.pass}
              onChange={e => setFormData({...formData, pass: e.target.value})}
            />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-400 mb-1">Puerto API</label>
             <input 
               type="number"
               className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
               value={formData.port}
               onChange={e => setFormData({...formData, port: Number(e.target.value)})}
             />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full font-bold py-3 rounded-lg transition-all mt-4 flex justify-center items-center ${
                isLoading ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isLoading ? (
                <><Loader className="animate-spin mr-2" size={18}/> Conectando...</>
            ) : (
                <><Wifi className="mr-2" size={18}/> Conectar y Guardar</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
