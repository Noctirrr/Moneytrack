import { Transaction } from '../types';

export const getSampleTransactions = (): Transaction[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const formatDate = (d: number) => `${year}-${month}-${String(d).padStart(2, '0')}`;

  return [
    {
      id: 'sample-1',
      type: 'income',
      amount: 45000,
      categoryId: 'salary',
      date: formatDate(1),
      note: 'เงินเดือนประจำเดือน (Monthly Salary)',
      createdAt: Date.now() - 15 * 86400000,
    },
    {
      id: 'sample-2',
      type: 'expense',
      amount: 8500,
      categoryId: 'bills',
      date: formatDate(2),
      note: 'ค่าเช่าห้องและส่วนกลาง (Apartment Rent)',
      createdAt: Date.now() - 14 * 86400000,
    },
    {
      id: 'sample-3',
      type: 'expense',
      amount: 1450,
      categoryId: 'bills',
      date: formatDate(3),
      note: 'ค่าน้ำ-ค่าไฟ-อินเทอร์เน็ต (Utilities & WiFi)',
      createdAt: Date.now() - 13 * 86400000,
    },
    {
      id: 'sample-4',
      type: 'expense',
      amount: 180,
      categoryId: 'food',
      date: formatDate(5),
      note: 'อาหารกลางวัน + ชาเขียว (Lunch & Matcha)',
      createdAt: Date.now() - 11 * 86400000,
    },
    {
      id: 'sample-5',
      type: 'expense',
      amount: 65,
      categoryId: 'transportation',
      date: formatDate(6),
      note: 'BTS รถไฟฟ้าไปทำงาน (BTS Commute)',
      createdAt: Date.now() - 10 * 86400000,
    },
    {
      id: 'sample-6',
      type: 'expense',
      amount: 2200,
      categoryId: 'shopping',
      date: formatDate(8),
      note: 'ซื้อของใช้ในบ้านและซูเปอร์มาร์เก็ต (Groceries)',
      createdAt: Date.now() - 8 * 86400000,
    },
    {
      id: 'sample-7',
      type: 'income',
      amount: 6000,
      categoryId: 'bonus',
      date: formatDate(10),
      note: 'งานฟรีแลนซ์ออกแบบกราฟิก (Freelance Project)',
      createdAt: Date.now() - 6 * 86400000,
    },
    {
      id: 'sample-8',
      type: 'expense',
      amount: 450,
      categoryId: 'entertainment',
      date: formatDate(12),
      note: 'ดูภาพยนตร์วันหยุด (Cinema Tickets)',
      createdAt: Date.now() - 4 * 86400000,
    },
    {
      id: 'sample-9',
      type: 'expense',
      amount: 260,
      categoryId: 'food',
      date: formatDate(14),
      note: 'ส้มตำไก่ย่างมื้อเย็น (Dinner)',
      createdAt: Date.now() - 2 * 86400000,
    },
    {
      id: 'sample-10',
      type: 'income',
      amount: 1250,
      categoryId: 'investment',
      date: formatDate(15),
      note: 'เงินปันผลกองทุนรวม (Fund Dividend)',
      createdAt: Date.now() - 86400000,
    }
  ];
};
