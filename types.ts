

export type Currency = 'BS' | 'COP' | 'USD';
export type ServiceStatus = 'ACTIVE' | 'SUSPENDED';
export type ServiceType = 'OWNED' | 'RENTED';

// Roles: 1 = Super Admin, 2 = Admin, 3 = Standard/Viewer
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STANDARD'; 

export type MikrotikStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface User {
  id: string; // Document ID (e.g., 11755397)
  username: string; // Usually the Document ID or name
  password: string; 
  fullName: string;
  role: UserRole;
}

export interface Subscriber {
  id: string;
  fullName: string;
  docId: string;
  ip: string;
  cutOffDate: string; // ISO Date string
  phone: string;
  address: string;
  email: string;
  serviceType: ServiceType;
  equipmentSerials: string;
  note: string;
  status: ServiceStatus;
  planCost: number;
  currency: Currency;
}

export interface Payment {
  id: string;
  subscriberId: string;
  subscriberName: string;
  subscriberIp: string;
  amount: number;
  currency: Currency;
  date: string; // ISO Date string
  description?: string;
}

export interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user: string;
}

export interface MikrotikConfig {
  ip: string;
  user: string;
  pass: string;
  port: number;
}