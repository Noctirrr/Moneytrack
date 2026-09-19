import React from 'react';
import { 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  Wallet, 
  Calendar, 
  TrendingDown, 
  CheckCircle2, 
  Lock, 
  RefreshCw, 
  PieChart, 
  ArrowRight,
  Flame
} from 'lucide-react';
import { Language, Category, Budget, Wallet as WalletType, Transaction } from '../types';
import { translations } from '../constants/translations';
import { OverallBudgetProgress, calculateWalletBalances } from '../utils/finance';

interface OverBudgetGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetProgress: OverallBudgetProgress;
  wallets: WalletType[];
  transactions: Transaction[];
  categories: Category[];
  lang: Language;
  onNavigateToWallets?: () => void;
}

export const OverBudgetGuidanceModal: React.FC<OverBudgetGuidanceModalProps> = ({
  isOpen,
  onClose,
  budgetProgress,
  wallets,
  transactions,
  categories,
  lang,
  onNavigateToWallets,
}) => {
  if (!isOpen) return null;

  const t = translations[lang];
  const { totalNetWorth } = calculateWalletBalances(wallets, transactions);

  // Over budget amount
  const isOverallOver = budgetProgress.totalSpent > budgetProgress.totalLimit;
  const overAmount = Math.max(0, budgetProgress.totalSpent - budgetProgress.totalLimit);

  // Liquid funds available for remaining days
  const liquidFunds = Math.max(0, totalNetWorth);
  const daysRemaining = Math.max(1, budgetProgress.daysRemaining);
  const emergencyDailyCap = Math.max(0, Math.floor(liquidFunds / daysRemaining));

  // Category surpluses and deficits
  const overspentCategories = budgetProgress.categoryBudgets.filter((cb) => cb.isOver);
  const surplusCategories = budgetProgress.categoryBudgets.filter((cb) => !cb.isOver && cb.remaining > 0);
  const totalSurplus = surplusCategories.reduce((sum, cb) => sum + cb.remaining, 0);

  // Survival 70/20/10 amounts
  const dailyFood70 = Math.floor(emergencyDailyCap * 0.7);
  const dailyTransit20 = Math.floor(emergencyDailyCap * 0.2);
  const dailyBuffer10 = Math.max(0, emergencyDailyCap - dailyFood70 - dailyTransit20);

  return (
    <div 
      id="over-budget-guidance-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between bg-neutral-50/50 dark:bg-neutral-800/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  {t.overBudgetAdviceTitle}
                </h3>
                {isOverallOver ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                    +{overAmount.toLocaleString()} ฿
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                    {lang === 'th' ? 'ใกล้เต็มงบ' : 'Near Limit'}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t.overBudgetAdviceSubtitle}
              </p>
            </div>
          </div>

          <button
            id="close-over-budget-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card 1: Emergency Daily Cap Calculator */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50/80 via-white to-amber-50/50 dark:from-rose-950/30 dark:via-neutral-900 dark:to-amber-950/20 border border-rose-200/80 dark:border-rose-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <Flame size={15} />
                <span>{t.emergencyDailyCap}</span>
              </span>
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                <Calendar size={13} />
                <span>{lang === 'th' ? `เหลืออีก ${daysRemaining} วัน` : `${daysRemaining} days left`}</span>
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                ฿{emergencyDailyCap.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                / {lang === 'th' ? 'วัน (ห้ามเกินยอดนี้)' : 'day (strict cap)'}
              </span>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2">
              {t.emergencyDailyCapDesc} (
              {lang === 'th' 
                ? `เงินในบัญชีคงเหลือ ฿${liquidFunds.toLocaleString()} ÷ ${daysRemaining} วัน` 
                : `Liquid funds ฿${liquidFunds.toLocaleString()} ÷ ${daysRemaining} days`}
              )
            </p>
          </div>

          {/* Card 2: Survival Allocation Matrix (70 / 20 / 10) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <div className="flex items-center gap-2">
              <PieChart size={16} className="text-sky-500" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                {t.survivalAllocationTitle}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 70% Food */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/60">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <span>🍚 {lang === 'th' ? 'อาหารยังชีพ' : 'Food'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">70%</span>
                </div>
                <div className="text-base font-extrabold text-neutral-900 dark:text-white mt-1">
                  ฿{dailyFood70.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">/ วัน</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                  {lang === 'th' ? 'เน้นทำอาหารเอง หรืออาหารจานเดียว งดเครื่องดื่มหวาน/บุฟเฟต์' : 'Essential groceries only. Zero deliveries.'}
                </p>
              </div>

              {/* 20% Transit */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/60">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <span>🚌 {lang === 'th' ? 'การเดินทาง' : 'Transit'}</span>
                  <span className="text-sky-600 dark:text-sky-400">20%</span>
                </div>
                <div className="text-base font-extrabold text-neutral-900 dark:text-white mt-1">
                  ฿{dailyTransit20.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">/ วัน</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                  {lang === 'th' ? 'ค่าเดินทางไปทำงาน/เรียนที่จำเป็นเท่านั้น' : 'Work/study commutes only.'}
                </p>
              </div>

              {/* 10% Emergency */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/60">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <span>💊 {lang === 'th' ? 'สำรองฉุกเฉิน' : 'Buffer'}</span>
                  <span className="text-amber-600 dark:text-amber-400">10%</span>
                </div>
                <div className="text-base font-extrabold text-neutral-900 dark:text-white mt-1">
                  ฿{dailyBuffer10.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">/ วัน</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                  {lang === 'th' ? 'กันไว้ค่ายา ของใช้จำเป็น หรือเหตุฉุกเฉิน' : 'Medicine or urgent medical needs.'}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
              <Lock size={14} className="flex-shrink-0" />
              <span>{lang === 'th' ? '🚫 0% ช้อปปิ้ง บันเทิง และของฟุ่มเฟือย: ระงับการซื้อทันที 100% จนกว่าจะถึงสิ้นเดือน' : '0% Discretionary spend: 100% freeze on all non-essential shopping.'}</span>
            </div>
          </div>

          {/* Card 3: Reallocation & Category Shift */}
          {budgetProgress.categoryBudgets.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-indigo-500" />
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {t.reallocateSurplusTitle}
                  </h4>
                </div>
                {totalSurplus > 0 && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {lang === 'th' ? `โยกได้สูงสุด ฿${totalSurplus.toLocaleString()}` : `Surplus available: ฿${totalSurplus.toLocaleString()}`}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {/* Overspent categories */}
                {overspentCategories.length > 0 ? (
                  overspentCategories.map((oc) => (
                    <div 
                      key={oc.budget.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        <span className="font-semibold text-rose-900 dark:text-rose-200 truncate">
                          {lang === 'th' ? oc.category?.nameTh || 'หมวดหมู่' : oc.category?.nameEn || 'Category'}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 text-[11px]">
                          ({t.budgetSpent} ฿{oc.spent.toLocaleString()} / งบ ฿{oc.limit.toLocaleString()})
                        </span>
                      </div>
                      <span className="font-bold text-rose-700 dark:text-rose-300 flex-shrink-0">
                        +{ (oc.spent - oc.limit).toLocaleString() } ฿
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-neutral-500 p-2">
                    {lang === 'th' ? 'ไม่มีหมวดหมู่เฉพาะที่เกินงบ (เป็นการเกินจากงบรวมทั้งเดือน)' : 'No specific category exceeded limit.'}
                  </div>
                )}

                {/* Available surplus categories */}
                {surplusCategories.length > 0 ? (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 space-y-1.5">
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block">
                      {t.categorySurplusAvailable}:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {surplusCategories.map((sc) => (
                        <div 
                          key={sc.budget.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs"
                        >
                          <span className="font-medium text-emerald-900 dark:text-emerald-200 truncate">
                            {lang === 'th' ? sc.category?.nameTh : sc.category?.nameEn}
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            +฿{sc.remaining.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 pt-1 italic">
                    {t.noSurplusAvailable}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Card 4: 4 Immediate Action Steps */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>{t.actionPlanHeader}</span>
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    {t.actionStep1Title}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {t.actionStep1Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    {t.actionStep2Title}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {t.actionStep2Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    {t.actionStep3Title}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {t.actionStep3Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    {t.actionStep4Title}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {t.actionStep4Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between gap-3">
          {onNavigateToWallets ? (
            <button
              onClick={() => {
                onClose();
                onNavigateToWallets();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition-colors"
            >
              <Wallet size={14} />
              <span>{lang === 'th' ? 'ไปที่กระเป๋าเงินเพื่อแยกก้อนเงิน' : 'Manage Wallets & Envelopes'}</span>
            </button>
          ) : <div />}

          <button
            id="close-over-budget-confirm-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            {lang === 'th' ? 'รับทราบและจะนำไปปรับใช้' : 'Acknowledge & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};
