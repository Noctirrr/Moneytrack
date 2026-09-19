import React from 'react';
import { User } from 'firebase/auth';
import { Globe, LogIn, LogOut, CheckCircle2, CloudOff, Sun, Moon } from 'lucide-react';
import { Language, ThemeMode } from '../types';
import { translations } from '../constants/translations';

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
  isSyncing,
}) => {
  const t = translations[lang];

  const navLinks = [
    { id: 'dashboard', label: t.tabDashboard },
    { id: 'transactions', label: t.tabTransactions },
    { id: 'add', label: t.tabAdd },
    { id: 'categories', label: t.tabCategories },
    { id: 'reports', label: t.tabReports },
    { id: 'settings', label: t.tabSettings },
  ];

  return (
    <header 
      id="app-header" 
      className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button 
              id="brand-logo-btn"
              onClick={() => onTabChange('dashboard')} 
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold tracking-tight text-base shadow-sm">
                ฿
              </div>
              <div>
                <span className="font-bold text-lg text-neutral-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  MoneyTrack
                  <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    TH
                  </span>
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block font-normal">
                  {t.appSubtitle}
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`header-nav-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Language Switcher, Theme Switcher, Gmail Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher (TH | EN) */}
            <button
              id="lang-toggle-btn"
              onClick={onLanguageToggle}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Switch language / เปลี่ยนภาษา"
            >
              <Globe size={13} className="text-neutral-500" />
              <span className={lang === 'th' ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-400'}>
                TH
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
              <span className={lang === 'en' ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-400'}>
                EN
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={onThemeToggle}
              aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง (Light)' : 'เปลี่ยนเป็นโหมดมืด (Dark)'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
              title={theme === 'dark' ? (lang === 'th' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'Switch to Light mode') : (lang === 'th' ? 'เปลี่ยนเป็นโหมดมืด' : 'Switch to Dark mode')}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={14} className="text-amber-400" />
                  <span className="hidden sm:inline text-neutral-200">{lang === 'th' ? 'มืด' : 'Dark'}</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-neutral-600" />
                  <span className="hidden sm:inline text-neutral-700">{lang === 'th' ? 'สว่าง' : 'Light'}</span>
                </>
              )}
            </button>

            {/* Auth with Gmail */}
            {user ? (
              <div className="flex items-center gap-2">
                <div 
                  id="user-profile-badge" 
                  className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center font-bold text-[10px]">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate max-w-[120px] font-medium">
                    {user.displayName || user.email}
                  </span>
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                </div>
                <button
                  id="sign-out-btn"
                  onClick={onSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 transition-colors"
                  title={t.signOut}
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">{t.signOut}</span>
                </button>
              </div>
            ) : (
              <button
                id="sign-in-gmail-btn"
                onClick={onSignIn}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 text-xs font-medium shadow-sm transition-all"
              >
                <LogIn size={14} />
                <span>{t.signInWithGoogle}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
