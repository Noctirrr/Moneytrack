import React from 'react';
import { LayoutDashboard, ReceiptText, PlusCircle, Target, Wallet as WalletIcon, Settings } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  lang: Language;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange, lang }) => {
  const t = translations[lang];

  const navItems = [
    { id: 'dashboard', label: t.tabDashboard, icon: LayoutDashboard },
    { id: 'transactions', label: t.tabTransactions, icon: ReceiptText },
    { id: 'add', label: t.tabAdd, icon: PlusCircle, isHighlight: true },
    { id: 'budgets', label: t.tabBudgets, icon: Target },
    { id: 'wallets', label: t.tabWallets, icon: WalletIcon },
    { id: 'settings', label: t.tabSettings, icon: Settings },
  ];

  return (
    <>
      {/* Desktop Top/Side Navigation Bar is integrated into Header, mobile bottom navigation here */}
      <nav 
        id="mobile-bottom-nav" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 safe-area-bottom shadow-sm"
      >
        <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            if (item.isHighlight) {
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div className="w-12 h-12 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform">
                    <Icon size={24} />
                  </div>
                  <span className="text-[11px] font-medium mt-1 text-neutral-800 dark:text-neutral-200">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors flex-1 ${
                  isActive
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <Icon size={20} className={isActive ? 'stroke-[2.2]' : 'stroke-[1.6]'} />
                <span className="text-[10px] mt-1 truncate max-w-[56px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
