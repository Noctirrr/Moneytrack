import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, FileText, Check, AlertCircle } from 'lucide-react';
import { Transaction, TransactionType, Category, Language } from '../types';
import { translations } from '../constants/translations';
import { CategoryIcon } from './CategoryIcon';

interface AddEditTransactionViewProps {
  initialData?: Transaction | null;
  categories: Category[];
  lang: Language;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onCancel: () => void;
}

export const AddEditTransactionView: React.FC<AddEditTransactionViewProps> = ({
  initialData,
  categories,
  lang,
  onSave,
  onCancel,
}) => {
  const t = translations[lang];

  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState<string>(initialData ? String(initialData.amount) : '');
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
    if (availableCategories.length > 0) {
      const exists = availableCategories.some((c) => c.id === categoryId);
      if (!exists && !initialData) {
        setCategoryId(availableCategories[0].id);
      }
    }
  }, [type, availableCategories, categoryId, initialData]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t.validationAmount);
      return;
    }

    if (!categoryId) {
      setError(t.validationCategory);
      return;
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
        categoryId,
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
          {/* Transaction Type Segmented Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              {lang === 'th' ? 'ประเภทรายการ' : 'Transaction Type'}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
              <button
                type="button"
                id="type-expense-btn"
                onClick={() => setType('expense')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  type === 'expense'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <ArrowUpRight size={16} className="text-rose-500" />
                <span>{t.typeExpense}</span>
              </button>

              <button
                type="button"
                id="type-income-btn"
                onClick={() => setType('income')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  type === 'income'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <ArrowDownLeft size={16} className="text-emerald-500" />
                <span>{t.typeIncome}</span>
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

          {/* Category Selection Grid */}
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
                placeholder={t.notePlaceholder}
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
