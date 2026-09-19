import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Percent,
  Receipt
} from 'lucide-react';
import { Transaction, Category, Language } from '../types';
import { translations } from '../constants/translations';
import { formatCurrency } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  lang: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  lang,
}) => {
  const t = translations[lang];

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filter transactions based on selected period
  const periodTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);

    return transactions.filter((tx) => {
      if (period === 'daily') {
        return tx.date === todayStr;
      }
      if (period === 'weekly') {
        const diff = (now.getTime() - new Date(tx.date).getTime()) / (1000 * 3600 * 24);
        return diff <= 7 && diff >= -1;
      }
      if (period === 'monthly') {
        return tx.date.startsWith(thisMonthStr);
      }
      return true;
    });
  }, [transactions, period]);

  // Totals for this period
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    periodTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });

    const net = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;
    
    // Average daily expense in period
    const daysInPeriod = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const avgDailyExpense = expense / daysInPeriod;

    return { income, expense, net, savingsRate, avgDailyExpense };
  }, [periodTransactions, period]);

  // Expenses grouped by Category
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();

    periodTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
      });

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId);
        const percent = totals.expense > 0 ? (amount / totals.expense) * 100 : 0;
        return {
          catId,
          cat,
          amount,
          percent: Math.round(percent),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, totals.expense, categoryMap]);

  // Income grouped by Category
  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();

    periodTransactions
      .filter((tx) => tx.type === 'income')
      .forEach((tx) => {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
      });

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId);
        const percent = totals.income > 0 ? (amount / totals.income) * 100 : 0;
        return {
          catId,
          cat,
          amount,
          percent: Math.round(percent),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, totals.income, categoryMap]);

  return (
    <div id="reports-view" className="space-y-6">
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t.reportsTitle}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {lang === 'th' ? 'สถิติและวิเคราะห์กระแสเงินสดตามช่วงเวลา' : 'Visual statistics and periodic breakdown'}
          </p>
        </div>

        {/* Period Segmented Toggle */}
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            id="period-daily-btn"
            onClick={() => setPeriod('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'daily'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.periodDaily}
          </button>
          <button
            id="period-weekly-btn"
            onClick={() => setPeriod('weekly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'weekly'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.periodWeekly}
          </button>
          <button
            id="period-monthly-btn"
            onClick={() => setPeriod('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'monthly'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.periodMonthly}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for the period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t.totalIncome}
          </span>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">
            +{formatCurrency(totals.income)}
          </div>
        </div>

        {/* Expense */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t.totalExpense}
          </span>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-2">
            -{formatCurrency(totals.expense)}
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t.savingsRate}
          </span>
          <div className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-2">
            {totals.savingsRate}%
          </div>
        </div>

        {/* Daily Average Expense */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t.averageDailyExpense}
          </span>
          <div className="text-2xl font-bold tracking-tight text-neutral-700 dark:text-neutral-300 mt-2">
            {formatCurrency(totals.avgDailyExpense)}
          </div>
        </div>
      </div>

      {/* Main Charts/Progress sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t.spendingByCategory}
            </h3>
            <span className="text-xs text-neutral-500">
              {expenseByCategory.length} {lang === 'th' ? 'หมวด' : 'categories'}
            </span>
          </div>

          {expenseByCategory.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              <Receipt size={32} className="mx-auto mb-2 opacity-40" />
              <p>{t.noExpenseDataInPeriod}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenseByCategory.map((item) => {
                const catName = item.cat 
                  ? (lang === 'th' ? item.cat.nameTh : item.cat.nameEn) 
                  : 'General';

                return (
                  <div key={item.catId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center text-white"
                          style={{ backgroundColor: item.cat?.color || '#64748b' }}
                        >
                          <CategoryIcon name={item.cat?.icon || 'Tag'} size={12} />
                        </div>
                        <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{catName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">{item.percent}%</span>
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.max(item.percent, 3)}%`,
                          backgroundColor: item.cat?.color || '#0284c7'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Income by Category */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t.incomeByCategory}
            </h3>
            <span className="text-xs text-neutral-500">
              {incomeByCategory.length} {lang === 'th' ? 'หมวด' : 'categories'}
            </span>
          </div>

          {incomeByCategory.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-40" />
              <p>{lang === 'th' ? 'ไม่มีข้อมูลรายรับในช่วงเวลานี้' : 'No income records found for this period'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomeByCategory.map((item) => {
                const catName = item.cat 
                  ? (lang === 'th' ? item.cat.nameTh : item.cat.nameEn) 
                  : 'General';

                return (
                  <div key={item.catId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center text-white"
                          style={{ backgroundColor: item.cat?.color || '#059669' }}
                        >
                          <CategoryIcon name={item.cat?.icon || 'Briefcase'} size={12} />
                        </div>
                        <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{catName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">{item.percent}%</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.max(item.percent, 3)}%`,
                          backgroundColor: item.cat?.color || '#059669'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
