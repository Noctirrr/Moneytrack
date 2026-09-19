import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Clock, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Info,
  Calendar,
  ShieldAlert,
  Lightbulb,
  ChevronRight,
  PieChart,
  Flame
} from 'lucide-react';
import { Budget, Category, Transaction, Language, Wallet } from '../types';
import { translations } from '../constants/translations';
import { calculateBudgetProgress, calculateWalletBalances } from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';
import { OverBudgetGuidanceModal } from './OverBudgetGuidanceModal';

interface BudgetsViewProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  lang: Language;
  wallets?: Wallet[];
  onNavigateToWallets?: () => void;
  onSaveBudget: (budget: Omit<Budget, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onDeleteBudget: (budgetId: string) => Promise<void>;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  categories,
  transactions,
  lang,
  wallets = [],
  onNavigateToWallets,
  onSaveBudget,
  onDeleteBudget,
}) => {
  const t = translations[lang];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const budgetProgress = calculateBudgetProgress(budgets, transactions, categories, currentDate);
  const { totalNetWorth } = calculateWalletBalances(wallets, transactions);

  // Modals
  const [isTotalBudgetModalOpen, setIsTotalBudgetModalOpen] = useState(false);
  const [isCategoryBudgetModalOpen, setIsCategoryBudgetModalOpen] = useState(false);
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form states
  const [totalAmountInput, setTotalAmountInput] = useState(
    budgetProgress.totalLimit > 0 ? String(budgetProgress.totalLimit) : ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
  const [categoryAmountInput, setCategoryAmountInput] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Overall budget record if exists
  const existingOverallBudget = budgets.find(
    (b) => (!b.categoryId || b.categoryId === 'total') && (b.monthKey === currentMonthKey || b.monthKey === 'all')
  );

  const handleOpenTotalBudgetModal = () => {
    setTotalAmountInput(budgetProgress.totalLimit > 0 ? String(budgetProgress.totalLimit) : '');
    setIsTotalBudgetModalOpen(true);
  };

  const handleSaveTotalBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(totalAmountInput);
    if (isNaN(val) || val <= 0) return;

    try {
      setIsSubmitting(true);
      await onSaveBudget({
        ...(existingOverallBudget ? { id: existingOverallBudget.id } : {}),
        amount: val,
        categoryId: 'total',
        period: 'monthly',
        monthKey: currentMonthKey,
        alertThreshold: 80,
      });
      setIsTotalBudgetModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddCategoryBudget = () => {
    setEditingBudget(null);
    // Find first category that doesn't already have an active budget
    const usedCatIds = new Set(
      budgets
        .filter((b) => b.categoryId && b.categoryId !== 'total')
        .map((b) => b.categoryId)
    );
    const available = categories.filter((c) => !usedCatIds.has(c.id));
    setSelectedCategoryId(available[0]?.id || categories[0]?.id || '');
    setCategoryAmountInput('');
    setAlertThreshold('80');
    setIsCategoryBudgetModalOpen(true);
  };

  const handleOpenEditCategoryBudget = (b: Budget) => {
    setEditingBudget(b);
    setSelectedCategoryId(b.categoryId || '');
    setCategoryAmountInput(String(b.amount));
    setAlertThreshold(String(b.alertThreshold || 80));
    setIsCategoryBudgetModalOpen(true);
  };

  const handleSaveCategoryBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(categoryAmountInput);
    if (isNaN(val) || val <= 0 || !selectedCategoryId) return;

    try {
      setIsSubmitting(true);
      await onSaveBudget({
        ...(editingBudget ? { id: editingBudget.id } : {}),
        amount: val,
        categoryId: selectedCategoryId,
        period: 'monthly',
        monthKey: currentMonthKey,
        alertThreshold: parseInt(alertThreshold) || 80,
      });
      setIsCategoryBudgetModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="budgets-view" className="space-y-6">
      {/* Overview Pacing Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-7 border border-neutral-200/80 dark:border-neutral-800 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <Target size={16} className="text-neutral-700 dark:text-neutral-300" />
              <span>{t.budgetMonthlyOverall}</span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                {currentMonthKey}
              </span>
            </div>

            {budgetProgress.hasBudget ? (
              <div className="pt-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                    ฿{budgetProgress.totalSpent.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                    / ฿{budgetProgress.totalLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      budgetProgress.status === 'danger'
                        ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                        : budgetProgress.status === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {budgetProgress.status === 'danger' ? (
                      <AlertTriangle size={12} />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    <span>{lang === 'th' ? budgetProgress.statusMessageTh : budgetProgress.statusMessageEn}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                  {lang === 'th' ? 'ยังไม่ได้ตั้งงบประมาณรายเดือน' : 'No monthly budget set'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md">
                  {lang === 'th' 
                    ? 'ตั้งเพดานการใช้จ่ายรายเดือนเพื่อช่วยควบคุมไม่ให้เงินรั่วไหล และคำนวณอัตราการใช้เงินรายวันอัตโนมัติ' 
                    : 'Set a monthly spending limit to monitor burn rate and auto-calculate daily allowances'}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {budgetProgress.hasBudget && (
              <button
                id="view-budget-guidance-btn"
                onClick={() => setIsGuidanceModalOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                  budgetProgress.status === 'danger'
                    ? 'bg-rose-100 hover:bg-rose-200/80 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'
                }`}
              >
                <Lightbulb size={15} className={budgetProgress.status === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500'} />
                <span>{t.viewAdvicePlaybookBtn}</span>
              </button>
            )}

            <button
              id="set-total-budget-btn"
              onClick={handleOpenTotalBudgetModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Target size={15} />
              <span>{budgetProgress.hasBudget ? t.editBudget : t.setBudgetBtn}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Indicators (if budget is set) */}
        {budgetProgress.hasBudget && (
          <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <span>{t.budgetSpent}: {budgetProgress.percentage}%</span>
                  <span className="text-neutral-400">•</span>
                  <span className="text-neutral-500">
                    {budgetProgress.daysRemaining} {t.daysLeftInMonth}
                  </span>
                </div>
                <span>
                  {t.budgetRemaining}: ฿{budgetProgress.remaining.toLocaleString()}
                </span>
              </div>

              {/* Multi-layered progress indicator */}
              <div className="w-full h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
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
            </div>

            {/* Smart Pacing Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                  {t.dailyAllowance}
                </span>
                <span className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5 block">
                  ฿{budgetProgress.dailyAllowanceRemaining.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">/ {lang === 'th' ? 'วัน' : 'day'}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                  {lang === 'th' ? 'เวลาที่ผ่านไปในเดือนนี้' : 'Month Elapsed'}
                </span>
                <span className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5 block">
                  {budgetProgress.currentDay} / {budgetProgress.daysInMonth}{' '}
                  <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    ({budgetProgress.monthElapsedPercent}%)
                  </span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                  {lang === 'th' ? 'สถานะความเร็วการใช้เงิน' : 'Pacing Health'}
                </span>
                <span className="text-sm font-bold text-neutral-900 dark:text-white mt-1 block flex items-center gap-1.5">
                  <span 
                    className={`w-2 h-2 rounded-full ${
                      budgetProgress.status === 'danger'
                        ? 'bg-rose-500'
                        : budgetProgress.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  {budgetProgress.status === 'danger' 
                    ? (lang === 'th' ? 'เกินงบแล้ว' : 'Exceeded') 
                    : budgetProgress.status === 'warning' 
                    ? (lang === 'th' ? 'ระวังการใช้จ่าย' : 'Caution') 
                    : (lang === 'th' ? 'สมดุลดีเยี่ยม' : 'On Track')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Over-Budget Emergency Action Box (appears when in danger or warning) */}
      {budgetProgress.hasBudget && (budgetProgress.status === 'danger' || budgetProgress.categoryBudgets.some((cb) => cb.isOver)) && (
        <div 
          id="over-budget-rescue-banner"
          className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-amber-50 dark:from-rose-950/40 dark:via-neutral-900 dark:to-amber-950/20 border border-rose-200 dark:border-rose-900/60 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                <ShieldAlert size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-rose-950 dark:text-rose-200">
                    {t.overBudgetAlertBanner}
                  </h4>
                </div>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                  {t.overBudgetBannerSub} • {lang === 'th' ? `เหลืออีก ${budgetProgress.daysRemaining} วัน` : `${budgetProgress.daysRemaining} days left in month`}
                </p>
              </div>
            </div>

            <button
              id="open-rescue-modal-from-banner"
              onClick={() => setIsGuidanceModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-xs flex-shrink-0"
            >
              <Lightbulb size={15} />
              <span>{t.viewAdvicePlaybookBtn}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Quick Survival Allocation Teaser */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-rose-200/60 dark:border-rose-900/40 text-xs">
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-800/60 border border-rose-100 dark:border-neutral-700/40">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                {t.emergencyDailyCap}
              </span>
              <span className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5 block">
                ฿{Math.max(0, Math.floor(totalNetWorth / Math.max(1, budgetProgress.daysRemaining))).toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-neutral-400">/ วัน</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-800/60 border border-rose-100 dark:border-neutral-700/40">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                {lang === 'th' ? 'สูตรจัดเงินที่เหลือ' : 'Survival Formula'}
              </span>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 block">
                70% อาหาร | 20% เดินทาง | 10% ฉุกเฉิน
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-800/60 border border-rose-100 dark:border-neutral-700/40">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                {lang === 'th' ? 'ข้อห้ามสำคัญทันที' : 'Priority Rule'}
              </span>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-0.5 block">
                {lang === 'th' ? 'งดช้อปปิ้ง & ของฟุ่มเฟือย 100%' : 'Freeze 100% non-essentials'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Category Budgets List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t.categoryBudget} ({budgetProgress.categoryBudgets.length})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {lang === 'th' ? 'กำหนดเพดานเฉพาะหมวดหมู่ เช่น ค่าอาหาร, ช้อปปิ้ง' : 'Control spending by specific categories'}
            </p>
          </div>

          <button
            id="add-category-budget-btn"
            onClick={handleOpenAddCategoryBudget}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white text-xs font-semibold transition-all active:scale-95"
          >
            <Plus size={14} />
            <span>{t.newBudget}</span>
          </button>
        </div>

        {budgetProgress.categoryBudgets.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <Target size={32} className="mx-auto text-neutral-400 mb-2" />
            <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              {lang === 'th' ? 'ยังไม่มีการตั้งงบประมาณรายหมวดหมู่' : 'No category budgets created yet'}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {lang === 'th' 
                ? 'แนะนำให้ตั้งงบประมาณสำหรับหมวดหมู่ที่คุณมักใช้จ่ายเยอะ เช่น ค่าอาหาร, ท่องเที่ยว, หรือช้อปปิ้ง' 
                : 'Control specific categories where you tend to spend most frequently'}
            </p>
            <button
              onClick={handleOpenAddCategoryBudget}
              className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold shadow-xs"
            >
              {t.newBudget}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetProgress.categoryBudgets.map((item) => {
              const catName = item.category 
                ? (lang === 'th' ? item.category.nameTh : item.category.nameEn) 
                : 'Unknown Category';
              return (
                <div
                  key={item.budget.id}
                  id={`cat-budget-${item.budget.id}`}
                  className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: item.category?.color || '#0284c7' }}
                      >
                        <CategoryIcon name={item.category?.icon || 'Tag'} size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
                          {catName}
                        </h4>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {t.budgetLimit}: ฿{item.limit.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategoryBudget(item.budget)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title={t.editBtn}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(t.deleteBudgetConfirm)) {
                            onDeleteBudget(item.budget.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title={t.deleteBtn}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-neutral-900 dark:text-white text-sm">
                      ฿{item.spent.toLocaleString()}{' '}
                      <span className="text-neutral-400 text-xs font-normal">/ ฿{item.limit.toLocaleString()}</span>
                    </span>
                    <span 
                      className={`font-semibold ${
                        item.isOver 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : item.isNearLimit 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : 'text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.isOver 
                          ? 'bg-rose-500' 
                          : item.isNearLimit 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>
                      {item.isOver ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          +{Math.abs(item.spent - item.limit).toLocaleString()} ฿ ({lang === 'th' ? 'เกินงบ' : 'Over'})
                        </span>
                      ) : (
                        <span>
                          {t.budgetRemaining}: ฿{item.remaining.toLocaleString()}
                        </span>
                      )}
                    </span>
                    {item.isNearLimit && !item.isOver && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle size={11} />
                        <span>{lang === 'th' ? 'เตือน: ใกล้เต็มเพดาน' : 'Near limit'}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Set Total Monthly Budget */}
      {isTotalBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {t.overallMonthlyLimit}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {lang === 'th' ? `กำหนดวงเงินรายจ่ายรวมทั้งหมดประจำเดือน ${currentMonthKey}` : `Set total spending cap for ${currentMonthKey}`}
              </p>
            </div>

            <form onSubmit={handleSaveTotalBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.budgetLimit} (บาท)
                </label>
                <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus-within:border-neutral-900 dark:focus-within:border-white">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-400">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="เช่น 15000"
                    required
                    autoFocus
                    value={totalAmountInput}
                    onChange={(e) => setTotalAmountInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-transparent text-xl font-bold text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsTotalBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? t.saving : t.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Category Budget */}
      {isCategoryBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingBudget ? t.editBudget : t.newBudget}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {lang === 'th' ? 'ตั้งวงเงินเฉพาะสำหรับแต่ละหมวดหมู่' : 'Set a limit for a specific category'}
              </p>
            </div>

            <form onSubmit={handleSaveCategoryBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.categoryLabel}
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={Boolean(editingBudget)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'th' ? c.nameTh : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.budgetLimit} (บาท)
                </label>
                <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus-within:border-neutral-900 dark:focus-within:border-white">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-400">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="เช่น 5000"
                    required
                    value={categoryAmountInput}
                    onChange={(e) => setCategoryAmountInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-transparent text-xl font-bold text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {lang === 'th' ? 'แจ้งเตือนเมื่อใช้ถึง (% ของงบ)' : 'Alert threshold (% of budget)'}
                </label>
                <select
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none"
                >
                  <option value="70">70%</option>
                  <option value="80">80% (แนะนำ)</option>
                  <option value="90">90%</option>
                  <option value="100">100%</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCategoryBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? t.saving : t.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Over-Budget Guidance & Survival Allocation */}
      <OverBudgetGuidanceModal
        isOpen={isGuidanceModalOpen}
        onClose={() => setIsGuidanceModalOpen(false)}
        budgetProgress={budgetProgress}
        wallets={wallets}
        transactions={transactions}
        categories={categories}
        lang={lang}
        onNavigateToWallets={onNavigateToWallets}
      />
    </div>
  );
};
