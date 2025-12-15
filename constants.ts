import { Subscriber, Payment, LogEntry } from './types';

export const MOCK_SUBSCRIBERS: Subscriber[] = [
  {
    id: '1',
    fullName: 'Juan Pérez',
    docId: 'V-12345678',
    ip: '192.168.10.20',
    cutOffDate: '2023-10-01', // Old date, suspended
    phone: '+584121234567',
    address: 'Calle 5, Casa 20',
    email: 'juan@example.com',
    serviceType: 'RENTED',
    equipmentSerials: 'SN-999888',
    note: 'Buen cliente',
    status: 'SUSPENDED',
    planCost: 30,
    currency: 'USD'
  },
  {
    id: '2',
    fullName: 'Maria Rodriguez',
    docId: 'V-87654321',
    ip: '192.168.10.21',
    cutOffDate: '2024-12-01',
    phone: '+573001234567',
    address: 'Av Bolivar',
    email: 'maria@example.com',
    serviceType: 'OWNED',
    equipmentSerials: 'SN-777666',
    note: '',
    status: 'ACTIVE',
    planCost: 50000,
    currency: 'COP'
  },
  {
    id: '3',
    fullName: 'Carlos Gomez',
    docId: 'V-11223344',
    ip: '192.168.10.22',
    cutOffDate: '2023-08-15', // Very old, > 60 days
    phone: '+584149998877',
    address: 'Sector 3',
    email: 'carlos@example.com',
    serviceType: 'RENTED',
    equipmentSerials: 'SN-555444',
    note: 'Debe instalación',
    status: 'SUSPENDED',
    planCost: 35,
    currency: 'USD'
  }
];

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'p1',
    subscriberId: '2',
    subscriberName: 'Maria Rodriguez',
    subscriberIp: '192.168.10.21',
    amount: 50000,
    currency: 'COP',
    date: '2023-11-01T10:00:00Z'
  }
];

export const MOCK_LOGS: LogEntry[] = [
  {
    id: 'l1',
    action: 'SYSTEM_INIT',
    details: 'System started',
    timestamp: new Date().toISOString(),
    user: 'admin'
  }
];
