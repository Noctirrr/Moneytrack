import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food',
    nameTh: 'อาหารและเครื่องดื่ม',
    nameEn: 'Food & Drinks',
    type: 'expense',
    icon: 'Utensils',
    color: '#0284c7', // Sky
  },
  {
    id: 'transportation',
    nameTh: 'การเดินทาง',
    nameEn: 'Transportation',
    type: 'expense',
    icon: 'Car',
    color: '#64748b', // Slate
  },
  {
    id: 'shopping',
    nameTh: 'ช้อปปิ้ง',
    nameEn: 'Shopping',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#0d9488', // Teal
  },
  {
    id: 'bills',
    nameTh: 'บิลและค่าใช้จ่าย',
    nameEn: 'Bills & Utilities',
    type: 'expense',
    icon: 'Receipt',
    color: '#475569', // Slate dark
  },
  {
    id: 'entertainment',
    nameTh: 'ความบันเทิง',
    nameEn: 'Entertainment',
    type: 'expense',
    icon: 'Tv',
    color: '#4f46e5', // Indigo
  },
  {
    id: 'salary',
    nameTh: 'เงินเดือน',
    nameEn: 'Salary',
    type: 'income',
    icon: 'Briefcase',
    color: '#059669', // Emerald
  },
  {
    id: 'bonus',
    nameTh: 'โบนัสและรายได้พิเศษ',
    nameEn: 'Bonus & Extra',
    type: 'income',
    icon: 'Award',
    color: '#0891b2', // Cyan
  },
  {
    id: 'investment',
    nameTh: 'เงินปันผล/การลงทุน',
    nameEn: 'Investment',
    type: 'income',
    icon: 'TrendingUp',
    color: '#16a34a', // Green
  },
  {
    id: 'other',
    nameTh: 'อื่นๆ',
    nameEn: 'Other',
    type: 'both',
    icon: 'MoreHorizontal',
    color: '#71717a', // Zinc
  },
];
