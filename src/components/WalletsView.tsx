import React, { useState } from 'react';
import { 
  Plus, 
  ArrowLeftRight, 
  Check, 
  Trash2, 
  Edit3, 
  CreditCard, 
  Building2, 
  Banknote, 
  PiggyBank, 
  Smartphone, 
  Wallet as WalletIcon,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { Wallet, WalletType, Language, Transaction } from '../types';
import { translations } from '../constants/translations';
import { calculateWalletBalances, WalletWithBalance } from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';

interface WalletsViewProps {
  wallets: Wallet[];
  transactions: Transaction[];
  lang: Language;
  onSaveWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onDeleteWallet: (walletId: string) => Promise<void>;
  onTransfer: (data: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    date: string;
    note?: string;
  }) => Promise<void>;
}

export const WalletsView: React.FC<WalletsViewProps> = ({
  wallets,
  transactions,
  lang,
  onSaveWallet,
  onDeleteWallet,
  onTransfer,
}) => {
  const t = translations[lang];
  const { walletsWithBalance, totalNetWorth } = calculateWalletBalances(wallets, transactions);

  // Modal states
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form states for Wallet Add/Edit
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [initialBalance, setInitialBalance] = useState('0');
  const [color, setColor] = useState('#0284c7');
  const [accountNumber, setAccountNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Transfer
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

  const colorOptions = [
    { label: 'Emerald', value: '#10b981' },
    { label: 'Sky', value: '#0284c7' },
    { label: 'Violet', value: '#8b5cf6' },
    { label: 'Indigo', value: '#6366f1' },
    { label: 'Rose', value: '#f43f5e' },
    { label: 'Amber', value: '#f59e0b' },
    { label: 'Teal', value: '#14b8a6' },
    { label: 'Slate', value: '#475569' },
  ];

  const walletTypeOptions: { type: WalletType; labelTh: string; labelEn: string; icon: string }[] = [
    { type: 'cash', labelTh: 'เงินสด', labelEn: 'Cash', icon: 'Banknote' },
    { type: 'bank', labelTh: 'บัญชีธนาคาร', labelEn: 'Bank Account', icon: 'Building2' },
    { type: 'savings', labelTh: 'เงินออม / ฉุกเฉิน', labelEn: 'Savings / Emergency', icon: 'PiggyBank' },
    { type: 'credit', labelTh: 'บัตรเครดิต', labelEn: 'Credit Card', icon: 'CreditCard' },
    { type: 'e-wallet', labelTh: 'E-Wallet (TrueMoney/Shopee)', labelEn: 'E-Wallet', icon: 'Smartphone' },
  ];

  const handleOpenAddWallet = () => {
    setEditingWallet(null);
    setName('');
    setType('bank');
    setInitialBalance('0');
    setColor('#0284c7');
    setAccountNumber('');
    setIsDefault(wallets.length === 0);
    setIsWalletModalOpen(true);
  };

  const handleOpenEditWallet = (w: Wallet) => {
    setEditingWallet(w);
    setName(w.name);
    setType(w.type);
    setInitialBalance(String(w.initialBalance || 0));
    setColor(w.color || '#0284c7');
    setAccountNumber(w.accountNumber || '');
    setIsDefault(Boolean(w.isDefault));
    setIsWalletModalOpen(true);
  };

  const handleSaveWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const chosenIcon = walletTypeOptions.find((opt) => opt.type === type)?.icon || 'WalletIcon';
      await onSaveWallet({
        ...(editingWallet ? { id: editingWallet.id } : {}),
        name: name.trim(),
        type,
        initialBalance: parseFloat(initialBalance) || 0,
        color,
        icon: chosenIcon,
        accountNumber: accountNumber.trim(),
        isDefault,
      });
      setIsWalletModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTransfer = (defaultFrom?: string) => {
    if (wallets.length < 2) {
      alert(lang === 'th' ? 'กรุณาสร้างกระเป๋าเงินอย่างน้อย 2 บัญชีเพื่อโอนเงิน' : 'Please create at least 2 accounts to make a transfer');
      return;
    }
    setFromWalletId(defaultFrom || wallets[0].id);
    const other = wallets.find((w) => w.id !== (defaultFrom || wallets[0].id));
    setToWalletId(other ? other.id : wallets[0].id);
    setTransferAmount('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferNote('');
    setTransferError(null);
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferError(lang === 'th' ? 'กรุณาระบุจำนวนเงินที่ถูกต้อง' : 'Please enter a valid amount');
      return;
    }

    if (fromWalletId === toWalletId) {
      setTransferError(lang === 'th' ? 'บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน' : 'Source and destination accounts must be different');
      return;
    }

    try {
      setIsSubmitting(true);
      await onTransfer({
        fromWalletId,
        toWalletId,
        amount: amt,
        date: transferDate,
        note: transferNote.trim(),
      });
      setIsTransferModalOpen(false);
    } catch (err: any) {
      setTransferError(err?.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="wallets-view" className="space-y-6">
      {/* Top Banner: Total Assets & Quick Transfer */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-7 border border-neutral-200/80 dark:border-neutral-800 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>{lang === 'th' ? 'สินทรัพย์รวมทุกบัญชี' : 'Total Net Balance'}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                ฿{totalNetWorth.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {lang === 'th' 
                ? `รวม ${wallets.length} บัญชี (เงินสด, ธนาคาร, เงินออม)` 
                : `Across ${wallets.length} active wallets and bank accounts`}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="open-transfer-btn"
              onClick={() => handleOpenTransfer()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white text-xs sm:text-sm font-semibold transition-all active:scale-95"
            >
              <ArrowLeftRight size={15} className="text-neutral-600 dark:text-neutral-300" />
              <span>{t.transferMoney}</span>
            </button>

            <button
              id="add-wallet-btn"
              onClick={handleOpenAddWallet}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Plus size={15} />
              <span>{t.newWallet}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Wallets Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {t.myWallets} ({walletsWithBalance.length})
          </h3>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {lang === 'th' ? 'แตะการ์ดเพื่อดูรายละเอียดหรือแก้ไข' : 'Select an account to edit'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {walletsWithBalance.map((w) => {
            const isNegative = w.balance < 0;
            return (
              <div
                key={w.id}
                id={`wallet-card-${w.id}`}
                className="group relative bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: w.color || '#0284c7' }}
                      >
                        <CategoryIcon name={w.icon || 'WalletIcon'} size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-neutral-900 dark:text-white text-base">
                            {w.name}
                          </h4>
                          {w.isDefault && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                              {t.defaultWalletBadge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <span>
                            {walletTypeOptions.find((opt) => opt.type === w.type)?.[lang === 'th' ? 'labelTh' : 'labelEn'] || w.type}
                          </span>
                          {w.accountNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px]">{w.accountNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditWallet(w)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title={t.editBtn}
                      >
                        <Edit3 size={15} />
                      </button>
                      {wallets.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(t.deleteWalletConfirm)) {
                              onDeleteWallet(w.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title={t.deleteBtn}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {t.walletBalance}
                    </span>
                    <div className="text-2xl font-extrabold tracking-tight mt-0.5 text-neutral-900 dark:text-white">
                      <span className={isNegative ? 'text-rose-600 dark:text-rose-400' : ''}>
                        ฿{w.balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Substats */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-emerald-500 flex-shrink-0" />
                    <span>+฿{w.totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <TrendingDown size={13} className="text-rose-500 flex-shrink-0" />
                    <span>-฿{w.totalExpense.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action button inside card */}
                <div className="mt-3">
                  <button
                    onClick={() => handleOpenTransfer(w.id)}
                    className="w-full py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeftRight size={13} />
                    <span>{lang === 'th' ? 'โอนออกจากบัญชีนี้' : 'Transfer from here'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wallet Modal (Add / Edit) */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {editingWallet ? t.editWallet : t.newWallet}
            </h3>

            <form onSubmit={handleSaveWalletSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.walletNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กสิกรไทย (KBank), เงินสดในกระเป๋า"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.walletTypeLabel}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as WalletType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none"
                >
                  {walletTypeOptions.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {lang === 'th' ? opt.labelTh : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.initialBalanceLabel}
                </label>
                <input
                  type="number"
                  step="any"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.accountNumberMask}
                </label>
                <input
                  type="text"
                  placeholder="เช่น ••• 4589"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  {t.walletColorLabel}
                </label>
                <div className="flex items-center gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        color === c.value ? 'scale-125 ring-2 ring-neutral-900 dark:ring-white ring-offset-2 dark:ring-offset-neutral-900' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {color === c.value && <Check size={13} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-900 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t.setAsDefaultWallet}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(false)}
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

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
                <ArrowLeftRight size={16} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {t.transferMoney}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {lang === 'th' ? 'โอนเงินระหว่างบัญชีของคุณ (ไม่นับเป็นรายรับหรือรายจ่ายซ้ำ)' : 'Transfer funds between your accounts'}
                </p>
              </div>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    {t.fromWalletLabel}
                  </label>
                  <select
                    value={fromWalletId}
                    onChange={(e) => setFromWalletId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} disabled={w.id === toWalletId}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    {t.toWalletLabel}
                  </label>
                  <select
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} disabled={w.id === fromWalletId}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.amountLabel}
                </label>
                <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus-within:border-neutral-900 dark:focus-within:border-white">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-400">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-transparent text-xl font-bold text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.dateLabel}
                </label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  {t.noteLabel}
                </label>
                <input
                  type="text"
                  placeholder="เช่น ย้ายเงินเข้าบัญชีออม, กดเงินสดติดตัว"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? t.saving : t.transferMoney}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
