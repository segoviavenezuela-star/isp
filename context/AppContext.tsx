
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Subscriber, Payment, LogEntry, MikrotikConfig, User, UserRole, MikrotikStatus } from '../types';
import { MOCK_SUBSCRIBERS, MOCK_PAYMENTS, MOCK_LOGS } from '../constants';
import { isAfter, parseISO, addMonths, setDate, format, startOfDay, getDate } from 'date-fns';

// Initial Super Admin
const INITIAL_ADMIN: User = {
  id: '11755397',
  username: '11755397',
  password: 'Jenca45$', 
  fullName: 'Administrador Principal',
  role: 'SUPER_ADMIN'
};

interface AppContextType {
  currentUser: User | null;
  users: User[];
  subscribers: Subscriber[];
  payments: Payment[];
  logs: LogEntry[];
  mikrotikConfig: MikrotikConfig | null;
  mikrotikStatus: MikrotikStatus;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  updateUser: (user: User) => void;
  addSubscriber: (sub: Subscriber) => void;
  updateSubscriber: (sub: Subscriber) => void;
  addPayment: (payment: Payment, months?: number) => void;
  updatePayment: (payment: Payment) => void;
  addLog: (action: string, details: string) => void;
  setMikrotikConfig: (config: MikrotikConfig) => void;
  connectToMikrotik: (config: MikrotikConfig) => Promise<boolean>;
  executeMikrotikAction: (ip: string, action: 'SUSPEND' | 'ACTIVATE') => void;
  importData: (subs: Subscriber[], pays: Payment[]) => void;
  restoreDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ws_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ws_users');
    return saved ? JSON.parse(saved) : [INITIAL_ADMIN];
  });

  // App Data State
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    const saved = localStorage.getItem('ws_subscribers');
    return saved ? JSON.parse(saved) : MOCK_SUBSCRIBERS;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('ws_payments');
    return saved ? JSON.parse(saved) : MOCK_PAYMENTS;
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('ws_logs');
    return saved ? JSON.parse(saved) : MOCK_LOGS;
  });

  const [mikrotikConfig, setMikrotikConfigState] = useState<MikrotikConfig | null>(() => {
    const saved = localStorage.getItem('ws_mikrotik_config');
    return saved ? JSON.parse(saved) : null;
  });

  const [mikrotikStatus, setMikrotikStatus] = useState<MikrotikStatus>('DISCONNECTED');

  // Persistence
  useEffect(() => { localStorage.setItem('ws_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { 
    if (currentUser) localStorage.setItem('ws_current_user', JSON.stringify(currentUser)); 
    else localStorage.removeItem('ws_current_user');
  }, [currentUser]);
  useEffect(() => { localStorage.setItem('ws_subscribers', JSON.stringify(subscribers)); }, [subscribers]);
  useEffect(() => { localStorage.setItem('ws_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => {
    if (logs.length > 1000) setLogs(prev => prev.slice(0, 1000));
    localStorage.setItem('ws_logs', JSON.stringify(logs));
  }, [logs]);
  useEffect(() => {
    if (mikrotikConfig) localStorage.setItem('ws_mikrotik_config', JSON.stringify(mikrotikConfig));
  }, [mikrotikConfig]);

  // Try to reconnect on load if config exists
  useEffect(() => {
    if (mikrotikConfig && mikrotikStatus === 'DISCONNECTED') {
        // Simple auto-connect simulation
        setMikrotikStatus('CONNECTED');
    }
  }, [mikrotikConfig]);


  // --- MIKROTIK LOGIC ---
  
  const connectToMikrotik = async (config: MikrotikConfig): Promise<boolean> => {
    setMikrotikStatus('CONNECTING');
    
    // NOTE: In a real browser environment, we cannot connect directly to Port 8728 (TCP) due to security.
    // We would normally use the Mikrotik REST API (v7+) over HTTP/HTTPS.
    // Here we simulate the network handshake and authentication latency.
    
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulation: Success if IP is not empty
            if (config.ip && config.user) {
                setMikrotikConfigState(config);
                setMikrotikStatus('CONNECTED');
                addLog('MIKROTIK', `Conectado exitosamente a RouterOS en ${config.ip}`);
                resolve(true);
            } else {
                setMikrotikStatus('ERROR');
                addLog('MIKROTIK', `Error de conexión: Credenciales inválidas`);
                resolve(false);
            }
        }, 1500);
    });
  };

  const executeMikrotikAction = (ip: string, action: 'SUSPEND' | 'ACTIVATE') => {
      if (mikrotikStatus !== 'CONNECTED') return;

      // Logic "Simulator" for RouterOS
      // 1. SUSPEND: /ip firewall address-list add list=SUSPENDED address=X.X.X.X
      // 2. ACTIVATE: /ip firewall address-list remove [find address=X.X.X.X list=SUSPENDED]
      
      const cmd = action === 'SUSPEND' 
        ? `/ip firewall address-list add list=SUSPENDED address=${ip} comment="Moroso App"` 
        : `/ip firewall address-list remove [find address=${ip} list=SUSPENDED]`;
      
      console.log(`[MIKROTIK SEND]: ${cmd}`);
      // Here we would do: await fetch(`http://${config.ip}/rest/ip/firewall/address-list...`)
  };

  // --- AUTOMATIC CYCLE & STATUS CHECK LOGIC ---
  const checkServiceStatus = useCallback(() => {
    const today = startOfDay(new Date());
    let hasChanges = false;
    const updatedSubscribers = [...subscribers];

    updatedSubscribers.forEach((sub, index) => {
      const cutOff = parseISO(sub.cutOffDate);
      
      // AUTO SUSPEND
      if (isAfter(today, cutOff) && sub.status === 'ACTIVE') {
        hasChanges = true;
        updatedSubscribers[index] = { ...sub, status: 'SUSPENDED' };
        addLog('AUTO_SUSPEND', `Cliente ${sub.fullName} (${sub.ip}) suspendido por corte vencido.`);
        executeMikrotikAction(sub.ip, 'SUSPEND');
      }
      
      // Note: We don't auto-activate if date is future but status is suspended, 
      // because maybe they paid but admin wants manual control, or maybe we do.
      // Per request logic: "change date -> status active". That happens in updateSubscriber/addPayment.
    });

    if (hasChanges) {
      setSubscribers(updatedSubscribers);
    }
  }, [subscribers, mikrotikStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkServiceStatus();
    }, 2000); // Check every few seconds
    return () => clearTimeout(timer);
  }, [subscribers.length, checkServiceStatus]); 


  // Auth Methods
  const login = (username: string, pass: string): boolean => {
    const user = users.find(u => u.username === username && u.password === pass);
    if (user) {
      setCurrentUser(user);
      addLog('LOGIN', `User ${user.username} logged in`);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser) addLog('LOGOUT', `User ${currentUser.username} logged out`);
    setCurrentUser(null);
  };

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
    addLog('ADD_USER', `Created user ${user.username} (${user.role})`);
  };

  const deleteUser = (userId: string) => {
    if (userId === '11755397') return; 
    setUsers(prev => prev.filter(u => u.id !== userId));
    addLog('DELETE_USER', `Deleted user ID ${userId}`);
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    addLog('UPDATE_USER', `Updated user ${updatedUser.username}`);
  };

  // Logging Helper
  const addLog = (action: string, details: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: new Date().toISOString(),
      user: currentUser ? currentUser.username : 'System'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Data Methods
  const addSubscriber = (sub: Subscriber) => {
    setSubscribers(prev => [...prev, sub]);
    addLog('ADD_SUBSCRIBER', `Added subscriber ${sub.fullName}`);
    // If created as active, ensure access
    if (sub.status === 'ACTIVE') executeMikrotikAction(sub.ip, 'ACTIVATE');
  };

  const updateSubscriber = (updatedSub: Subscriber) => {
    // Check if status changed to trigger Mikrotik
    const oldSub = subscribers.find(s => s.id === updatedSub.id);
    if (oldSub && oldSub.status !== updatedSub.status) {
        if (updatedSub.status === 'ACTIVE') {
            executeMikrotikAction(updatedSub.ip, 'ACTIVATE');
        } else {
            executeMikrotikAction(updatedSub.ip, 'SUSPEND');
        }
    }
    // Check if date changed manually to a future date
    if (oldSub && updatedSub.cutOffDate !== oldSub.cutOffDate && updatedSub.status === 'ACTIVE') {
         // Re-enforce activation if date moved
         executeMikrotikAction(updatedSub.ip, 'ACTIVATE');
    }

    setSubscribers(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    addLog('UPDATE_SUBSCRIBER', `Updated subscriber ${updatedSub.fullName}`);
  };

  const addPayment = (payment: Payment, months: number = 1) => {
    setPayments(prev => [payment, ...prev]);
    
    const sub = subscribers.find(s => s.id === payment.subscriberId);
    if (sub) {
      const currentCutOff = parseISO(sub.cutOffDate);
      const today = new Date();
      
      const isAdvance = isAfter(currentCutOff, today) && sub.status === 'ACTIVE';
      const baseDate = isAdvance ? currentCutOff : today;
      const preferredDay = getDate(parseISO(sub.cutOffDate)); 

      const nextMonthDate = addMonths(baseDate, months);
      const nextCutOffDate = setDate(nextMonthDate, preferredDay);
      const formattedNextCutOff = format(nextCutOffDate, 'yyyy-MM-dd');

      const updatedSub = { 
        ...sub, 
        status: 'ACTIVE' as const,
        cutOffDate: formattedNextCutOff 
      };
      
      updateSubscriber(updatedSub);
      // Explicitly trigger activation on payment
      executeMikrotikAction(sub.ip, 'ACTIVATE'); 
      
      addLog('AUTO_RENEW', `Subscriber ${sub.fullName} renewed. Cycle Day: ${preferredDay}. New Cutoff: ${formattedNextCutOff}`);
    }
    
    addLog('ADD_PAYMENT', `Received payment of ${payment.amount} ${payment.currency} from ${payment.subscriberName}. Desc: ${payment.description || 'N/A'}`);
  };

  const updatePayment = (updatedPayment: Payment) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
    addLog('UPDATE_PAYMENT', `Updated payment for ${updatedPayment.subscriberName}: ${updatedPayment.amount} ${updatedPayment.currency}`);
  };

  const setMikrotikConfig = (config: MikrotikConfig) => {
    setMikrotikConfigState(config);
  };

  const importData = (subs: Subscriber[], pays: Payment[]) => {
    setSubscribers(subs);
    setPayments(pays);
    addLog('DATA_IMPORT', 'Imported data from JSON');
  };

  const restoreDefaults = () => {
      setSubscribers(MOCK_SUBSCRIBERS);
      setPayments(MOCK_PAYMENTS);
      addLog('RESTORE_DEFAULTS', 'Restored default mock data');
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      subscribers,
      payments,
      logs,
      mikrotikConfig,
      mikrotikStatus,
      login,
      logout,
      addUser,
      deleteUser,
      updateUser,
      addSubscriber,
      updateSubscriber,
      addPayment,
      updatePayment,
      addLog,
      setMikrotikConfig,
      connectToMikrotik,
      executeMikrotikAction,
      importData,
      restoreDefaults
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
