import React, { useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  PiggyBank, 
  Plus, 
  ReceiptText, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  FileDown
} from 'lucide-react';
import { Transaction, Category, Language } from '../types';
import { translations } from '../constants/translations';
import { formatCurrency, formatDateDisplay } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  lang: Language;
  onNavigate: (tab: string) => void;
  onQuickAdd: () => void;
  onEditTransaction: (item: Transaction) => void;
  onOpenPdfExport?: () => void;
  user?: User | null;
  onSignIn?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  lang,
  onNavigate,
  onQuickAdd,
  onEditTransaction,
  onOpenPdfExport,
  user,
  onSignIn,
}) => {
  const t = translations[lang];

  // Helper map for categories
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Compute Current Balance, Total Income, Total Expenses, Savings
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expense += tx.amount;
      }
    });

    const balance = income - expense;
    const savings = balance > 0 ? balance : 0;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    return { income, expense, balance, savings, savingsRate };
  }, [transactions]);

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt)
      .slice(0, 6);
  }, [transactions]);

  // 7-day or monthly cash flow data for chart
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    
    // Get last 6 months or 7 days
    transactions.forEach((tx) => {
      // Group by month YYYY-MM
      const key = tx.date.substring(0, 7);
      const curr = map.get(key) || { income: 0, expense: 0 };
      if (tx.type === 'income') curr.income += tx.amount;
      else curr.expense += tx.amount;
      map.set(key, curr);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [transactions]);

  const maxChartVal = useMemo(() => {
    let max = 1000;
    monthlyBreakdown.forEach(([_, val]) => {
      max = Math.max(max, val.income, val.expense);
    });
    return max;
  }, [monthlyBreakdown]);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Top Banner / Welcome Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t.tabDashboard}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {lang === 'th' ? 'ติดตามสถานะการเงินและพฤติกรรมการใช้จ่ายของคุณ' : 'Monitor your cash flow and financial health'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenPdfExport && (
            <button
              id="dashboard-pdf-export-btn"
              onClick={onOpenPdfExport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-sm font-semibold shadow-sm transition-all active:scale-95"
              title={lang === 'th' ? 'ดาวน์โหลดรายงานสรุป PDF' : 'Download Summary PDF'}
            >
              <FileDown size={16} className="text-neutral-600 dark:text-neutral-300" />
              <span>{lang === 'th' ? 'ดาวน์โหลด PDF' : 'Download PDF'}</span>
            </button>
          )}
          <button
            id="quick-add-btn"
            onClick={onQuickAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>{t.tabAdd}</span>
          </button>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance */}
        <div 
          id="stat-balance-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.currentBalance}
            </span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold tracking-tight ${
              stats.balance >= 0 ? 'text-neutral-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(stats.balance)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
              <span className="text-[11px] font-medium">
                {lang === 'th' ? 'สถานะสุทธิปัจจุบัน' : 'Net available balance'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div 
          id="stat-income-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.totalIncome}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(stats.income)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <TrendingUp size={12} className="text-emerald-600" />
              <span>{lang === 'th' ? 'รายรับสะสม' : 'Accumulated income'}</span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div 
          id="stat-expense-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.totalExpense}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              -{formatCurrency(stats.expense)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <TrendingDown size={12} className="text-rose-500" />
              <span>{lang === 'th' ? 'รายจ่ายสะสม' : 'Accumulated expenses'}</span>
            </div>
          </div>
        </div>

        {/* Savings */}
        <div 
          id="stat-savings-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.netSavings}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <PiggyBank size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-400">
              {formatCurrency(stats.savings)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <span>{t.savingsRate}: <strong>{stats.savingsRate}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple Clean Income vs Expense Bar Chart */}
        <div 
          id="cashflow-chart-container" 
          className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t.incomeExpenseOverview}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {lang === 'th' ? 'เปรียบเทียบรายรับและรายจ่ายรายเดือน' : 'Monthly cash flow comparison'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span>
                  {t.typeIncome.replace(' (+)', '')}
                </span>
                <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
                  {t.typeExpense.replace(' (-)', '')}
                </span>
              </div>
            </div>

            {monthlyBreakdown.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-neutral-400 text-sm">
                <p>{t.noRecentTransactions}</p>
              </div>
            ) : (
              <div className="h-56 flex items-end justify-between gap-4 pt-6 px-2">
                {monthlyBreakdown.map(([monthKey, val]) => {
                  const incomeH = maxChartVal > 0 ? (val.income / maxChartVal) * 160 : 0;
                  const expenseH = maxChartVal > 0 ? (val.expense / maxChartVal) * 160 : 0;
                  
                  return (
                    <div key={monthKey} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full flex items-end justify-center gap-1.5 h-44">
                        {/* Income Bar */}
                        <div 
                          className="w-1/2 max-w-[24px] bg-emerald-500 rounded-t transition-all group-hover:opacity-90 relative"
                          style={{ height: `${Math.max(incomeH, 4)}px` }}
                          title={`Income: ฿${val.income.toLocaleString()}`}
                        />
                        {/* Expense Bar */}
                        <div 
                          className="w-1/2 max-w-[24px] bg-rose-400 rounded-t transition-all group-hover:opacity-90 relative"
                          style={{ height: `${Math.max(expenseH, 4)}px` }}
                          title={`Expense: ฿${val.expense.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                        {monthKey}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500">
            <span>{lang === 'th' ? 'ข้อมูลตามช่วงเวลาจริง' : 'Real-time aggregated ledger'}</span>
            <button 
              id="reports-quick-link"
              onClick={() => onNavigate('reports')} 
              className="text-neutral-900 dark:text-white font-medium hover:underline flex items-center gap-1"
            >
              {t.tabReports} <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div 
          id="recent-transactions-container" 
          className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t.recentTransactions}
            </h3>
            <button
              id="view-all-transactions-btn"
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {t.viewAll}
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[360px] pr-1">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12 text-neutral-400">
                <ReceiptText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t.noRecentTransactions}</p>
                <button
                  onClick={onQuickAdd}
                  className="mt-3 text-xs font-semibold text-neutral-900 dark:text-white underline"
                >
                  {t.addFirstTransaction}
                </button>
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const cat = categoryMap.get(tx.categoryId);
                const categoryName = cat 
                  ? (lang === 'th' ? cat.nameTh : cat.nameEn)
                  : (tx.categoryName || 'General');

                return (
                  <div
                    key={tx.id}
                    id={`recent-tx-${tx.id}`}
                    onClick={() => onEditTransaction(tx)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: `${cat?.color || '#64748b'}18`,
                          color: cat?.color || '#64748b'
                        }}
                      >
                        <CategoryIcon name={cat?.icon || 'Tag'} size={18} />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {tx.note || categoryName}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          {categoryName} • {formatDateDisplay(tx.date, lang)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-3">
                      <span className={`text-sm font-bold ${
                        tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
