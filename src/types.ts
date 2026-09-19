export type TransactionType = 'income' | 'expense';

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
