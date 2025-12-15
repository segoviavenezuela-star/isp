
import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Upload, RefreshCw, FileText, Printer } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

export const Backup: React.FC = () => {
  const { subscribers, payments, logs, importData, restoreDefaults } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = { subscribers, payments };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_ws_isp_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.subscribers && json.payments) {
          importData(json.subscribers, json.payments);
          alert('Datos importados correctamente.');
        } else {
          alert('Formato de archivo inválido.');
        }
      } catch (error) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrintList = () => {
    window.print();
  };

  // Helper to sort by IP numerically
  const sortSubscribersByIp = (list: typeof subscribers) => {
    return [...list].sort((a, b) => {
      return a.ip.localeCompare(b.ip, undefined, { numeric: true });
    });
  };

  const sortedSubscribers = sortSubscribersByIp(subscribers);
  const activeSubscribers = sortedSubscribers.filter(s => s.status === 'ACTIVE');
  const suspendedSubscribers = sortedSubscribers.filter(s => s.status === 'SUSPENDED');

  return (
    <div className="space-y-6">
      
      {/* Screen Interface - Hidden on Print */}
      <div className="bg-white p-6 rounded-xl shadow-md print:hidden">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <RefreshCw className="mr-2" /> Respaldo y Restauración
        </h2>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Download size={20} />
            <span>Exportar Data (JSON)</span>
          </button>

          <button 
            onClick={handleImportClick}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Upload size={20} />
            <span>Importar Data (JSON)</span>
          </button>
          
          <button 
            onClick={handlePrintList}
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg transition-colors shadow-sm border border-slate-600"
          >
            <Printer size={20} />
            <span>Imprimir Lista Clientes</span>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".json"
          />
          
          <button 
            onClick={() => { if(confirm('¿Restaurar datos de ejemplo? Esto borrará los datos actuales.')) restoreDefaults() }}
            className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors ml-auto"
          >
            <span>Restaurar Demo</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden print:hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <FileText className="mr-2" size={18} /> Logs del Sistema (Últimos 30 días)
            </h3>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        <th className="p-3 font-medium text-gray-600">Fecha y Hora</th>
                        <th className="p-3 font-medium text-gray-600">Acción</th>
                        <th className="p-3 font-medium text-gray-600">Usuario</th>
                        <th className="p-3 font-medium text-gray-600">Detalles</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {logs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 text-sm">
                            <td className="p-3 text-gray-500 whitespace-nowrap">{format(parseISO(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</td>
                            <td className="p-3 font-medium text-blue-700">{log.action}</td>
                            <td className="p-3 text-gray-800">{log.user}</td>
                            <td className="p-3 text-gray-600">{log.details}</td>
                        </tr>
                    ))}
                    {logs.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-400">No hay registros de actividad.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Printable Report Section - Visible ONLY on Print */}
      <div className="hidden print:block bg-white p-4">
        <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
            <h1 className="text-3xl font-bold uppercase tracking-widest">W&S Service Provider</h1>
            <h2 className="text-xl mt-2">Reporte de Estado de Suscriptores</h2>
            <p className="text-sm text-gray-500">Fecha: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
            {/* Active Column */}
            <div>
                <div className="bg-green-100 border border-green-300 p-2 mb-4 text-center">
                    <h3 className="font-bold text-green-800 text-lg">ACTIVOS ({activeSubscribers.length})</h3>
                </div>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-2 px-1">IP</th>
                            <th className="text-left py-2 px-1">Nombre</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {activeSubscribers.map(sub => (
                            <tr key={sub.id}>
                                <td className="py-1 px-1 font-mono text-xs font-semibold">{sub.ip}</td>
                                <td className="py-1 px-1">{sub.fullName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Suspended Column */}
            <div>
                <div className="bg-red-100 border border-red-300 p-2 mb-4 text-center">
                    <h3 className="font-bold text-red-800 text-lg">SUSPENDIDOS ({suspendedSubscribers.length})</h3>
                </div>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-2 px-1">IP</th>
                            <th className="text-left py-2 px-1">Nombre</th>
                            <th className="text-right py-2 px-1">Tiempo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {suspendedSubscribers.map(sub => {
                            const days = differenceInDays(new Date(), parseISO(sub.cutOffDate));
                            return (
                                <tr key={sub.id}>
                                    <td className="py-1 px-1 font-mono text-xs font-semibold">{sub.ip}</td>
                                    <td className="py-1 px-1">{sub.fullName}</td>
                                    <td className="py-1 px-1 text-right font-bold text-red-600">
                                        {days > 0 ? `${days} días` : '0 días'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            Total Clientes: {subscribers.length} | Fin del Reporte
        </div>
      </div>
    </div>
  );
};
