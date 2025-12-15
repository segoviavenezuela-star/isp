
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Subscriber, ServiceType, Currency, ServiceStatus } from '../types';
import { Search, Plus, Edit, AlertTriangle, CheckCircle, XCircle, Scissors, X, MessageSquare, ExternalLink } from 'lucide-react';
import { differenceInDays, parseISO, format, addMonths, setDate, startOfDay, isWithinInterval, addDays } from 'date-fns';

// Default to 5th of next month for new creations, but editable
const getNextBillingCycleDate = () => {
  const nextMonth = addMonths(new Date(), 1);
  const fifthOfNextMonth = setDate(nextMonth, 5);
  return format(fifthOfNextMonth, 'yyyy-MM-dd');
};

const emptySubscriber: Subscriber = {
  id: '',
  fullName: '',
  docId: '',
  ip: '',
  cutOffDate: getNextBillingCycleDate(),
  phone: '',
  address: '',
  email: '',
  serviceType: 'RENTED',
  equipmentSerials: '',
  note: '',
  status: 'ACTIVE',
  planCost: 0,
  currency: 'USD'
};

export const Subscribers: React.FC = () => {
  const { subscribers, addSubscriber, updateSubscriber, executeMikrotikAction, mikrotikStatus } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);
  const [formData, setFormData] = useState<Subscriber>(emptySubscriber);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Messaging State
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [msgGroup, setMsgGroup] = useState<'REMINDER' | 'OVERDUE' | null>(null);

  const handleOpenAdd = () => {
    setEditingSub(null);
    setError(null);
    setFormData({ ...emptySubscriber, id: Date.now().toString(), cutOffDate: getNextBillingCycleDate() });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subscriber) => {
    setEditingSub(sub);
    setError(null);
    setFormData(sub);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Duplicate IP
    const duplicateIp = subscribers.find(s => 
      s.ip === formData.ip && 
      // If editing, exclude the current subscriber from the check
      (editingSub ? s.id !== editingSub.id : true)
    );

    if (duplicateIp) {
      setError(`¡ALERTA! La dirección IP ${formData.ip} ya está asignada al cliente: ${duplicateIp.fullName}`);
      return;
    }

    if (editingSub) {
      updateSubscriber(formData);
      showNotification('Suscriptor actualizado correctamente', 'success');
    } else {
      addSubscriber(formData);
      showNotification('Suscriptor agregado correctamente', 'success');
    }
    setIsModalOpen(false);
  };

  const showNotification = (msg: string, type: 'success' | 'error' | 'info') => {
      setNotification({ message: msg, type });
      setTimeout(() => setNotification(null), 4000);
  };

  const handleMassCut = async () => {
    const suspendedSubs = subscribers.filter(s => s.status === 'SUSPENDED');
    
    if (suspendedSubs.length === 0) {
      showNotification("No hay suscriptores suspendidos para generar corte.", 'info');
      return;
    }

    if (window.confirm(`CONFIRMACIÓN DE CORTE MASIVO\n\nSe detectaron ${suspendedSubs.length} clientes suspendidos.\n\n¿Desea generar el script y aplicar las reglas de bloqueo?`)) {
      
      // 1. Generate Clipboard Script (Robust for Terminal Paste)
      let script = `/ip firewall address-list\n`;
      script += `# Script de Corte Masivo generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
      suspendedSubs.forEach(sub => {
        // 'remove' line ensures we don't get "already exists" error if running manually line-by-line or in script
        script += `remove [find address=${sub.ip} list=SUSPENDED]\n`;
        script += `add list=SUSPENDED address=${sub.ip} comment="${sub.fullName} - Corte Masivo"\n`;
      });
      
      try {
        await navigator.clipboard.writeText(script);
        
        let message = `Script copiado al portapapeles (${suspendedSubs.length} IPs).`;
        
        // 2. Trigger Mikrotik Action via AppContext if connected
        if (mikrotikStatus === 'CONNECTED') {
            suspendedSubs.forEach(sub => {
                executeMikrotikAction(sub.ip, 'SUSPEND');
            });
            message = `¡ÉXITO! Bloqueo aplicado a ${suspendedSubs.length} IPs en el Router. Script respaldo copiado.`;
        } else {
             message += " (Router Desconectado: Ejecute el script manualmente).";
        }

        showNotification(message, 'success');

      } catch (err) {
        showNotification("Error al copiar al portapapeles.", 'error');
      }
    }
  };

  // --- MESSAGING LOGIC ---

  const getReminderTargets = () => {
      const today = startOfDay(new Date());
      const threeDaysFromNow = addDays(today, 3);
      
      return subscribers.filter(s => {
          if (s.status !== 'ACTIVE') return false;
          const cutOff = parseISO(s.cutOffDate);
          // Check if cutOff is between today and today + 3 days
          return isWithinInterval(cutOff, { start: today, end: threeDaysFromNow });
      });
  };

  const getOverdueTargets = () => {
      return subscribers.filter(s => s.status === 'SUSPENDED');
  };

  const generateMessageLink = (sub: Subscriber, type: 'REMINDER' | 'OVERDUE') => {
      let text = '';
      if (type === 'REMINDER') {
          text = `Hola ${sub.fullName}, recordatorio de W&S ISP. Su servicio de internet vence pronto el día ${sub.cutOffDate}. Monto a pagar: ${sub.planCost} ${sub.currency}. Por favor realice su pago para evitar interrupciones.`;
      } else {
          text = `Hola ${sub.fullName}, aviso de W&S ISP. Su servicio se encuentra SUSPENDIDO por falta de pago (Corte: ${sub.cutOffDate}). Monto pendiente: ${sub.planCost} ${sub.currency}. Por favor reporte su pago para reactivar el servicio.`;
      }
      
      const cleanPhone = sub.phone.replace(new RegExp('[^0-9]', 'g'), '');
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const reminderTargets = getReminderTargets();
  const overdueTargets = getOverdueTargets();
  
  const currentTargets = msgGroup === 'REMINDER' ? reminderTargets : msgGroup === 'OVERDUE' ? overdueTargets : [];

  const filteredSubscribers = subscribers.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.docId.includes(searchTerm) ||
    s.ip.includes(searchTerm)
  );

  const suspendedSubs = filteredSubscribers.filter(s => s.status === 'SUSPENDED');
  const activeSubs = filteredSubscribers.filter(s => s.status === 'ACTIVE');

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center transition-all transform animate-bounce ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 
            notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
        }`}>
            {notification.type === 'success' ? <CheckCircle size={24} className="mr-3" /> : <AlertTriangle size={24} className="mr-3" />}
            <div>
                <h4 className="font-bold uppercase text-xs">{notification.type === 'success' ? 'Éxito' : 'Aviso'}</h4>
                <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-80">
                <X size={18}/>
            </button>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-4 w-1/3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por IP, Cédula o Nombre..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex space-x-2">
           <button
            onClick={() => { setIsMsgModalOpen(true); setMsgGroup(null); }}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            title="Enviar recordatorios y avisos de cobro"
          >
            <MessageSquare size={20} />
            <span>Mensajería Masiva</span>
          </button>
           <button
            onClick={handleMassCut}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            title="Generar script y suspender morosos"
          >
            <Scissors size={20} />
            <span>Corte Masivo</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
          >
            <Plus size={20} />
            <span>Agregar Nuevo</span>
          </button>
        </div>
      </div>

      {/* Columns Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
        
        {/* Suspended Column */}
        <div className="bg-red-50 rounded-xl border border-red-100 flex flex-col h-full overflow-hidden shadow-sm">
          <div className="bg-red-100 p-3 border-b border-red-200 font-bold text-red-800 flex justify-between">
            <span>Suspendidos / Morosos</span>
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">{suspendedSubs.length}</span>
          </div>
          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {suspendedSubs.map(sub => {
              const days = differenceInDays(new Date(), parseISO(sub.cutOffDate));
              const isCritical = days > 60;
              return (
                <div key={sub.id} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-500 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-800">{sub.fullName}</h4>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isCritical ? 'bg-red-600 text-white' : 'bg-red-200 text-red-800'}`}>
                      {days > 0 ? `${days} días vencido` : 'Vencido'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{sub.ip}</p>
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => handleOpenEdit(sub)} className="text-gray-400 hover:text-blue-600">
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Column */}
        <div className="bg-green-50 rounded-xl border border-green-100 flex flex-col h-full overflow-hidden shadow-sm">
          <div className="bg-green-100 p-3 border-b border-green-200 font-bold text-green-800 flex justify-between">
            <span>Activos</span>
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">{activeSubs.length}</span>
          </div>
          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {activeSubs.map(sub => (
              <div key={sub.id} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-gray-800">{sub.fullName}</h4>
                  <CheckCircle size={16} className="text-green-500" />
                </div>
                <p className="text-sm text-gray-500">{sub.ip}</p>
                <div className="text-xs text-gray-500 mt-1">Corte: {sub.cutOffDate}</div>
                <div className="mt-2 flex justify-end">
                  <button onClick={() => handleOpenEdit(sub)} className="text-gray-400 hover:text-blue-600">
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total / All Column */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 flex flex-col h-full overflow-hidden shadow-sm">
          <div className="bg-blue-100 p-3 border-b border-blue-200 font-bold text-blue-800 flex justify-between">
            <span>Total Clientes</span>
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{filteredSubscribers.length}</span>
          </div>
          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {filteredSubscribers.map(sub => (
              <div key={sub.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between">
                  <h4 className="font-medium text-gray-700 text-sm truncate w-2/3">{sub.fullName}</h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">{sub.cutOffDate}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                   <p className="text-xs text-gray-400">{sub.ip}</p>
                   <button onClick={() => handleOpenEdit(sub)} className="text-blue-500 hover:text-blue-700 text-xs flex items-center">
                     <Edit size={12} className="mr-1"/> Editar
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mass Messaging Modal */}
      {isMsgModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-emerald-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-emerald-900 flex items-center">
                        <MessageSquare className="mr-2" /> Centro de Mensajería Masiva
                    </h3>
                    <button onClick={() => setIsMsgModalOpen(false)} className="text-gray-400 hover:text-emerald-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {!msgGroup ? (
                        /* Step 1: Selection */
                        <div className="space-y-6">
                            <p className="text-gray-600 text-center mb-4">Seleccione el grupo de destinatarios para generar los mensajes:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button 
                                    onClick={() => setMsgGroup('REMINDER')}
                                    className="p-6 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-400 transition-all text-left group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-yellow-800 text-lg">Próximos a Vencer</h4>
                                        <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">{reminderTargets.length}</span>
                                    </div>
                                    <p className="text-sm text-yellow-700">Clientes activos con fecha de corte en los próximos 3 días.</p>
                                    <p className="text-xs text-yellow-600 mt-2 font-semibold group-hover:underline">Enviar Recordatorio →</p>
                                </button>

                                <button 
                                    onClick={() => setMsgGroup('OVERDUE')}
                                    className="p-6 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all text-left group"
                                >
                                     <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-red-800 text-lg">Morosos / Suspendidos</h4>
                                        <span className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-bold">{overdueTargets.length}</span>
                                    </div>
                                    <p className="text-sm text-red-700">Clientes con servicio suspendido por falta de pago.</p>
                                    <p className="text-xs text-red-600 mt-2 font-semibold group-hover:underline">Enviar Aviso de Cobro →</p>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Confirmation & List */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-lg text-gray-800">
                                    {msgGroup === 'REMINDER' ? `Recordatorios (${reminderTargets.length})` : `Avisos de Cobro (${overdueTargets.length})`}
                                </h4>
                                <button onClick={() => setMsgGroup(null)} className="text-sm text-blue-600 hover:underline">
                                    ← Volver
                                </button>
                            </div>

                            {currentTargets.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500">No hay suscriptores en esta categoría actualmente.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800 mb-2">
                                        <strong>Nota:</strong> Para evitar bloqueos del navegador, por favor envíe los mensajes haciendo clic en el botón de cada suscriptor.
                                    </div>
                                    <div className="overflow-hidden border rounded-lg">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-3">Suscriptor</th>
                                                    <th className="p-3">Teléfono</th>
                                                    <th className="p-3">Monto</th>
                                                    <th className="p-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {currentTargets.map(sub => (
                                                    <tr key={sub.id} className="hover:bg-gray-50">
                                                        <td className="p-3">
                                                            <div className="font-medium">{sub.fullName}</div>
                                                            <div className="text-xs text-gray-500">Corte: {sub.cutOffDate}</div>
                                                        </td>
                                                        <td className="p-3 font-mono">{sub.phone}</td>
                                                        <td className="p-3">{sub.planCost} {sub.currency}</td>
                                                        <td className="p-3 text-right">
                                                            <a 
                                                                href={generateMessageLink(sub, msgGroup)} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="inline-flex items-center bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded transition-colors text-xs font-bold"
                                                            >
                                                                <MessageSquare size={14} className="mr-1"/> Enviar
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-slate-800">
                {editingSub ? 'Editar Suscriptor' : 'Agregar Nuevo Suscriptor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Duplicate IP Error Alert */}
              {error && (
                <div className="col-span-1 md:col-span-2 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2 rounded shadow-sm flex items-start animate-bounce">
                    <AlertTriangle className="mr-3 flex-shrink-0" size={24} />
                    <div className="font-bold">{error}</div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nombre y Apellido</label>
                <input required className="w-full border p-2 rounded" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Documento de Identidad</label>
                <input required className="w-full border p-2 rounded" value={formData.docId} onChange={e => setFormData({...formData, docId: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Dirección IP</label>
                <input 
                  required 
                  className={`w-full border p-2 rounded ${error ? 'border-red-500 bg-red-50' : ''}`}
                  value={formData.ip} 
                  onChange={e => {
                    setFormData({...formData, ip: e.target.value});
                    setError(null); // Clear error on change
                  }} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Fecha de Corte</label>
                <input type="date" required className="w-full border p-2 rounded" value={formData.cutOffDate} onChange={e => setFormData({...formData, cutOffDate: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Teléfono</label>
                <input required className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-sm font-medium text-gray-700">Dirección Domicilio</label>
                <input className="w-full border p-2 rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Condición del Servicio</label>
                <select className="w-full border p-2 rounded" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value as ServiceType})}>
                  <option value="RENTED">Alquilado</option>
                  <option value="OWNED">Propio</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Seriales Equipos</label>
                <input className="w-full border p-2 rounded" value={formData.equipmentSerials} onChange={e => setFormData({...formData, equipmentSerials: e.target.value})} />
              </div>
               <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Costo del Plan</label>
                <input type="number" className="w-full border p-2 rounded" value={formData.planCost} onChange={e => setFormData({...formData, planCost: Number(e.target.value)})} />
              </div>
               <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Moneda del Plan</label>
                 <select className="w-full border p-2 rounded" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value as Currency})}>
                  <option value="USD">USD</option>
                  <option value="COP">COP</option>
                  <option value="BS">BS</option>
                </select>
              </div>
              
              {editingSub && (
                <div className="space-y-1 bg-yellow-50 p-2 rounded border border-yellow-200">
                  <label className="text-sm font-bold text-yellow-800">Estado del Cliente</label>
                  <select className="w-full border p-2 rounded bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ServiceStatus})}>
                    <option value="ACTIVE">ACTIVO</option>
                    <option value="SUSPENDED">SUSPENDIDO</option>
                  </select>
                </div>
              )}

              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-sm font-medium text-gray-700">Nota</label>
                <textarea className="w-full border p-2 rounded" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>

              <div className="col-span-1 md:col-span-2 pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
