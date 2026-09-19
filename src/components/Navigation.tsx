import React from 'react';
import { LayoutDashboard, ReceiptText, Plus, Wallet as WalletIcon, Settings } from 'lucide-react';
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
    { id: 'add', label: t.tabAdd, icon: Plus, isHighlight: true },
    { id: 'wallets', label: t.tabWallets, icon: WalletIcon },
    { id: 'settings', label: t.tabSettings, icon: Settings },
  ];

  return (
    <nav 
      id="mobile-bottom-nav" 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/90 dark:border-neutral-800 safe-area-bottom shadow-lg"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          if (item.isHighlight) {
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center -mt-6 group focus:outline-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md flex items-center justify-center group-hover:scale-105 active:scale-95 transition-all">
                  <Icon size={22} className="stroke-[2.5]" />
                </div>
                <span className="text-[10.5px] font-bold mt-1 text-neutral-800 dark:text-neutral-200">
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
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all flex-1 ${
                isActive
                  ? 'text-neutral-900 dark:text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Icon size={20} className={isActive ? 'stroke-[2.2]' : 'stroke-[1.7]'} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neutral-900 dark:bg-white" />
                )}
              </div>
              <span className="text-[10px] mt-1 whitespace-nowrap tracking-tight font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
