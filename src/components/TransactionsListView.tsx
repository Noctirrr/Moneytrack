import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Calendar, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  X,
  Receipt
} from 'lucide-react';
import { Transaction, Category, Language } from '../types';
import { translations } from '../constants/translations';
import { formatCurrency, formatDateDisplay } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';

interface TransactionsListViewProps {
  transactions: Transaction[];
  categories: Category[];
  lang: Language;
  onAddTransaction: () => void;
  onEditTransaction: (item: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions?: () => void;
}

export const TransactionsListView: React.FC<TransactionsListViewProps> = ({
  transactions,
  categories,
  lang,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onClearAllTransactions,
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);

    return transactions.filter((tx) => {
      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && tx.categoryId !== selectedCategory) {
        return false;
      }

      // Date range filter
      if (selectedDateRange === 'today' && tx.date !== todayStr) {
        return false;
      }
      if (selectedDateRange === 'thisMonth' && !tx.date.startsWith(thisMonthStr)) {
        return false;
      }
      if (selectedDateRange === 'last7Days') {
        const diffTime = now.getTime() - new Date(tx.date).getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        if (diffDays > 7 || diffDays < -1) return false;
      }
      if (selectedDateRange === 'last30Days') {
        const diffTime = now.getTime() - new Date(tx.date).getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        if (diffDays > 30 || diffDays < -1) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = categoryMap.get(tx.categoryId);
        const matchNote = tx.note?.toLowerCase().includes(q);
        const matchCatTh = cat?.nameTh.toLowerCase().includes(q);
        const matchCatEn = cat?.nameEn.toLowerCase().includes(q);
        const matchAmount = tx.amount.toString().includes(q);
        if (!matchNote && !matchCatTh && !matchCatEn && !matchAmount) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt);
  }, [transactions, selectedType, selectedCategory, selectedDateRange, searchQuery, categoryMap]);

  // Filter totals
  const filterStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const hasActiveFilters = searchQuery !== '' || selectedType !== 'all' || selectedCategory !== 'all' || selectedDateRange !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedDateRange('all');
  };

  return (
    <div id="transactions-list-view" className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t.tabTransactions}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {lang === 'th' ? 'ค้นหา กรอง และตรวจสอบรายการบัญชีทั้งหมด' : 'Search, filter, and inspect your ledger records'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {transactions.length > 0 && onClearAllTransactions && (
            <button
              id="clear-all-tx-btn-from-list"
              onClick={() => setShowClearAllModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-sm font-medium transition-colors"
              title={t.clearAllTransactions}
            >
              <Trash2 size={15} />
              <span>{t.clearAllTransactions}</span>
            </button>
          )}
          <button
            id="add-tx-btn-from-list"
            onClick={onAddTransaction}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>{t.tabAdd}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              id="tx-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type filter */}
          <div>
            <select
              id="filter-type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 cursor-pointer"
            >
              <option value="all">{t.allTypes}</option>
              <option value="income">{t.typeIncome}</option>
              <option value="expense">{t.typeExpense}</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 cursor-pointer"
            >
              <option value="all">{t.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'th' ? c.nameTh : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div>
            <select
              id="filter-date-select"
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 cursor-pointer"
            >
              <option value="all">{t.allDates}</option>
              <option value="thisMonth">{t.thisMonth}</option>
              <option value="today">{t.today}</option>
              <option value="last7Days">{t.last7Days}</option>
              <option value="last30Days">{t.last30Days}</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Clear Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span>
              {t.transactionCount}: <strong className="text-neutral-900 dark:text-white">{filteredTransactions.length}</strong>
            </span>
            <span>
              {t.totalIncome}: <strong className="text-emerald-600">+{formatCurrency(filterStats.income)}</strong>
            </span>
            <span>
              {t.totalExpense}: <strong className="text-rose-600">-{formatCurrency(filterStats.expense)}</strong>
            </span>
          </div>

          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              onClick={resetFilters}
              className="text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium underline flex items-center gap-1"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
              <Receipt size={24} />
            </div>
            <div>
              <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                {t.noTransactionsYet}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                {t.startAddingFirstTransaction}
              </p>
            </div>
            <button
              id="empty-list-add-tx-btn"
              onClick={onAddTransaction}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={16} />
              <span>{t.tabAdd}</span>
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-neutral-400">
            <Receipt size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">{t.noFilteredTransactions}</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-xs font-semibold text-neutral-900 dark:text-white underline"
              >
                {t.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {filteredTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const categoryName = cat 
                ? (lang === 'th' ? cat.nameTh : cat.nameEn)
                : (tx.categoryName || 'General');

              return (
                <div
                  key={tx.id}
                  id={`tx-row-${tx.id}`}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {tx.note || categoryName}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex-shrink-0">
                          {categoryName}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatDateDisplay(tx.date, lang)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 pl-3">
                    <div className="text-right">
                      <span className={`text-base font-bold tracking-tight ${
                        tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>

                    {/* Action buttons (Edit, Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        id={`edit-tx-btn-${tx.id}`}
                        onClick={() => onEditTransaction(tx)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title={t.editBtn}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        id={`delete-tx-btn-${tx.id}`}
                        onClick={() => setDeleteTargetId(tx.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title={t.deleteBtn}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t.deleteConfirmTitle}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {t.deleteConfirmDesc}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                {t.cancelBtn}
              </button>
              <button
                id="confirm-delete-btn"
                onClick={() => {
                  onDeleteTransaction(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {t.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Transactions Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {t.clearTransactionsConfirmTitle}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1.5">
                {t.clearTransactionsConfirmDesc}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                {t.cancelBtn}
              </button>
              <button
                id="confirm-clear-all-modal-btn"
                onClick={() => {
                  onClearAllTransactions?.();
                  setShowClearAllModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {t.clearAllTransactions}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
