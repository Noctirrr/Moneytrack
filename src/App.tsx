import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser } from './firebase';
import { Transaction, Category, Language, ThemeMode, SystemAnnouncement, SystemConfig, Wallet, Budget } from './types';
import { DEFAULT_CATEGORIES } from './constants/categories';
import { DEFAULT_WALLETS } from './constants/wallets';
import { getSampleTransactions } from './constants/sampleData';
import { translations } from './constants/translations';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { AddEditTransactionView } from './components/AddEditTransactionView';
import { TransactionsListView } from './components/TransactionsListView';
import { CategoriesView } from './components/CategoriesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { WalletsView } from './components/WalletsView';
import { BudgetsView } from './components/BudgetsView';
import { PdfExportModal } from './components/PdfExportModal';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { ChatTransactionView } from './components/ChatTransactionView';
import { Activity } from 'lucide-react';
import { 
  subscribeToTransactions, 
  saveTransactionToFirestore, 
  deleteTransactionFromFirestore,
  clearAllTransactionsFromFirestore,
  subscribeToCustomCategories,
  saveCustomCategoryToFirestore,
  deleteCustomCategoryFromFirestore,
  subscribeToSystemAnnouncement,
  subscribeToSystemConfig,
  subscribeToGlobalCategories,
  subscribeToWallets,
  saveWalletToFirestore,
  deleteWalletFromFirestore,
  subscribeToBudgets,
  saveBudgetToFirestore,
  deleteBudgetFromFirestore,
  recordUserProfile
} from './services/firestoreService';

