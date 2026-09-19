import React, { useState } from 'react';
import { Plus, Trash2, FolderPlus, Check, X, ShieldAlert } from 'lucide-react';
import { Category, TransactionType, Language } from '../types';
import { translations } from '../constants/translations';
import { CategoryIcon } from './CategoryIcon';

interface CategoriesViewProps {
  categories: Category[];
  lang: Language;
  onAddCustomCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  lang,
  onAddCustomCategory,
  onDeleteCategory,
}) => {
  const t = translations[lang];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [type, setType] = useState<TransactionType | 'both'>('expense');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [color, setColor] = useState('#0284c7');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const availableIcons = [
    'Utensils', 'Car', 'ShoppingBag', 'Receipt', 'Tv', 
    'Briefcase', 'Award', 'TrendingUp', 'Coffee', 'Heart', 
    'Home', 'Smartphone', 'Gift', 'MoreHorizontal'
  ];

  const availableColors = [
    '#0284c7', // Sky
    '#059669', // Emerald
    '#dc2626', // Red
    '#d97706', // Amber
    '#4f46e5', // Indigo
    '#7c3aed', // Violet
    '#0d9488', // Teal
    '#475569', // Slate
    '#db2777', // Pink
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameTh.trim() || !nameEn.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกชื่อหมวดหมู่ทั้งสองภาษา' : 'Please provide both Thai and English category names');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAddCustomCategory({
        nameTh: nameTh.trim(),
        nameEn: nameEn.trim(),
        type,
        icon: selectedIcon,
        color,
        isCustom: true,
      });
      setIsModalOpen(false);
      setNameTh('');
      setNameEn('');
    } catch (err: any) {
      setError(err?.message || 'Error adding category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="categories-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t.categoriesManagement}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t.categoriesDesc}
          </p>
        </div>
        <button
          id="open-add-category-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <Plus size={16} />
          <span>{t.addCategoryBtn}</span>
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => {
          const typeBadge = c.type === 'income' 
            ? t.typeIncome.replace(' (+)', '') 
            : c.type === 'expense' 
            ? t.typeExpense.replace(' (-)', '') 
            : t.bothTypes;

          return (
            <div
              key={c.id}
              id={`category-card-${c.id}`}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex items-center justify-between group hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    backgroundColor: `${c.color}15`,
                    color: c.color
                  }}
                >
                  <CategoryIcon name={c.icon} size={20} />
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                    {lang === 'th' ? c.nameTh : c.nameEn}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                    {lang === 'th' ? c.nameEn : c.nameTh}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {typeBadge}
                    </span>
                    {c.isCustom && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                        {t.customCategoryBadge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {c.isCustom && (
                <button
                  id={`delete-custom-cat-${c.id}`}
                  onClick={() => setDeleteConfirmId(c.id)}
                  className="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="Delete category"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FolderPlus size={20} />
                {t.addCategoryBtn}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {t.categoryNameThLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สัตว์เลี้ยง, ท่องเที่ยว"
                  value={nameTh}
                  onChange={(e) => setNameTh(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {t.categoryNameEnLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pets, Travel"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-200 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {t.categoryTypeLabel}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none text-neutral-900 dark:text-white"
                >
                  <option value="expense">{t.typeExpense}</option>
                  <option value="income">{t.typeIncome}</option>
                  <option value="both">{t.bothTypes}</option>
                </select>
              </div>

              {/* Icon selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">
                  {lang === 'th' ? 'เลือกไอคอน' : 'Select Icon'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setSelectedIcon(ic)}
                      className={`p-2 rounded-xl border transition-all ${
                        selectedIcon === ic
                          ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <CategoryIcon name={ic} size={16} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">
                  {lang === 'th' ? 'เลือกโทนสี' : 'Select Color'}
                </label>
                <div className="flex gap-2">
                  {availableColors.map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setColor(clr)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                        color === clr ? 'scale-110 ring-2 ring-neutral-900 dark:ring-white ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: clr }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold shadow-sm hover:opacity-90"
                >
                  <Check size={14} />
                  <span>{t.createCategory}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t.deleteCategoryConfirm}
            </h3>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={async () => {
                  await onDeleteCategory(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {t.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
