
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, UserX, UserCheck, DollarSign, Wifi, WifiOff } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { subscribers, payments, mikrotikStatus, mikrotikConfig } = useApp();

  const metrics = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter(s => s.status === 'ACTIVE').length;
    const suspended = subscribers.filter(s => s.status === 'SUSPENDED').length;

    // Financials (Current Month)
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const currentMonthPayments = payments.filter(p => {
      const pDate = parseISO(p.date);
      return isWithinInterval(pDate, { start: monthStart, end: monthEnd });
    });

    const income = {
      BS: currentMonthPayments.filter(p => p.currency === 'BS').reduce((acc, curr) => acc + curr.amount, 0),
      COP: currentMonthPayments.filter(p => p.currency === 'COP').reduce((acc, curr) => acc + curr.amount, 0),
      USD: currentMonthPayments.filter(p => p.currency === 'USD').reduce((acc, curr) => acc + curr.amount, 0),
    };

    // Daily Income (Last 7 days)
    const dailyIncome = payments.reduce((acc, curr) => {
       const day = curr.date.split('T')[0];
       if (!acc[day]) acc[day] = { date: day, USD: 0, COP: 0, BS: 0 };
       acc[day][curr.currency] += curr.amount;
       return acc;
    }, {} as Record<string, any>);
    
    const chartData = Object.values(dailyIncome).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-7);

    // Monthly Income (Historical)
    const monthlyIncome = payments.reduce((acc, curr) => {
        const dateObj = parseISO(curr.date);
        const monthKey = format(dateObj, 'yyyy-MM'); // Sorting key
        const displayLabel = format(dateObj, 'MMM yyyy'); // Display label

        if (!acc[monthKey]) {
            acc[monthKey] = {
                month: displayLabel,
                sortKey: monthKey,
                USD: 0,
                COP: 0,
                BS: 0
            };
        }
        acc[monthKey][curr.currency] += curr.amount;
        return acc;
    }, {} as Record<string, any>);

    const monthlyChartData = Object.values(monthlyIncome).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));

    return { total, active, suspended, income, chartData, monthlyChartData };
  }, [subscribers, payments]);

  const pieData = [
    { name: 'Activos', value: metrics.active },
    { name: 'Suspendidos', value: metrics.suspended },
  ];
  const COLORS = ['#22c55e', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard General</h2>
        
        {/* Mikrotik Status Indicator */}
        <div className={`flex items-center px-4 py-2 rounded-full border shadow-sm ${
            mikrotikStatus === 'CONNECTED' ? 'bg-green-50 border-green-200 text-green-700' :
            mikrotikStatus === 'CONNECTING' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
            'bg-red-50 border-red-200 text-red-700'
        }`}>
            {mikrotikStatus === 'CONNECTED' ? <Wifi size={18} className="mr-2"/> : <WifiOff size={18} className="mr-2"/>}
            <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider">Mikrotik API</span>
                <span className="text-[10px] font-medium">
                    {mikrotikStatus === 'CONNECTED' ? `Conectado (${mikrotikConfig?.ip})` : 
                     mikrotikStatus === 'CONNECTING' ? 'Conectando...' : 'Desconectado'}
                </span>
            </div>
            <span className={`ml-3 w-3 h-3 rounded-full animate-pulse ${
                 mikrotikStatus === 'CONNECTED' ? 'bg-green-500' : 
                 mikrotikStatus === 'CONNECTING' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></span>
        </div>
      </div>
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 flex items-center">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Suscriptores</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 flex items-center">
          <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Activos</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.active}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500 flex items-center">
          <div className="p-3 bg-red-100 rounded-full text-red-600 mr-4">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Morosos / Suspendidos</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.suspended}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500 flex flex-col justify-center">
            <p className="text-sm text-gray-500 mb-1 flex items-center"><DollarSign size={14} /> Ingresos Mes Actual</p>
            <div className="text-xs font-semibold text-slate-700">USD: {metrics.income.USD.toFixed(2)}</div>
            <div className="text-xs font-semibold text-slate-700">BS: {metrics.income.BS.toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-700">COP: {metrics.income.COP.toLocaleString()}</div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Ingresos Diarios (Últimos 7 días activos)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="USD" fill="#3b82f6" name="USD" radius={[4, 4, 0, 0]} />
                <Bar dataKey="COP" fill="#10b981" name="COP" radius={[4, 4, 0, 0]} />
                <Bar dataKey="BS" fill="#eab308" name="BS" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
           <h3 className="text-lg font-semibold mb-4 text-slate-700">Distribución de Clientes</h3>
           <div className="h-72 flex justify-center items-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* New Monthly Income Chart */}
        <div className="col-span-1 lg:col-span-3 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Histórico de Ingresos Mensuales</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f8fafc' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                        <Bar dataKey="USD" fill="#3b82f6" name="Dólares (USD)" barSize={40} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="COP" fill="#10b981" name="Pesos (COP)" barSize={40} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="BS" fill="#eab308" name="Bolívares (BS)" barSize={40} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};
