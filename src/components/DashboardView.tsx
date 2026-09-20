import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  Wallet as WalletIcon, 
  PiggyBank, 
  Plus, 
  ReceiptText, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  FileDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lightbulb,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { Transaction, Category, Language, Wallet, Budget } from '../types';
import { translations } from '../constants/translations';
import { formatCurrency, formatDateDisplay } from '../utils/format';
import { calculateWalletBalances, calculateBudgetProgress } from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';
import { OverBudgetGuidanceModal } from './OverBudgetGuidanceModal';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets?: Wallet[];
  budgets?: Budget[];
  lang: Language;
  onNavigate: (tab: string) => void;
  onQuickAdd: () => void;
  onEditTransaction: (item: Transaction) => void;
  onOpenPdfExport?: () => void;
  onOpenTransfer?: () => void;
  onOpenChatRecord?: () => void;
  user?: User | null;
  onSignIn?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  wallets = [],
  budgets = [],
  lang,
  onNavigate,
  onQuickAdd,
  onEditTransaction,
  onOpenPdfExport,
  onOpenTransfer,
  onOpenChatRecord,
}) => {
  const t = translations[lang];
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);

  // Helper map for categories
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Helper map for wallets
  const walletMap = useMemo(() => {
    const map = new Map<string, Wallet>();
    wallets.forEach((w) => map.set(w.id, w));
    return map;
  }, [wallets]);

  // Compute Current Balance, Total Income, Total Expenses, Savings (excluding internal transfers)
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    });

    const balance = income - expense;
    const savings = balance > 0 ? balance : 0;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    return { income, expense, balance, savings, savingsRate };
  }, [transactions]);

  // Calculate live balances for wallets
  const { walletsWithBalance, totalNetWorth } = useMemo(() => {
    return calculateWalletBalances(wallets, transactions);
  }, [wallets, transactions]);

  // Calculate budget progress and pacing for the current month
  const budgetProgress = useMemo(() => {
    return calculateBudgetProgress(budgets, transactions, categories, new Date());
  }, [budgets, transactions, categories]);

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt)
      .slice(0, 6);
  }, [transactions]);

  // Monthly aggregated data for bar chart
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    
    transactions.forEach((tx) => {
      if (tx.type === 'transfer') return; // exclude internal transfers from cashflow bars
      const key = tx.date.substring(0, 7);
      const curr = map.get(key) || { income: 0, expense: 0 };
      if (tx.type === 'income') curr.income += tx.amount;
      else if (tx.type === 'expense') curr.expense += tx.amount;
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

  // Top Expense Categories Breakdown
  const topExpenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
      });

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId);
        const name = lang === 'th' ? (cat?.nameTh || catId) : (cat?.nameEn || catId);
        const percent = stats.expense > 0 ? Math.round((amount / stats.expense) * 100) : 0;
        return { catId, cat, name, amount, percent };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [transactions, categoryMap, stats.expense, lang]);

  const now = new Date();
  const currentMonthDisplay = now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t.tabDashboard}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
              <Calendar size={12} />
              <span>{currentMonthDisplay}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {lang === 'th' ? 'สรุปภาพรวมรายรับ รายจ่าย งบประมาณ และบัญชีการเงินของคุณ' : 'Overview of your income, expenses, budgets, and accounts'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenPdfExport && (
            <button
              id="dashboard-pdf-export-btn"
              onClick={onOpenPdfExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all active:scale-95"
              title={lang === 'th' ? 'ดาวน์โหลดรายงานสรุป PDF' : 'Download Summary PDF'}
            >
              <FileDown size={14} className="text-neutral-500 dark:text-neutral-400" />
              <span>{lang === 'th' ? 'ดาวน์โหลด PDF' : 'Download PDF'}</span>
            </button>
          )}

          {onOpenTransfer && (
            <button
              id="dashboard-quick-transfer-btn"
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <ArrowLeftRight size={14} className="text-neutral-500 dark:text-neutral-400" />
              <span>{t.transferMoney}</span>
            </button>
          )}

          <button
            id="dashboard-chat-add-btn"
            onClick={onOpenChatRecord || (() => onNavigate('chat'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all active:scale-95"
            title={lang === 'th' ? 'แชทบันทึกรายการด้วยภาษาธรรมชาติ' : 'Record via chat'}
          >
            <MessageSquare size={14} className="text-neutral-500 dark:text-neutral-400" />
            <span>{lang === 'th' ? 'แชทบันทึกรายการ' : 'Chat Record'}</span>
          </button>

          <button
            id="quick-add-btn"
            onClick={onQuickAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>{t.tabAdd}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (Ordered strictly: Net Worth, Income, Expense, Savings) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth / Total Balance */}
        <div 
          id="stat-networth-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.netWorth}
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              ฿{totalNetWorth.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
              <span className="text-[11px] font-medium">
                {lang === 'th' ? `จาก ${wallets.length} กระเป๋าเงิน/บัญชี` : `Across ${wallets.length} accounts`}
              </span>
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div 
          id="stat-income-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.totalIncome}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(stats.income)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <TrendingUp size={12} className="text-emerald-600" />
              <span className="text-[11px]">{lang === 'th' ? 'รายรับสะสม' : 'Accumulated income'}</span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div 
          id="stat-expense-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.totalExpense}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              -{formatCurrency(stats.expense)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <TrendingDown size={12} className="text-rose-500" />
              <span className="text-[11px]">{lang === 'th' ? 'รายจ่ายสะสม' : 'Accumulated expense'}</span>
            </div>
          </div>
        </div>

        {/* Net Savings & Rate */}
        <div 
          id="stat-savings-card"
          className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t.netSavings}
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <PiggyBank size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-400">
              {formatCurrency(stats.savings)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <span className="text-[11px]">
                {t.savingsRate}: <strong className="text-neutral-800 dark:text-neutral-200">{stats.savingsRate}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Core Working Bento Grid (7 cols Left, 5 cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Cashflow Chart + Top Expense Categories */}
        <div className="lg:col-span-7 space-y-6">
          {/* Monthly Cashflow Bar Chart */}
          <div 
            id="cashflow-chart-container" 
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {t.incomeExpenseOverview}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {lang === 'th' ? 'เปรียบเทียบกระแสเงินสดรายรับ-รายจ่าย 6 เดือนล่าสุด' : 'Cash flow trend over the last 6 months'}
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>{t.typeIncome}</span>
                </span>
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span>{t.typeExpense}</span>
                </span>
              </div>
            </div>

            {monthlyBreakdown.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                {lang === 'th' ? 'ยังไม่มีข้อมูลประวัติย้อนหลัง' : 'No historical data to display'}
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3 pt-2 pb-1">
                {monthlyBreakdown.map(([monthKey, val]) => {
                  const incomeH = maxChartVal > 0 ? (val.income / maxChartVal) * 140 : 0;
                  const expenseH = maxChartVal > 0 ? (val.expense / maxChartVal) * 140 : 0;
                  
                  return (
                    <div key={monthKey} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full flex items-end justify-center gap-1.5 h-36">
                        {/* Income Bar */}
                        <div 
                          className="w-1/2 max-w-[20px] bg-emerald-500 rounded-t transition-all group-hover:opacity-90 relative"
                          style={{ height: `${Math.max(incomeH, 4)}px` }}
                          title={`Income: ฿${val.income.toLocaleString()}`}
                        />
                        {/* Expense Bar */}
                        <div 
                          className="w-1/2 max-w-[20px] bg-rose-400 rounded-t transition-all group-hover:opacity-90 relative"
                          style={{ height: `${Math.max(expenseH, 4)}px` }}
                          title={`Expense: ฿${val.expense.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                        {monthKey}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
              <span>{lang === 'th' ? 'ข้อมูลสรุปกระแสเงินสดจริง' : 'Ledger-based flow'}</span>
              <button 
                id="reports-quick-link"
                onClick={() => onNavigate('reports')} 
                className="text-neutral-800 dark:text-neutral-200 font-semibold hover:underline flex items-center gap-1"
              >
                <span>{t.tabReports}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Top Expense Categories Breakdown */}
          {topExpenseCategories.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {t.topExpenses}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {lang === 'th' ? 'หมวดหมู่ที่มีการใช้จ่ายสูงสุด' : 'Categories with largest expenditures'}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  {t.viewAll}
                </button>
              </div>

              <div className="space-y-3">
                {topExpenseCategories.map((item) => (
                  <div key={item.catId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]"
                          style={{ backgroundColor: item.cat?.color || '#64748b' }}
                        >
                          <CategoryIcon name={item.cat?.icon || 'Tag'} size={11} />
                        </div>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          ฿{item.amount.toLocaleString()}
                        </span>
                        <span className="text-neutral-400 text-[11px] w-8 text-right">
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                    {/* Meter bar */}
                    <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${item.percent}%`,
                          backgroundColor: item.cat?.color || '#dc2626'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Accounts/Wallets + Smart Monthly Budget */}
        <div className="lg:col-span-5 space-y-6">
          {/* Wallets & Accounts Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                    <WalletIcon size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {t.myWallets}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {wallets.length} {lang === 'th' ? 'บัญชีพร้อมใช้งาน' : 'active accounts'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onOpenTransfer && (
                    <button
                      onClick={onOpenTransfer}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all active:scale-95"
                    >
                      <span>{t.transferMoney}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('wallets')}
                    className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    title={t.manageWallets}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Wallets mini-list */}
              <div className="space-y-2 pt-1">
                {walletsWithBalance.slice(0, 4).map((w) => (
                  <div
                    key={w.id}
                    onClick={() => onNavigate('wallets')}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 hover:border-neutral-200 dark:hover:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: w.color || '#0284c7' }}
                      >
                        <CategoryIcon name={w.icon || 'WalletIcon'} size={13} />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                          {w.name}
                        </span>
                        {w.accountNumber && (
                          <span className="text-[10px] text-neutral-400 block -mt-0.5">
                            {w.accountNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        ฿{w.balance.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
              <span>{lang === 'th' ? 'รวมยอดทุกบัญชี' : 'Total accounts sum'}</span>
              <button
                onClick={() => onNavigate('wallets')}
                className="text-neutral-800 dark:text-neutral-200 font-semibold hover:underline"
              >
                {t.manageWallets} →
              </button>
            </div>
          </div>

          {/* Smart Monthly Budget Pacing Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                    <Target size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {t.budgetsTitle}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {lang === 'th' ? 'การคุมงบประมาณเดือนนี้' : 'Monthly spending control'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('budgets')}
                  className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-0.5"
                >
                  <span>{budgetProgress.hasBudget ? t.editBudget : t.setBudgetBtn}</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              {budgetProgress.hasBudget ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-neutral-900 dark:text-white">
                        ฿{budgetProgress.totalSpent.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 ml-1.5">
                        / ฿{budgetProgress.totalLimit.toLocaleString()}
                      </span>
                    </div>
                    <span 
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        budgetProgress.status === 'danger'
                          ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                          : budgetProgress.status === 'warning'
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {budgetProgress.status === 'danger' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                      <span>{lang === 'th' ? budgetProgress.statusMessageTh : budgetProgress.statusMessageEn}</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budgetProgress.status === 'danger'
                          ? 'bg-rose-500'
                          : budgetProgress.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, budgetProgress.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{t.budgetRemaining}: ฿{budgetProgress.remaining.toLocaleString()}</span>
                    <span>{budgetProgress.percentage}% {t.budgetSpent}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2.5">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {lang === 'th'
                      ? 'คุณยังไม่ได้ตั้งงบประมาณรวมรายเดือน ตั้งเป้าหมายเพื่อช่วยคำนวณโควตาการใช้จ่ายต่อวัน'
                      : 'Set a monthly cap to enable smart daily allowance pacing'}
                  </p>
                  <button
                    onClick={() => onNavigate('budgets')}
                    className="mt-2.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold"
                  >
                    {t.setBudgetBtn}
                  </button>
                </div>
              )}
            </div>

            {budgetProgress.hasBudget && (
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.dailyAllowance}:
                </span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  ฿{budgetProgress.dailyAllowanceRemaining.toLocaleString()} / {lang === 'th' ? 'วัน' : 'day'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Transactions Table */}
      <div 
        id="recent-transactions-container" 
        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {t.recentTransactions}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {lang === 'th' ? 'รายการที่มีการบันทึกล่าสุด' : 'Latest recorded transactions'}
            </p>
          </div>
          <button
            id="view-all-transactions-btn"
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:underline flex items-center gap-1"
          >
            <span>{t.viewAll}</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <ReceiptText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">{t.noRecentTransactions}</p>
            <button
              onClick={onQuickAdd}
              className="mt-2 text-xs font-semibold text-neutral-900 dark:text-white underline"
            >
              {t.addFirstTransaction}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentTransactions.map((tx) => {
              const isTransfer = tx.type === 'transfer';
              const cat = categoryMap.get(tx.categoryId);
              const fromWallet = tx.walletId ? walletMap.get(tx.walletId) : undefined;
              const toWallet = tx.toWalletId ? walletMap.get(tx.toWalletId) : undefined;

              const categoryName = isTransfer
                ? (lang === 'th' ? 'โอนเงินระหว่างบัญชี' : 'Account Transfer')
                : cat 
                ? (lang === 'th' ? cat.nameTh : cat.nameEn)
                : (tx.categoryName || 'General');

              const subtitle = isTransfer
                ? `${fromWallet?.name || 'Account'} ➔ ${toWallet?.name || 'Account'} • ${formatDateDisplay(tx.date, lang)}`
                : `${fromWallet ? `${fromWallet.name} • ` : ''}${categoryName} • ${formatDateDisplay(tx.date, lang)}`;

              return (
                <div
                  key={tx.id}
                  id={`recent-tx-${tx.id}`}
                  onClick={() => onEditTransaction(tx)}
                  className="flex items-center justify-between py-3 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 rounded-xl px-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: isTransfer 
                          ? '#0284c718' 
                          : `${cat?.color || '#64748b'}18`,
                        color: isTransfer 
                          ? '#0284c7' 
                          : cat?.color || '#64748b'
                      }}
                    >
                      {isTransfer ? (
                        <ArrowLeftRight size={16} />
                      ) : (
                        <CategoryIcon name={cat?.icon || 'Tag'} size={16} />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {tx.note || categoryName}
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                        {subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-3">
                    <span className={`text-xs sm:text-sm font-bold ${
                      isTransfer 
                        ? 'text-sky-600 dark:text-sky-400' 
                        : tx.type === 'income' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-neutral-900 dark:text-white'
                    }`}>
                      {isTransfer ? '⇌ ' : tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
