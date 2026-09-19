import { Wallet } from '../types';

export const DEFAULT_WALLETS: Wallet[] = [
  {
    id: 'wallet-cash',
    name: 'เงินสด',
    type: 'cash',
    initialBalance: 0,
    color: '#10b981',
    icon: 'Banknote',
    isDefault: true,
    createdAt: 1700000000000,
  },
  {
    id: 'wallet-bank',
    name: 'บัญชีธนาคารหลัก',
    type: 'bank',
    initialBalance: 0,
    color: '#0284c7',
    icon: 'Building2',
    accountNumber: '••• 8899',
    createdAt: 1700000001000,
  },
  {
    id: 'wallet-savings',
    name: 'บัญชีเงินออม',
    type: 'savings',
    initialBalance: 0,
    color: '#8b5cf6',
    icon: 'PiggyBank',
    createdAt: 1700000002000,
  },
];