const LOCAL_STORAGE_TX_KEY = 'moneytrack_transactions';
const LOCAL_STORAGE_CAT_KEY = 'moneytrack_custom_categories';
const LOCAL_STORAGE_WALLETS_KEY = 'moneytrack_wallets';
const LOCAL_STORAGE_BUDGETS_KEY = 'moneytrack_budgets';
const LOCAL_STORAGE_LANG_KEY = 'moneytrack_language';
const LOCAL_STORAGE_THEME_KEY = 'moneytrack_theme';
const LOCAL_STORAGE_WIPED_KEY = 'moneytrack_wiped_samples_v3';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Navigation tab: 'dashboard' | 'transactions' | 'budgets' | 'wallets' | 'add' | 'categories' | 'reports' | 'settings'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // PDF Export Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfInitialPeriod, setPdfInitialPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');

  const handleOpenPdfExport = (initialPeriod: 'daily' | 'weekly' | 'monthly' | 'all' = 'monthly') => {
    setPdfInitialPeriod(initialPeriod);
    setIsPdfModalOpen(true);
  };

  // System-level states (from Firestore /system)
  const [systemAnnouncement, setSystemAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [globalCategories, setGlobalCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // Language: Thai as default per instructions
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_LANG_KEY);
    return (saved === 'en' || saved === 'th') ? saved : 'th';
  });

  // Theme: Light / Dark
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  // State: Custom Categories
  const [customCategories, setCustomCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CAT_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combine global system categories with user custom categories
  const allCategories = useMemo(() => {
    const sourceGlobal = globalCategories.length > 0 ? globalCategories : DEFAULT_CATEGORIES;
    return [...sourceGlobal, ...customCategories];
  }, [globalCategories, customCategories]);

  // State: Wallets
  const [wallets, setWallets] = useState<Wallet[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_WALLETS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached wallets', e);
    }
    return DEFAULT_WALLETS;
  });

  // State: Budgets
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BUDGETS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached budgets', e);
    }
    return [];
  });

  // Subscribe to system-wide collections
  useEffect(() => {
    const unsubAnn = subscribeToSystemAnnouncement((ann) => {
      setSystemAnnouncement(ann);
    });
    const unsubCfg = subscribeToSystemConfig((cfg) => {
      setSystemConfig(cfg);
    });
    const unsubCats = subscribeToGlobalCategories((cats) => {
      if (cats && cats.length > 0) {
        setGlobalCategories(cats);
      }
    });

    return () => {
      unsubAnn();
      unsubCfg();
      unsubCats();
    };
  }, []);

  // State: Transactions (defaults to empty so user starts clean to add new records)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const hasWiped = localStorage.getItem(LOCAL_STORAGE_WIPED_KEY);
      if (!hasWiped) {
        localStorage.setItem(LOCAL_STORAGE_WIPED_KEY, 'true');
        localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify([]));
        return [];
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached transactions', e);
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync theme to document body & html
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  }, [theme]);

  // Sync language
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem(LOCAL_STORAGE_LANG_KEY, newLang);
  };

  const handleLanguageToggle = () => {
    handleLanguageChange(lang === 'th' ? 'en' : 'th');
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        recordUserProfile(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore if authenticated; otherwise save to localStorage
  useEffect(() => {
    if (!user) {
      // Store local offline data
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(transactions));
      localStorage.setItem(LOCAL_STORAGE_WALLETS_KEY, JSON.stringify(wallets));
      localStorage.setItem(LOCAL_STORAGE_BUDGETS_KEY, JSON.stringify(budgets));
      return;
    }

    // Subscribe to user's remote transactions in Firestore
    setIsSyncing(true);
    const unsubTx = subscribeToTransactions(
      user.uid,
      async (remoteTxs) => {
        setIsSyncing(false);
        setTransactions(remoteTxs || []);
      },
      (err) => {
        setIsSyncing(false);
        console.warn('Firestore offline or sync issue:', err);
      }
    );

    // Subscribe to custom categories in Firestore
    const unsubCat = subscribeToCustomCategories(user.uid, (remoteCats) => {
      if (remoteCats) {
        setCustomCategories(remoteCats);
      }
    });

    // Subscribe to Wallets in Firestore
    const unsubWallets = subscribeToWallets(user.uid, async (remoteWallets) => {
      if (remoteWallets && remoteWallets.length > 0) {
        setWallets(remoteWallets);
      } else {
        // First-time cloud user: bootstrap default wallets
        for (const w of DEFAULT_WALLETS) {
          await saveWalletToFirestore(user.uid, w);
        }
      }
    });

    // Subscribe to Budgets in Firestore
    const unsubBudgets = subscribeToBudgets(user.uid, (remoteBudgets) => {
      if (remoteBudgets) {
        setBudgets(remoteBudgets);
      }
    });

    return () => {
      unsubTx();
      unsubCat();
      unsubWallets();
      unsubBudgets();
    };
  }, [user]);

  // Handle Save Transaction
  const handleSaveTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string },
    navigateAfterSave: boolean = true
  ) => {
    const defaultWalletId = wallets.find((w) => w.isDefault)?.id || wallets[0]?.id || 'wallet-cash';
    const effectiveWalletId = data.walletId || defaultWalletId;

    if (user) {
      await saveTransactionToFirestore(
        user.uid,
        {
          type: data.type,
          amount: data.amount,
          categoryId: data.categoryId,
          categoryName: data.categoryName || '',
          walletId: effectiveWalletId,
          ...(data.toWalletId ? { toWalletId: data.toWalletId } : {}),
          date: data.date,
          note: data.note || '',
          ...(data.id ? { id: data.id } : {}),
          createdAt: data.id 
            ? (transactions.find((t) => t.id === data.id)?.createdAt || Date.now()) 
            : Date.now(),
        },
        {
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
        }
      );
    } else {
      // Offline / Local mode
      if (data.id) {
        // Edit existing
        setTransactions((prev) => {
          const next = prev.map((item) =>
            item.id === data.id
              ? { 
                  ...item, 
                  ...data, 
                  walletId: effectiveWalletId,
                  updatedAt: Date.now() 
                }
              : item
          );
          localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(next));
          return next;
        });
      } else {
        // Create new
        const newTx: Transaction = {
          ...data,
          walletId: effectiveWalletId,
          id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          createdAt: Date.now(),
        };
        setTransactions((prev) => {
          const next = [newTx, ...prev];
          localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(next));
          return next;
        });
      }
    }

    setEditingTransaction(null);
    if (navigateAfterSave) {
      setCurrentTab('transactions');
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (user) {
      await deleteTransactionFromFirestore(user.uid, id);
    } else {
      setTransactions((prev) => {
        const next = prev.filter((item) => item.id !== id);
        localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  // Handle Save Wallet
  const handleSaveWallet = async (walletData: Omit<Wallet, 'id' | 'createdAt'> & { id?: string }) => {
    if (user) {
      await saveWalletToFirestore(user.uid, walletData);
    } else {
      if (walletData.id) {
        setWallets((prev) => {
          const next = prev.map((w) =>
            w.id === walletData.id
              ? { ...w, ...walletData, updatedAt: Date.now() }
              : walletData.isDefault ? { ...w, isDefault: false } : w
          );
          localStorage.setItem(LOCAL_STORAGE_WALLETS_KEY, JSON.stringify(next));
          return next;
        });
      } else {
        const newWallet: Wallet = {
          ...walletData,
          id: 'wallet-' + Date.now(),
          createdAt: Date.now(),
        };
        setWallets((prev) => {
          const next = [
            ...prev.map((w) => walletData.isDefault ? { ...w, isDefault: false } : w),
            newWallet
          ];
          localStorage.setItem(LOCAL_STORAGE_WALLETS_KEY, JSON.stringify(next));
          return next;
        });
      }
    }
  };

  // Handle Delete Wallet
  const handleDeleteWallet = async (walletId: string) => {
    if (wallets.length <= 1) return;
    if (user) {
      await deleteWalletFromFirestore(user.uid, walletId);
    } else {
      setWallets((prev) => {
        const next = prev.filter((w) => w.id !== walletId);
        if (next.length > 0 && !next.some((w) => w.isDefault)) {
          next[0].isDefault = true;
        }
        localStorage.setItem(LOCAL_STORAGE_WALLETS_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  // Handle Direct Transfer between Wallets
  const handleTransfer = async ({
    fromWalletId,
    toWalletId,
    amount,
    date,
    note,
  }: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    date: string;
    note?: string;
  }) => {
    const fromW = wallets.find((w) => w.id === fromWalletId);
    const toW = wallets.find((w) => w.id === toWalletId);
    const transferNote = note?.trim() || `${lang === 'th' ? 'โอนจาก' : 'From'} ${fromW?.name || 'Account'} ${lang === 'th' ? 'ไปยัง' : 'to'} ${toW?.name || 'Account'}`;

    await handleSaveTransaction({
      type: 'transfer',
      amount,
      walletId: fromWalletId,
      toWalletId,
      categoryId: 'cat-transfer',
      categoryName: lang === 'th' ? 'โอนเงินระหว่างบัญชี' : 'Account Transfer',
      date,
      note: transferNote,
    });
  };

  // Handle Save Budget
  const handleSaveBudget = async (budgetData: Omit<Budget, 'id' | 'createdAt'> & { id?: string }) => {
    if (user) {
      await saveBudgetToFirestore(user.uid, budgetData);
    } else {
      if (budgetData.id) {
        setBudgets((prev) => {
          const next = prev.map((b) =>
            b.id === budgetData.id
              ? { ...b, ...budgetData, updatedAt: Date.now() }
              : b
          );
          localStorage.setItem(LOCAL_STORAGE_BUDGETS_KEY, JSON.stringify(next));
          return next;
        });
      } else {
        const newBudget: Budget = {
          ...budgetData,
          id: 'budget-' + Date.now(),
          createdAt: Date.now(),
        };
        setBudgets((prev) => {
          // Replace if already has budget for this category and month
          const filtered = prev.filter(
            (b) => !(b.categoryId === budgetData.categoryId && b.monthKey === budgetData.monthKey)
          );
          const next = [...filtered, newBudget];
          localStorage.setItem(LOCAL_STORAGE_BUDGETS_KEY, JSON.stringify(next));
          return next;
        });
      }
    }
  };

  // Handle Delete Budget
  const handleDeleteBudget = async (budgetId: string) => {
    if (user) {
      await deleteBudgetFromFirestore(user.uid, budgetId);
    } else {
      setBudgets((prev) => {
        const next = prev.filter((b) => b.id !== budgetId);
        localStorage.setItem(LOCAL_STORAGE_BUDGETS_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  // Handle Add Custom Category
  const handleAddCustomCategory = async (catData: Omit<Category, 'id'>) => {
    if (user) {
      await saveCustomCategoryToFirestore(user.uid, catData);
    } else {
      const newCat: Category = {
        ...catData,
        id: 'cat-custom-' + Date.now(),
      };
      setCustomCategories((prev) => {
        const next = [...prev, newCat];
        localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (user) {
      await deleteCustomCategoryFromFirestore(user.uid, id);
    } else {
      setCustomCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  // Auth actions
  const handleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      alert('Sign-in failed: ' + (err?.message || 'Check network connection'));
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (err: any) {
      alert('Sign-out failed: ' + (err?.message || 'Unknown error'));
    }
  };

  // Data management
  const handleImportData = (data: { transactions: Transaction[]; categories?: Category[] }) => {
    if (data.transactions) {
      setTransactions(data.transactions);
      if (user) {
        data.transactions.forEach((tx) => {
          saveTransactionToFirestore(user.uid, tx);
        });
      }
    }
    if (data.categories && data.categories.length > 0) {
      setCustomCategories(data.categories);
      if (user) {
        data.categories.forEach((cat) => {
          saveCustomCategoryToFirestore(user.uid, cat);
        });
      }
    }
  };

  const handleResetSampleData = () => {
    const samples = getSampleTransactions();
    setTransactions(samples);
    if (user) {
      samples.forEach((tx) => {
        saveTransactionToFirestore(user.uid, tx);
      });
    }
  };

  const handleClearAllData = async () => {
    setTransactions([]);
    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify([]));
    if (user) {
      setIsSyncing(true);
      try {
        await clearAllTransactionsFromFirestore(user.uid);
      } catch (err) {
        console.error('Failed to clear Firestore transactions:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'add') setEditingTransaction(null);
          setCurrentTab(tab);
        }}
        lang={lang}
        onLanguageToggle={handleLanguageToggle}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSyncing={isSyncing}
        onOpenPdfExport={() => handleOpenPdfExport('monthly')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-12 space-y-6">
        {/* System Announcement Banner (visible to all users when active) */}
        <AnnouncementBanner announcement={systemAnnouncement} />

        {/* System Maintenance Check */}
        {systemConfig?.maintenanceMode ? (
          <div className="max-w-lg mx-auto my-12 p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Activity size={28} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {lang === 'th' ? 'ระบบกำลังปิดปรับปรุงชั่วคราว' : 'System Maintenance'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
              {systemConfig.maintenanceMessage || 
                (lang === 'th' 
                  ? 'เรากำลังปรับปรุงระบบเพื่อเพิ่มประสิทธิภาพการใช้งาน ขออภัยในความไม่สะดวก' 
                  : 'We are updating our systems. Please check back shortly.')}
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                transactions={transactions}
                categories={allCategories}
                wallets={wallets}
                budgets={budgets}
                lang={lang}
                onNavigate={(tab) => setCurrentTab(tab)}
                onQuickAdd={() => {
                  setEditingTransaction(null);
                  setCurrentTab('add');
                }}
                onEditTransaction={(item) => {
                  setEditingTransaction(item);
                  setCurrentTab('add');
                }}
                onOpenPdfExport={() => handleOpenPdfExport('monthly')}
                onOpenTransfer={() => setCurrentTab('wallets')}
                onOpenChatRecord={() => setCurrentTab('chat')}
                user={user}
                onSignIn={handleSignIn}
              />
            )}

            {currentTab === 'chat' && (
              <ChatTransactionView
                categories={allCategories}
                wallets={wallets}
                lang={lang}
                onSave={(data) => handleSaveTransaction(data, false)}
                onNavigateToDashboard={() => setCurrentTab('dashboard')}
                onNavigateToTransactions={() => setCurrentTab('transactions')}
                onSwitchToForm={() => {
                  setEditingTransaction(null);
                  setCurrentTab('add');
                }}
              />
            )}

            {currentTab === 'transactions' && (
              <TransactionsListView
                transactions={transactions}
                categories={allCategories}
                wallets={wallets}
                lang={lang}
                onAddTransaction={() => {
                  setEditingTransaction(null);
                  setCurrentTab('add');
                }}
                onEditTransaction={(item) => {
                  setEditingTransaction(item);
                  setCurrentTab('add');
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onClearAllTransactions={handleClearAllData}
                onOpenPdfExport={() => handleOpenPdfExport('all')}
              />
            )}

            {currentTab === 'budgets' && (
              <BudgetsView
                budgets={budgets}
                categories={allCategories}
                transactions={transactions}
                lang={lang}
                wallets={wallets}
                onNavigateToWallets={() => setCurrentTab('wallets')}
                onSaveBudget={handleSaveBudget}
                onDeleteBudget={handleDeleteBudget}
              />
            )}

            {currentTab === 'wallets' && (
              <WalletsView
                wallets={wallets}
                transactions={transactions}
                lang={lang}
                onSaveWallet={handleSaveWallet}
                onDeleteWallet={handleDeleteWallet}
                onTransfer={handleTransfer}
              />
            )}

            {currentTab === 'add' && (
              <AddEditTransactionView
                initialData={editingTransaction}
                categories={allCategories}
                wallets={wallets}
                lang={lang}
                onSave={(data) => handleSaveTransaction(data, true)}
                onCancel={() => {
                  setEditingTransaction(null);
                  setCurrentTab('dashboard');
                }}
                onNavigateToDashboard={() => setCurrentTab('dashboard')}
                onNavigateToTransactions={() => setCurrentTab('transactions')}
              />
            )}

            {currentTab === 'categories' && (
              <CategoriesView
                categories={allCategories}
                lang={lang}
                onAddCustomCategory={handleAddCustomCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                transactions={transactions}
                categories={allCategories}
                lang={lang}
                user={user}
                onOpenPdfExport={(period) => handleOpenPdfExport(period || 'monthly')}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                lang={lang}
                onLanguageChange={handleLanguageChange}
                theme={theme}
                onThemeToggle={handleThemeToggle}
                onThemeChange={handleThemeChange}
                user={user}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                transactions={transactions}
                categories={allCategories}
                onImportData={handleImportData}
                onResetSampleData={handleResetSampleData}
                onClearAllData={handleClearAllData}
                onOpenPdfExport={() => handleOpenPdfExport('all')}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'add') setEditingTransaction(null);
          setCurrentTab(tab);
        }}
        lang={lang}
      />

      {/* Interactive PDF Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        transactions={transactions}
        categories={allCategories}
        lang={lang}
        user={user}
        initialPeriod={pdfInitialPeriod}
      />
    </div>
  );
}
