import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser } from './firebase';
import { Transaction, Category, Language, ThemeMode } from './types';
import { DEFAULT_CATEGORIES } from './constants/categories';
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
import { 
  subscribeToTransactions, 
  saveTransactionToFirestore, 
  deleteTransactionFromFirestore,
  clearAllTransactionsFromFirestore,
  subscribeToCustomCategories,
  saveCustomCategoryToFirestore,
  deleteCustomCategoryFromFirestore
} from './services/firestoreService';

const LOCAL_STORAGE_TX_KEY = 'moneytrack_transactions';
const LOCAL_STORAGE_CAT_KEY = 'moneytrack_custom_categories';
const LOCAL_STORAGE_LANG_KEY = 'moneytrack_language';
const LOCAL_STORAGE_THEME_KEY = 'moneytrack_theme';
const LOCAL_STORAGE_WIPED_KEY = 'moneytrack_wiped_samples_v3';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Navigation tab: 'dashboard' | 'transactions' | 'add' | 'categories' | 'reports' | 'settings'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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

  // State: Categories
  const [customCategories, setCustomCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CAT_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // State: Transactions (defaults to empty so user starts clean to add new records)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      // Wipe initial sample data on first run of this update
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
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore if authenticated; otherwise save to localStorage
  useEffect(() => {
    if (!user) {
      // Store local offline data
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(transactions));
      return;
    }

    // Subscribe to user's remote transactions in Firestore
    setIsSyncing(true);
    const unsubTx = subscribeToTransactions(
      user.uid,
      async (remoteTxs) => {
        setIsSyncing(false);
        // If Firestore contains old sample transactions from previous turns, wipe them once so user can start fresh
        const wipedUserKey = 'moneytrack_wiped_remote_v3_' + user.uid;
        const hasSampleOnly = remoteTxs && remoteTxs.length > 0 && remoteTxs.every((t) => t.id.startsWith('sample-'));
        if (hasSampleOnly && !localStorage.getItem(wipedUserKey)) {
          localStorage.setItem(wipedUserKey, 'true');
          try {
            await clearAllTransactionsFromFirestore(user.uid);
          } catch (e) {
            console.warn('Failed to clean remote samples', e);
          }
          setTransactions([]);
          return;
        }
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

    return () => {
      unsubTx();
      unsubCat();
    };
  }, [user]);

  // Handle Save Transaction
  const handleSaveTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }
  ) => {
    if (user) {
      await saveTransactionToFirestore(user.uid, {
        type: data.type,
        amount: data.amount,
        categoryId: data.categoryId,
        categoryName: data.categoryName || '',
        date: data.date,
        note: data.note || '',
        ...(data.id ? { id: data.id } : {}),
        createdAt: data.id 
          ? (transactions.find((t) => t.id === data.id)?.createdAt || Date.now()) 
          : Date.now(),
      });
    } else {
      // Offline / Local mode
      if (data.id) {
        // Edit existing
        setTransactions((prev) =>
          prev.map((item) =>
            item.id === data.id
              ? { ...item, ...data, updatedAt: Date.now() }
              : item
          )
        );
      } else {
        // Create new
        const newTx: Transaction = {
          ...data,
          id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          createdAt: Date.now(),
        };
        setTransactions((prev) => [newTx, ...prev]);
      }
    }

    setEditingTransaction(null);
    setCurrentTab('transactions');
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (user) {
      await deleteTransactionFromFirestore(user.uid, id);
    } else {
      setTransactions((prev) => prev.filter((item) => item.id !== id));
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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-12">
        {currentTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            categories={allCategories}
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
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsListView
            transactions={transactions}
            categories={allCategories}
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
          />
        )}

        {currentTab === 'add' && (
          <AddEditTransactionView
            initialData={editingTransaction}
            categories={allCategories}
            lang={lang}
            onSave={handleSaveTransaction}
            onCancel={() => {
              setEditingTransaction(null);
              setCurrentTab('dashboard');
            }}
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
          />
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
    </div>
  );
}
