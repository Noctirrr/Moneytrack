import React, { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Calendar, 
  FileText, 
  Check, 
  AlertCircle,
  Wallet as WalletIcon
} from 'lucide-react';
import { Transaction, TransactionType, Category, Language, Wallet } from '../types';
import { translations } from '../constants/translations';
import { CategoryIcon } from './CategoryIcon';

interface AddEditTransactionViewProps {
  initialData?: Transaction | null;
  categories: Category[];
  wallets?: Wallet[];
  lang: Language;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onCancel: () => void;
}

export const AddEditTransactionView: React.FC<AddEditTransactionViewProps> = ({
  initialData,
  categories,
  wallets = [],
  lang,
  onSave,
  onCancel,
}) => {
  const t = translations[lang];

  const defaultWallet = wallets.find((w) => w.isDefault) || wallets[0];
  const secondWallet = wallets.find((w) => w.id !== defaultWallet?.id) || wallets[0];

  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState<string>(initialData ? String(initialData.amount) : '');
  const [walletId, setWalletId] = useState<string>(
    initialData?.walletId || defaultWallet?.id || ''
  );
  const [toWalletId, setToWalletId] = useState<string>(
    initialData?.toWalletId || secondWallet?.id || ''
  );
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [date, setDate] = useState<string>(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState<string>(initialData?.note || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter categories according to active type
  const availableCategories = categories.filter(
    (c) => c.type === 'both' || c.type === type
  );

  // Set default category when type changes if current category is not valid for new type
  useEffect(() => {
    if (type !== 'transfer' && availableCategories.length > 0) {
      const exists = availableCategories.some((c) => c.id === categoryId);
      if (!exists && !initialData) {
        setCategoryId(availableCategories[0].id);
      }
    }
  }, [type, availableCategories, categoryId, initialData]);

  // Keep wallet selection synced with provided wallets
  useEffect(() => {
    if (!walletId && defaultWallet) {
      setWalletId(defaultWallet.id);
    }
    if (!toWalletId && secondWallet) {
      setToWalletId(secondWallet.id);
    }
  }, [wallets, defaultWallet, secondWallet, walletId, toWalletId]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t.validationAmount);
      return;
    }

    if (type === 'transfer') {
      if (!walletId || !toWalletId) {
        setError(lang === 'th' ? 'กรุณาเลือกบัญชีต้นทางและปลายทาง' : 'Please select source and destination accounts');
        return;
      }
      if (walletId === toWalletId) {
        setError(lang === 'th' ? 'บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน' : 'Source and destination accounts must be different');
        return;
      }
    } else {
      if (!categoryId) {
        setError(t.validationCategory);
        return;
      }
    }

    if (!date) {
      setError(t.validationDate);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        ...(initialData?.id ? { id: initialData.id } : {}),
        type,
        amount: parsedAmount,
        categoryId: type === 'transfer' ? 'cat-transfer' : categoryId,
        categoryName: type === 'transfer' 
          ? (lang === 'th' ? 'โอนเงิน' : 'Transfer') 
          : categories.find((c) => c.id === categoryId)?.[lang === 'th' ? 'nameTh' : 'nameEn'] || '',
        walletId,
        ...(type === 'transfer' ? { toWalletId } : {}),
        date,
        note: note.trim(),
      });
    } catch (err: any) {
      setError(err?.message || 'Error saving transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="add-edit-transaction-view" className="max-w-xl mx-auto py-2">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
        {/* Header */}
        <div className="border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {initialData ? t.editTransaction : t.newTransaction}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {lang === 'th' ? 'กรอกรายละเอียดเพื่อบันทึกรายการบัญชีของคุณ' : 'Enter the details of your financial activity'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type Segmented Toggle (3 Options: Expense, Income, Transfer) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              {lang === 'th' ? 'ประเภทรายการ' : 'Transaction Type'}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
              <button
                type="button"
                id="type-expense-btn"
                onClick={() => setType('expense')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  type === 'expense'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <ArrowUpRight size={15} className="text-rose-500" />
                <span>{t.typeExpense}</span>
              </button>

              <button
                type="button"
                id="type-income-btn"
                onClick={() => setType('income')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  type === 'income'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <ArrowDownLeft size={15} className="text-emerald-500" />
                <span>{t.typeIncome}</span>
              </button>

              <button
                type="button"
                id="type-transfer-btn"
                onClick={() => setType('transfer')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  type === 'transfer'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <ArrowLeftRight size={15} className="text-sky-500" />
                <span>{t.typeTransfer}</span>
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label 
              htmlFor="amount-input" 
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2"
            >
              {t.amountLabel}
            </label>
            <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 focus-within:border-neutral-900 dark:focus-within:border-neutral-300 focus-within:bg-white dark:focus-within:bg-neutral-900 transition-colors">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-neutral-400">
                ฿
              </span>
              <input
                id="amount-input"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus={!initialData}
                required
                className="w-full pl-10 pr-4 py-3.5 bg-transparent text-2xl font-bold tracking-tight text-neutral-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Account/Wallet Selection */}
          {wallets.length > 0 && (
            <div>
              {type === 'transfer' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                      {t.fromWalletLabel}
                    </label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id} disabled={w.id === toWalletId}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                      {t.toWalletLabel}
                    </label>
                    <select
                      value={toWalletId}
                      onChange={(e) => setToWalletId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id} disabled={w.id === walletId}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    {t.walletLabel}
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {wallets.map((w) => {
                      const isSelected = walletId === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setWalletId(w.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap ${
                            isSelected
                              ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                          }`}
                        >
                          <CategoryIcon name={w.icon || 'WalletIcon'} size={14} />
                          <span>{w.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category Selection Grid (Only for Expense & Income) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                {t.categoryLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {availableCategories.map((c) => {
                  const isSelected = categoryId === c.id;
                  const catName = lang === 'th' ? c.nameTh : c.nameEn;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      id={`cat-select-${c.id}`}
                      onClick={() => setCategoryId(c.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div 
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected 
                            ? 'bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900' 
                            : 'bg-neutral-200/60 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        <CategoryIcon name={c.icon} size={15} />
                      </div>
                      <span className="text-xs truncate">{catName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label 
              htmlFor="date-input" 
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2"
            >
              {t.dateLabel}
            </label>
            <div className="relative flex items-center">
              <Calendar size={18} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-300"
              />
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label 
              htmlFor="note-input" 
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2"
            >
              {t.noteLabel}
            </label>
            <div className="relative flex items-center">
              <FileText size={18} className="absolute left-3.5 top-3 text-neutral-400 pointer-events-none" />
              <textarea
                id="note-input"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={type === 'transfer' 
                  ? (lang === 'th' ? 'เช่น โอนเงินเข้าบัญชีออม, กดเงินสด' : 'e.g., Transfer to emergency fund') 
                  : t.notePlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-300 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              id="cancel-transaction-btn"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              id="save-transaction-btn"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              <Check size={16} />
              <span>{isSubmitting ? t.saving : initialData ? t.updateBtn : t.saveBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
