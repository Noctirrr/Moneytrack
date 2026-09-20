import React, { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  Globe, 
  Moon, 
  Sun, 
  Coins, 
  Database, 
  Download, 
  Upload, 
  RefreshCcw, 
  Trash2, 
  CheckCircle2,
  FileDown,
  LogIn,
  AlertCircle,
  Search
} from 'lucide-react';
import { Language, ThemeMode, Transaction, Category } from '../types';
import { translations } from '../constants/translations';
import { GoogleSignInButton } from './GoogleSignInButton';
import { BugReportModal } from './BugReportModal';
import firebaseConfig from '../../firebase-applet-config.json';

interface SettingsViewProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onThemeChange?: (theme: ThemeMode) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  transactions: Transaction[];
  categories: Category[];
  onImportData: (data: { transactions: Transaction[]; categories?: Category[] }) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
  onOpenPdfExport?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  onLanguageChange,
  theme,
  onThemeToggle,
  onThemeChange,
  user,
  onSignIn,
  onSignOut,
  transactions,
  categories,
  onImportData,
  onResetSampleData,
  onClearAllData,
  onOpenPdfExport,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false);
  const [bugReportTab, setBugReportTab] = useState<'create' | 'list'>('create');

  // Export JSON file
  const handleExport = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'MoneyTrack',
      transactions,
      customCategories: categories.filter((c) => c.isCustom),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moneytrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.transactions && Array.isArray(json.transactions)) {
          onImportData({
            transactions: json.transactions,
            categories: json.customCategories || [],
          });
          alert(lang === 'th' ? 'นำเข้าข้อมูลสำเร็จ' : 'Data imported successfully');
        } else {
          alert(lang === 'th' ? 'รูปแบบไฟล์ไม่ถูกต้อง' : 'Invalid data format');
        }
      } catch (err) {
        alert(lang === 'th' ? 'ไม่สามารถอ่านไฟล์ได้' : 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div id="settings-view" className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {t.settingsTitle}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {lang === 'th' ? 'ปรับแต่งการตั้งค่าภาษา ธีม และการสำรองข้อมูลของคุณ' : 'Preferences, theme, language, and data backups'}
        </p>
      </div>

      {/* Account / Cloud Status */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {user ? user.displayName || user.email : t.guestMode}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {user ? `${t.signedInAs} ${user.email}` : t.syncNotice}
              </p>
            </div>
          </div>

          <div>
            {user ? (
              <button
                id="settings-signout-btn"
                onClick={onSignOut}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                {t.signOut}
              </button>
            ) : (
              <GoogleSignInButton
                id="settings-signin-btn"
                onClick={onSignIn}
                lang={lang}
                variant="standard"
              />
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2 text-xs text-neutral-500">
          <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
          <span>{t.dataSavedInFirebase} (Project: <code>{firebaseConfig.projectId}</code>)</span>
        </div>
      </div>

      {/* General Preferences: Language, Theme, Currency */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800/80">
        {/* Language */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
              <Globe size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {t.languageSetting}
              </p>
              <p className="text-xs text-neutral-500">
                {lang === 'th' ? 'ภาษาไทย (ค่าเริ่มต้น)' : 'English (Selected)'}
              </p>
            </div>
          </div>

          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              id="set-lang-th"
              onClick={() => onLanguageChange('th')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                lang === 'th'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              ไทย (TH)
            </button>
            <button
              id="set-lang-en"
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                lang === 'en'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              English (EN)
            </button>
          </div>
        </div>

        {/* Currency */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
              <Coins size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {t.currencySetting}
              </p>
              <p className="text-xs text-neutral-500">
                {t.currencyDesc}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            THB (฿)
          </span>
        </div>

        {/* Theme */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {t.themeSetting}
              </p>
              <p className="text-xs text-neutral-500">
                {theme === 'dark' ? t.themeDark : t.themeLight}
              </p>
            </div>
          </div>

          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              id="set-theme-light"
              onClick={() => {
                if (onThemeChange) {
                  onThemeChange('light');
                } else if (theme === 'dark') {
                  onThemeToggle();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Sun size={14} className={theme === 'light' ? 'text-amber-500' : ''} />
              <span>{t.themeLight}</span>
            </button>
            <button
              id="set-theme-dark"
              onClick={() => {
                if (onThemeChange) {
                  onThemeChange('dark');
                } else if (theme === 'light') {
                  onThemeToggle();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Moon size={14} className={theme === 'dark' ? 'text-neutral-200' : ''} />
              <span>{t.themeDark}</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Bug & Error Reporting (ส่งตรงเข้า Firebase) */}
      <div id="settings-bug-reporting-card" className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>{t.reportBugBtn}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                  Firebase Direct
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t.reportBugSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Button 1: Report issue (กล่องข้อความ และปุ่มส่ง พร้อมยืนยัน) */}
          <button
            id="settings-open-report-modal-btn"
            onClick={() => {
              setBugReportTab('create');
              setIsBugReportModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all"
          >
            <AlertCircle size={16} />
            <span>{t.reportBugBtn}</span>
          </button>

          {/* Button 2: Check status of reports (เราสามารถเช็คได้เลยว่าเป็นยังไงบ้าง) */}
          <button
            id="settings-check-reports-status-btn"
            onClick={() => {
              setBugReportTab('list');
              setIsBugReportModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <Search size={16} />
            <span>{t.checkReportsBtn}</span>
          </button>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          {t.dataManagement}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Download PDF Report */}
          {onOpenPdfExport && (
            <button
              id="settings-pdf-export-btn"
              onClick={onOpenPdfExport}
              className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2 p-3.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <FileDown size={16} />
              <span>{lang === 'th' ? '📄 ดาวน์โหลดรายงานการเงิน (PDF)' : '📄 Download Financial Report (PDF)'}</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            id="export-data-btn"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <Download size={16} />
            <span>{t.exportData}</span>
          </button>

          {/* Import JSON */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              id="import-data-btn"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <Upload size={16} />
              <span>{t.importData}</span>
            </button>
          </div>

          {/* Reset to Sample Data */}
          <button
            id="reset-sample-btn"
            onClick={() => {
              if (confirm(lang === 'th' ? 'ต้องการโหลดข้อมูลตัวอย่างเริ่มต้นใช่หรือไม่?' : 'Reset to initial sample transactions?')) {
                onResetSampleData();
              }
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <RefreshCcw size={16} />
            <span>{t.resetToSampleData}</span>
          </button>

          {/* Clear All Data */}
          <button
            id="clear-all-data-btn"
            onClick={() => {
              if (confirm(t.clearDataConfirm)) {
                onClearAllData();
              }
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors"
          >
            <Trash2 size={16} />
            <span>{t.clearAllData}</span>
          </button>
        </div>
      </div>

      {/* Bug & Error Report Modal (Direct to Firebase) */}
      <BugReportModal
        isOpen={isBugReportModalOpen}
        onClose={() => setIsBugReportModalOpen(false)}
        lang={lang}
        user={user}
        initialTab={bugReportTab}
      />
    </div>
  );
};
