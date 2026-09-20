export type TransactionType = 'income' | 'expense' | 'transfer';

export type WalletType = 'cash' | 'bank' | 'savings' | 'credit' | 'e-wallet';

export interface Wallet {
  id: string;
  userId?: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  color: string;
  icon?: string;
  accountNumber?: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export type BudgetPeriod = 'monthly';

export interface Budget {
  id: string;
  userId?: string;
  categoryId?: string; // If undefined or 'total' => Total Monthly Budget limit
  amount: number; // Limit amount
  period: BudgetPeriod;
  monthKey: string; // "YYYY-MM" or "all"
  alertThreshold?: number; // e.g. 80 (80%)
  createdAt: number;
  updatedAt?: number;
}

export interface Category {
  id: string;
  nameTh: string;
  nameEn: string;
  type: TransactionType | 'both';
  icon: string; // Lucide icon key
  color: string; // Tailwind color token or hex
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName?: string;
  walletId?: string; // Source wallet (where money moves out, or received in)
  toWalletId?: string; // Destination wallet for transfers
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export type Language = 'th' | 'en';
export type ThemeMode = 'light' | 'dark';

export interface UserSettings {
  language: Language;
  currency: string;
  theme: ThemeMode;
}

export interface SystemAnnouncement {
  isActive: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  updatedAt?: number;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  appName?: string;
  updatedAt?: number;
}

export interface SystemAdminUser {
  email: string;
  addedAt: number;
  addedBy?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastLoginAt: number;
}

export type BugReportStatus = 'pending' | 'investigating' | 'resolved';
export type BugReportType = 'bug' | 'calculation' | 'ui' | 'feature' | 'other';

export interface BugReport {
  id: string;
  message: string;
  reportType?: BugReportType;
  status: BugReportStatus;
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  deviceInfo?: string;
  language?: string;
  adminResponse?: string;
  createdAt: number;
  updatedAt?: number;
}
