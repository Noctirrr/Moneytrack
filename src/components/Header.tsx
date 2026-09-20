import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Globe, 
  LogOut, 
  Sun, 
  Moon, 
  FileDown, 
  Plus,
  LayoutDashboard, 
  ReceiptText, 
  Wallet as WalletIcon, 
  Target, 
  BarChart3, 
  Settings as SettingsIcon,
  Tags,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { Language, ThemeMode } from '../types';
import { translations } from '../constants/translations';
import { GoogleSignInButton } from './GoogleSignInButton';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  lang: Language;
  onLanguageToggle: () => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
  onOpenPdfExport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  lang,
  onLanguageToggle,
  theme,
  onThemeToggle,
  user,
  onSignIn,
  onSignOut,
  onOpenPdfExport,
}) => {
  const t = translations[lang];
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary navigation tabs
  const mainNavTabs = [
    { id: 'dashboard', label: t.tabDashboard, icon: LayoutDashboard },
    { id: 'transactions', label: t.tabTransactions, icon: ReceiptText },
    { id: 'wallets', label: t.tabWallets, icon: WalletIcon },
    { id: 'budgets', label: t.tabBudgets, icon: Target },
    { id: 'reports', label: t.tabReports, icon: BarChart3 },
  ];

  const secondaryTabs = [
    { id: 'chat', label: lang === 'th' ? 'แชทบันทึกรายการ' : 'Chat Record', icon: MessageSquare },
    { id: 'categories', label: t.tabCategories, icon: Tags },
    { id: 'settings', label: t.tabSettings, icon: SettingsIcon },
  ];

  const isSecondaryActive = currentTab === 'categories' || currentTab === 'settings' || currentTab === 'chat';

  return (
    <header 
      id="app-header" 
      className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-6">
            <button 
              id="brand-logo-btn"
              onClick={() => onTabChange('dashboard')} 
              className="flex items-center gap-2.5 text-left group transition-transform active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold tracking-tight text-base shadow-sm group-hover:opacity-90">
                ฿
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white tracking-tight flex items-center gap-1.5 leading-tight">
                  MoneyTrack
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    TH
                  </span>
                </span>
                <span className="text-[10.5px] text-neutral-400 dark:text-neutral-500 hidden xl:block font-medium">
                  {t.appSubtitle}
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {mainNavTabs.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`header-nav-${item.id}`}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* More Dropdown (Categories & Settings) */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  id="header-nav-more"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSecondaryActive
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <span>{lang === 'th' ? 'เพิ่มเติม' : 'More'}</span>
                  <ChevronDown size={12} className={`transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg py-1 z-50 animate-in fade-in zoom-in-95">
                    {secondaryTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = currentTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onTabChange(tab.id);
                            setMoreMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                            isActive
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                          }`}
                        >
                          <Icon size={14} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Add Action Button (Always Accessible on Desktop) */}
            <button
              id="header-quick-add-btn"
              onClick={() => onTabChange('add')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>{t.tabAdd}</span>
            </button>

            {/* Quick PDF Report Export Button */}
            {onOpenPdfExport && (
              <button
                id="header-pdf-export-btn"
                onClick={onOpenPdfExport}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 active:scale-95 transition-all shadow-xs"
                title={lang === 'th' ? 'ส่งออกรายงานสรุป PDF' : 'Export Summary PDF'}
              >
                <FileDown size={13} className="text-neutral-500" />
                <span>PDF</span>
              </button>
            )}

            {/* Utility Pill Group: Language & Theme */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/70 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60">
              {/* Language Switcher (TH | EN) */}
              <button
                id="lang-toggle-btn"
                onClick={onLanguageToggle}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 transition-colors"
                title="Switch language / เปลี่ยนภาษา"
              >
                <Globe size={12} className="text-neutral-400" />
                <span className={lang === 'th' ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-400'}>
                  TH
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">/</span>
                <span className={lang === 'en' ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-400'}>
                  EN
                </span>
              </button>

              <div className="w-[1px] h-3.5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

              {/* Theme Toggle Button */}
              <button
                id="theme-toggle-btn"
                onClick={onThemeToggle}
                aria-label={theme === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
                className="flex items-center justify-center w-7 h-6 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 transition-colors"
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun size={13} className="text-amber-400" />
                ) : (
                  <Moon size={13} className="text-neutral-600" />
                )}
              </button>
            </div>

            {/* Auth with Google */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <button
                  id="user-profile-badge"
                  onClick={() => onTabChange('settings')}
                  className="flex items-center gap-1.5 pl-1 pr-2 sm:pr-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors"
                  title={user.email || 'User'}
                >
                  <div className="relative flex-shrink-0">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'User'} 
                        className="w-5 h-5 rounded-full object-cover border border-white dark:border-neutral-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-bold text-[10px]">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-neutral-800" />
                  </div>
                  <span className="hidden sm:inline font-semibold text-neutral-900 dark:text-white truncate max-w-[90px] text-xs">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                </button>
                <button
                  id="sign-out-btn"
                  onClick={onSignOut}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title={t.signOut}
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <GoogleSignInButton
                id="header-sign-in-btn"
                onClick={onSignIn}
                lang={lang}
                variant="compact"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
