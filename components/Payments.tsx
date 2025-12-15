
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Subscriber, Currency, Payment } from '../types';
import { Search, DollarSign, Send, Printer, Edit, X, Save, CheckCircle, Calendar, Lock, FileText } from 'lucide-react';
import { format, parseISO, addMonths, isAfter } from 'date-fns';

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const Payments: React.FC = () => {
  const { subscribers, payments, addPayment, updatePayment, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [notification, setNotification] = useState<string | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  
  // New State for Advance Payment
  const [monthsToPay, setMonthsToPay] = useState<number>(1);
  const [paymentDescription, setPaymentDescription] = useState<string>('');

  // Edit State
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  
  // Ticket Printing State
  const [ticketData, setTicketData] = useState<Payment | null>(null);

  const handleSearch = () => {
    const found = subscribers.find(s => 
      s.docId === searchTerm || s.ip === searchTerm || s.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSelectedSub(found || null);
    if (found) {
        setAmount(found.planCost);
        setCurrency(found.currency);
        setMonthsToPay(1); // Reset to 1 on new search
    }
  };

  // Auto-calculate amount and description when months or sub changes
  useEffect(() => {
    if (selectedSub) {
        // Calculate Total
        setAmount(selectedSub.planCost * monthsToPay);

        // Calculate Description
        const currentCutOff = parseISO(selectedSub.cutOffDate);
        const today = new Date();
        const isAdvance = isAfter(currentCutOff, today) && selectedSub.status === 'ACTIVE';
        const baseDate = isAdvance ? currentCutOff : today;

        const descriptions = [];
        for (let i = 0; i < monthsToPay; i++) {
            const targetDate = addMonths(baseDate, i);
            const monthIndex = targetDate.getMonth();
            const year = targetDate.getFullYear();
            const type = (isAdvance || i > 0) ? 'Adelanto' : 'Mensualidad';
            descriptions.push(`${type}: ${MONTH_NAMES[monthIndex]} ${year}`);
        }
        setPaymentDescription(descriptions.join(' / '));
    }
  }, [monthsToPay, selectedSub]);

  const handleLoadPayment = () => {
    if (!selectedSub || amount <= 0) return;

    const newPayment: Payment = {
      id: Date.now().toString(),
      subscriberId: selectedSub.id,
      subscriberName: selectedSub.fullName,
      subscriberIp: selectedSub.ip,
      amount: amount,
      currency: currency,
      date: new Date().toISOString(),
      description: paymentDescription
    };

    addPayment(newPayment, monthsToPay);
    
    setLastPaymentId(newPayment.id);
    setNotification(`Pago registrado correctamente.`);
    // Don't auto-clear notification quickly if we want them to click print
    setTimeout(() => {
        setNotification(null);
        setLastPaymentId(null);
    }, 8000);

    setSelectedSub(null);
    setSearchTerm('');
    setAmount(0);
    setMonthsToPay(1);
  };

  const sendWhatsApp = (payment?: Payment) => {
    const sub = payment ? subscribers.find(s => s.id === payment.subscriberId) : selectedSub;
    const payData = payment || { amount, currency, date: new Date().toISOString() };
    const desc = payment?.description || paymentDescription;
    
    if (!sub) return;

    const message = `Hola ${sub.fullName} (${sub.docId}).\n` +
      `Confirmamos su pago de: ${payData.amount} ${payData.currency}.\n` +
      `Concepto: ${desc}\n` +
      `Gracias por su pago. W&S ISP.`;

    const cleanPhone = sub.phone.replace(new RegExp('[^0-9]', 'g'), '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security Check
    if (currentUser?.role !== 'SUPER_ADMIN') {
        setNotification('Acceso Denegado: Solo Super Admin puede editar pagos.');
        setTimeout(() => setNotification(null), 3000);
        return;
    }

    if (editingPayment) {
        updatePayment(editingPayment);
        setEditingPayment(null);
        setNotification('Pago actualizado correctamente.');
        setTimeout(() => setNotification(null), 3000);
    }
  };

  const handlePrintReport = () => {
    setTicketData(null); // Ensure we are not in ticket mode
    setTimeout(() => window.print(), 100);
  };

  const handlePrintTicket = (payment: Payment) => {
      setTicketData(payment);
      setTimeout(() => {
          window.print();
          // Optional: Clear ticket data after print dialog closes (though JS halts during print dialog)
          // setTicketData(null); 
      }, 100);
  };

  const handlePrintLastTicket = () => {
      if (lastPaymentId) {
          const pay = payments.find(p => p.id === lastPaymentId);
          if (pay) handlePrintTicket(pay);
      }
  };

  const totalBS = payments.filter(p => p.currency === 'BS').reduce((acc, curr) => acc + curr.amount, 0);
  const totalCOP = payments.filter(p => p.currency === 'COP').reduce((acc, curr) => acc + curr.amount, 0);
  const totalUSD = payments.filter(p => p.currency === 'USD').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex flex-col items-start transition-all transform hover:scale-105 print:hidden">
            <div className="flex items-center w-full mb-2">
                <CheckCircle size={24} className="mr-3" />
                <div className="flex-1">
                    <h4 className="font-bold">Éxito</h4>
                    <p className="text-sm">{notification}</p>
                </div>
                <button onClick={() => setNotification(null)} className="ml-4 hover:text-emerald-200">
                    <X size={18}/>
                </button>
            </div>
            {lastPaymentId && (
                <button 
                    onClick={handlePrintLastTicket}
                    className="w-full bg-white text-emerald-700 py-1.5 px-3 rounded text-sm font-bold flex items-center justify-center hover:bg-emerald-50"
                >
                    <Printer size={16} className="mr-2"/> Imprimir Ticket
                </button>
            )}
        </div>
      )}

      {/* Report Header (Visible ONLY on print AND when NOT printing a specific ticket) */}
      <div className={`hidden print:block mb-6 text-center border-b-2 border-slate-900 pb-4 ${ticketData ? 'print:hidden' : ''}`}>
          <div className="flex justify-between items-end mb-2">
            <div className="text-left">
                 <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">W&S Service Provider</h1>
                 <p className="text-xs text-gray-600">Gestión de Servicios ISP</p>
            </div>
            <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800">REPORTE DE CAJA</h2>
                <p className="text-sm text-slate-600">Fecha de emisión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
      </div>

      {/* Payment Loading Section (Hidden on print) */}
      <div className="bg-white p-6 rounded-xl shadow-md print:hidden">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <DollarSign className="mr-2" /> Cargar Pago a Suscriptor
        </h2>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
             <input
              type="text"
              placeholder="Buscar por Nombre, ID o IP..."
              className="w-full pl-4 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="absolute right-2 top-2 bg-blue-100 p-1.5 rounded text-blue-600 hover:bg-blue-200">
               <Search size={20} />
            </button>
          </div>
        </div>

        {selectedSub && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                    <p className="text-xs text-gray-500 uppercase">Suscriptor</p>
                    <p className="font-bold text-gray-800">{selectedSub.fullName}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase">Documento</p>
                    <p className="font-bold text-gray-800">{selectedSub.docId}</p>
                </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase">IP</p>
                    <p className="font-bold text-gray-800">{selectedSub.ip}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase">Renta Base</p>
                    <p className="font-bold text-blue-600">{selectedSub.planCost} {selectedSub.currency}</p>
                </div>
             </div>

             <div className="flex flex-wrap items-end gap-4 border-t border-blue-200 pt-4">
                <div className="w-40">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                       <Calendar size={14} className="mr-1"/> Meses a Pagar
                    </label>
                    <select 
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                      value={monthsToPay}
                      onChange={(e) => setMonthsToPay(Number(e.target.value))}
                    >
                        <option value={1}>1 Mes</option>
                        <option value={2}>2 Meses (Adelanto)</option>
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Automática)</label>
                    <input 
                      type="text" 
                      readOnly
                      className="w-full border p-2 rounded bg-gray-100 text-gray-600 italic text-sm"
                      value={paymentDescription}
                    />
                </div>

                <div className="w-40">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total</label>
                    <input 
                      type="number" 
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 font-bold"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                </div>
                <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select 
                      className="w-full border p-2 rounded"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                    >
                        <option value="BS">BS</option>
                        <option value="COP">COP</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
                <button 
                  onClick={handleLoadPayment}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded font-medium shadow transition-colors h-11"
                >
                  Cargar Pago
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Caja / History Section - Hidden when printing a specific Ticket */}
      <div className={`bg-white rounded-xl shadow-md flex-1 flex flex-col overflow-hidden print:shadow-none print:overflow-visible print:h-auto ${ticketData ? 'print:hidden' : ''}`}>
         <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 print:hidden">
             <h3 className="text-lg font-bold text-gray-800">Caja (Historial de Pagos)</h3>
             <button onClick={handlePrintReport} className="flex items-center bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 transition-colors shadow-sm">
                 <FileText size={18} className="mr-2"/> Imprimir Reporte General
             </button>
         </div>
         
         <div className="overflow-y-auto flex-1 p-4 print:overflow-visible print:h-auto print:p-0">
            <table className="w-full text-left print:text-black text-sm">
                <thead>
                    <tr className="text-gray-500 border-b border-gray-200 print:text-black print:border-black bg-gray-50 print:bg-transparent">
                        <th className="py-2 px-2 font-bold uppercase text-xs">Fecha</th>
                        <th className="py-2 px-2 font-bold uppercase text-xs">Cliente</th>
                        <th className="py-2 px-2 font-bold uppercase text-xs">Descripción</th>
                        <th className="py-2 px-2 font-bold uppercase text-xs text-right">Monto</th>
                        <th className="py-2 px-2 font-bold text-right print:hidden uppercase text-xs">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                    {payments.slice().reverse().map(pay => (
                        <tr key={pay.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                            <td className="py-3 px-2 whitespace-nowrap align-top font-mono">{format(parseISO(pay.date), 'dd/MM/yyyy HH:mm')}</td>
                            <td className="py-3 px-2 text-gray-600 print:text-black align-top">
                                <div className="font-bold text-gray-800">{pay.subscriberName}</div>
                                <div className="text-xs">{pay.subscriberIp}</div>
                            </td>
                            <td className="py-3 px-2 text-gray-600 align-top max-w-xs">
                                {pay.description || <span className="text-gray-400 italic">Pago estándar</span>}
                            </td>
                            <td className="py-3 px-2 font-bold text-gray-800 print:text-black align-top whitespace-nowrap text-right">{pay.amount.toLocaleString()} {pay.currency}</td>
                            <td className="py-3 px-2 text-right print:hidden align-top">
                                <div className="flex justify-end space-x-2">
                                  <button 
                                    onClick={() => handlePrintTicket(pay)}
                                    className="text-gray-600 hover:text-gray-900 p-1 bg-gray-100 rounded"
                                    title="Imprimir Ticket (Recibo)"
                                  >
                                      <Printer size={16} />
                                  </button>

                                  {/* EDIT BUTTON RESTRICTED TO SUPER ADMIN */}
                                  {currentUser?.role === 'SUPER_ADMIN' ? (
                                    <button
                                        onClick={() => setEditingPayment(pay)}
                                        className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded"
                                        title="Editar Pago (Solo Super Admin)"
                                    >
                                        <Edit size={16} />
                                    </button>
                                  ) : (
                                    <span className="text-gray-300 p-1" title="Edición Restringida"><Lock size={14}/></span>
                                  )}

                                  <button 
                                    onClick={() => sendWhatsApp(pay)}
                                    className="text-green-500 hover:text-green-700 p-1 bg-green-50 rounded"
                                    title="Enviar Recibo WhatsApp"
                                  >
                                      <Send size={16} />
                                  </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>

         {/* Summary Footer */}
         <div className="bg-slate-900 text-white p-6 grid grid-cols-3 gap-6 print:bg-white print:text-black print:border-t-2 print:border-black print:mt-4 print:p-2">
             <div className="text-center print:text-left print:border-b print:border-gray-300 print:pb-2">
                 <p className="text-slate-400 text-xs uppercase tracking-wide print:text-black print:font-bold">Total USD</p>
                 <p className="text-2xl font-bold">${totalUSD.toFixed(2)}</p>
             </div>
             <div className="text-center border-l border-slate-700 print:border-l-0 print:border-b print:border-gray-300 print:pb-2 print:text-left">
                 <p className="text-slate-400 text-xs uppercase tracking-wide print:text-black print:font-bold">Total COP</p>
                 <p className="text-2xl font-bold">${totalCOP.toLocaleString()}</p>
             </div>
             <div className="text-center border-l border-slate-700 print:border-l-0 print:border-b print:border-gray-300 print:pb-2 print:text-left">
                 <p className="text-slate-400 text-xs uppercase tracking-wide print:text-black print:font-bold">Total BS</p>
                 <p className="text-2xl font-bold">Bs {totalBS.toLocaleString()}</p>
             </div>
         </div>

         {/* Signature Section - Visible ONLY on Print (Report Mode) */}
         <div className={`hidden print:flex mt-12 justify-between px-8 text-black ${ticketData ? 'print:hidden' : ''}`}>
             <div className="text-center border-t border-black w-1/3 pt-2">
                 <p className="text-sm font-bold">Elaborado por</p>
                 <p className="text-xs text-gray-600">Firma y Sello</p>
             </div>
             <div className="text-center border-t border-black w-1/3 pt-2">
                 <p className="text-sm font-bold">Conforme</p>
                 <p className="text-xs text-gray-600">Auditoría / Administración</p>
             </div>
         </div>
      </div>

      {/* TICKET TEMPLATE - Visible ONLY when printing a ticket */}
      {ticketData && (
          <div className="hidden print:block fixed top-0 left-0 w-full h-full bg-white z-[9999] p-4 font-mono text-black">
              <div className="max-w-[80mm] mx-auto">
                  <div className="text-center mb-4">
                      <h1 className="text-xl font-bold uppercase">W&S ISP</h1>
                      <p className="text-xs">Proveedor de Servicios de Internet</p>
                      <p className="text-xs">RIF: J-12345678-9</p>
                      <p className="text-xs mt-1">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                  </div>
                  
                  <div className="border-b border-black border-dashed my-2"></div>
                  
                  <div className="text-xs space-y-1 mb-2">
                      <p><strong>Recibo #:</strong> {ticketData.id.slice(-6)}</p>
                      <p><strong>Cliente:</strong> {ticketData.subscriberName}</p>
                      <p><strong>CI/RIF:</strong> {subscribers.find(s => s.id === ticketData.subscriberId)?.docId || 'N/A'}</p>
                      <p><strong>IP:</strong> {ticketData.subscriberIp}</p>
                  </div>

                  <div className="border-b border-black border-dashed my-2"></div>

                  <div className="text-xs mb-2">
                      <p className="font-bold">Concepto:</p>
                      <p>{ticketData.description}</p>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold border-t border-b border-black border-dashed py-2 my-2">
                      <span>TOTAL PAGADO:</span>
                      <span>{ticketData.amount.toLocaleString()} {ticketData.currency}</span>
                  </div>

                  <div className="mt-8 pt-2 border-t border-black">
                      <p className="text-center text-xs">Firma Autorizada</p>
                  </div>

                  <div className="mt-6 text-center text-[10px]">
                      <p>¡Gracias por su pago!</p>
                      <p>Conserve este ticket como comprobante.</p>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-gray-800">Editar Pago</h3>
                    <button onClick={() => setEditingPayment(null)} className="text-gray-400 hover:text-red-500">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Suscriptor</p>
                        <p className="font-semibold">{editingPayment.subscriberName}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <input 
                            type="text" 
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={editingPayment.description || ''}
                            onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora</label>
                        <input 
                            type="datetime-local" 
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={format(parseISO(editingPayment.date), "yyyy-MM-dd'T'HH:mm")}
                            onChange={(e) => setEditingPayment({ ...editingPayment, date: new Date(e.target.value).toISOString() })}
                            required
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                         <input 
                            type="number"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={editingPayment.amount}
                            onChange={(e) => setEditingPayment({ ...editingPayment, amount: Number(e.target.value) })}
                            required
                         />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                         <select 
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={editingPayment.currency}
                            onChange={(e) => setEditingPayment({ ...editingPayment, currency: e.target.value as Currency })}
                        >
                            <option value="BS">BS</option>
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button 
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium"
                        >
                            <Save size={18} className="mr-2" /> Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
