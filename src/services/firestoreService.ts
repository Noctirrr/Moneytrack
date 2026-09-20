import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { Transaction, Category, SystemAnnouncement, SystemConfig, UserProfile, Wallet, Budget, BugReport, BugReportStatus } from '../types';
import { DEFAULT_CATEGORIES } from '../constants/categories';

export const ADMIN_EMAIL = '0708saipin@gmail.com';
export const DEFAULT_ADMIN_EMAILS = [ADMIN_EMAIL];

export const isUserAdmin = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

export const recordUserProfile = async (user: User): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || '',
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not record user profile', err);
  }
};

export const subscribeToTransactions = (
  userId: string,
  onUpdate: (txs: Transaction[]) => void,
  onError: (err: any) => void
) => {
  const userTxsRef = collection(db, 'users', userId, 'transactions');
  const q = query(userTxsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
        } as Transaction);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('Firestore transactions subscription error:', error);
      onError(error);
    }
  );
};

export const saveTransactionToFirestore = async (
  userId: string,
  transaction: Omit<Transaction, 'id'> & { id?: string },
  userInfo?: { email?: string; displayName?: string; photoURL?: string }
): Promise<string> => {
  // Ensure the parent users/{userId} document exists so it never appears as a phantom italic document in Firestore
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        uid: userId,
        ...(userInfo?.email ? { email: userInfo.email } : {}),
        ...(userInfo?.displayName ? { displayName: userInfo.displayName } : {}),
        ...(userInfo?.photoURL ? { photoURL: userInfo.photoURL } : {}),
        lastActiveAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Parent user doc sync:', err);
  }

  const userTxsRef = collection(db, 'users', userId, 'transactions');
  const docRef = transaction.id ? doc(userTxsRef, transaction.id) : doc(userTxsRef);
  
  // Construct clean payload ensuring NO undefined fields are passed to Firestore
  const payload: Record<string, any> = {
    id: docRef.id,
    userId,
    type: transaction.type,
    amount: Number(transaction.amount) || 0,
    categoryId: transaction.categoryId,
    categoryName: transaction.categoryName || '',
    date: transaction.date,
    note: transaction.note ? String(transaction.note).trim() : '',
    ...(transaction.walletId ? { walletId: transaction.walletId } : {}),
    ...(transaction.toWalletId ? { toWalletId: transaction.toWalletId } : {}),
    createdAt: transaction.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
};

export const deleteTransactionFromFirestore = async (
  userId: string,
  transactionId: string
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'transactions', transactionId);
  await deleteDoc(docRef);
};

export const clearAllTransactionsFromFirestore = async (
  userId: string
): Promise<void> => {
  const userTxsRef = collection(db, 'users', userId, 'transactions');
  const snapshot = await getDocs(userTxsRef);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
};

export const subscribeToCustomCategories = (
  userId: string,
  onUpdate: (cats: Category[]) => void
) => {
  const ref = collection(db, 'users', userId, 'categories');
  return onSnapshot(ref, (snapshot) => {
    const list: Category[] = [];
    snapshot.forEach((d) => {
      list.push({
        id: d.id,
        ...d.data(),
      } as Category);
    });
    onUpdate(list);
  });
};

export const saveCustomCategoryToFirestore = async (
  userId: string,
  category: Omit<Category, 'id'> & { id?: string }
): Promise<string> => {
  const ref = collection(db, 'users', userId, 'categories');
  const docRef = category.id ? doc(ref, category.id) : doc(ref);
  const payload: Record<string, any> = {
    id: docRef.id,
    userId,
    nameTh: category.nameTh || '',
    nameEn: category.nameEn || '',
    icon: category.icon || 'Tag',
    color: category.color || '#64748b',
    type: category.type || 'both',
    isCustom: true,
    updatedAt: Date.now(),
  };
  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
};

export const deleteCustomCategoryFromFirestore = async (
  userId: string,
  categoryId: string
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'categories', categoryId);
  await deleteDoc(docRef);
};

// ----------------------------------------------------
// SYSTEM & ADMIN BACKOFFICE METHODS
// ----------------------------------------------------

// 1. System Announcements
export const subscribeToSystemAnnouncement = (
  onUpdate: (announcement: SystemAnnouncement | null) => void
) => {
  const ref = doc(db, 'system', 'announcement');
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as SystemAnnouncement);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn('System announcement snapshot error:', error);
      onUpdate(null);
    }
  );
};

export const saveSystemAnnouncement = async (
  announcement: SystemAnnouncement
): Promise<void> => {
  const ref = doc(db, 'system', 'announcement');
  await setDoc(ref, {
    isActive: Boolean(announcement.isActive),
    title: announcement.title || '',
    message: announcement.message || '',
    type: announcement.type || 'info',
    updatedAt: Date.now(),
  });
};

// 2. System Configuration & Maintenance Mode
export const subscribeToSystemConfig = (
  onUpdate: (config: SystemConfig | null) => void
) => {
  const ref = doc(db, 'system', 'config');
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as SystemConfig);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn('System config snapshot error:', error);
      onUpdate(null);
    }
  );
};

export const saveSystemConfig = async (
  config: SystemConfig
): Promise<void> => {
  const ref = doc(db, 'system', 'config');
  await setDoc(ref, {
    maintenanceMode: Boolean(config.maintenanceMode),
    maintenanceMessage: config.maintenanceMessage || '',
    appName: config.appName || 'MoneyTrack',
    updatedAt: Date.now(),
  });
};

// 3. Global Default Categories (Managed by Admin for all users)
export const subscribeToGlobalCategories = (
  onUpdate: (cats: Category[]) => void
) => {
  const ref = collection(db, 'system', 'data', 'categories');
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_CATEGORIES);
        return;
      }
      const list: Category[] = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
        } as Category);
      });
      onUpdate(list.length > 0 ? list : DEFAULT_CATEGORIES);
    },
    (error) => {
      console.warn('Global categories snapshot error, using defaults:', error);
      onUpdate(DEFAULT_CATEGORIES);
    }
  );
};

export const saveGlobalCategory = async (
  category: Category
): Promise<void> => {
  const ref = doc(db, 'system', 'data', 'categories', category.id);
  const payload: Record<string, any> = {
    id: category.id,
    nameTh: category.nameTh,
    nameEn: category.nameEn,
    type: category.type,
    icon: category.icon,
    color: category.color,
    isCustom: false,
    updatedAt: Date.now(),
  };
  await setDoc(ref, payload, { merge: true });
};

export const deleteGlobalCategory = async (
  categoryId: string
): Promise<void> => {
  const ref = doc(db, 'system', 'data', 'categories', categoryId);
  await deleteDoc(ref);
};

export const seedDefaultCategoriesToGlobal = async (): Promise<void> => {
  const batch = writeBatch(db);
  for (const cat of DEFAULT_CATEGORIES) {
    const ref = doc(db, 'system', 'data', 'categories', cat.id);
    batch.set(ref, {
      ...cat,
      isCustom: false,
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
};

// 4. System Admins Registry (Strictly 0708saipin@gmail.com)
export const subscribeToSystemAdmins = (
  onUpdate: (admins: string[]) => void
) => {
  onUpdate([ADMIN_EMAIL]);
  return () => {};
};

export const addSystemAdmin = async (
  email: string,
  addedBy: string
): Promise<void> => {
  const sanitizedEmail = email.trim().toLowerCase();
  const ref = doc(db, 'system_admins', sanitizedEmail);
  await setDoc(ref, {
    email: sanitizedEmail,
    addedAt: Date.now(),
    addedBy,
  });
};

export const removeSystemAdmin = async (
  email: string
): Promise<void> => {
  const sanitizedEmail = email.trim().toLowerCase();
  const ref = doc(db, 'system_admins', sanitizedEmail);
  await deleteDoc(ref);
};

// 5. Fetch Registered Users (Admin only)
export const fetchRegisteredUsers = async (): Promise<UserProfile[]> => {
  try {
    const ref = collection(db, 'users');
    const snapshot = await getDocs(ref);
    const users: UserProfile[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data.email) {
        users.push({
          uid: d.id,
          email: data.email || '',
          displayName: data.displayName || '',
          photoURL: data.photoURL || '',
          lastLoginAt: data.lastLoginAt || 0,
        });
      }
    });
    return users;
  } catch (err) {
    console.warn('Could not fetch registered users:', err);
    return [];
  }
};

// 6. User Wallets / Accounts
export const subscribeToWallets = (
  userId: string,
  onUpdate: (wallets: Wallet[]) => void,
  onError?: (err: any) => void
) => {
  const walletsRef = collection(db, 'users', userId, 'wallets');
  const q = query(walletsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Wallet[] = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
        } as Wallet);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Wallets subscription error:', err);
      if (onError) onError(err);
    }
  );
};

export const saveWalletToFirestore = async (
  userId: string,
  wallet: Omit<Wallet, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<string> => {
  const walletsRef = collection(db, 'users', userId, 'wallets');
  const docRef = wallet.id ? doc(walletsRef, wallet.id) : doc(walletsRef);

  const payload: Record<string, any> = {
    id: docRef.id,
    userId,
    name: wallet.name.trim(),
    type: wallet.type,
    initialBalance: Number(wallet.initialBalance) || 0,
    color: wallet.color || '#10b981',
    createdAt: wallet.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  if (wallet.icon) payload.icon = wallet.icon;
  if (wallet.accountNumber) payload.accountNumber = wallet.accountNumber;
  if (wallet.isDefault !== undefined) payload.isDefault = Boolean(wallet.isDefault);

  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
};

export const deleteWalletFromFirestore = async (
  userId: string,
  walletId: string
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'wallets', walletId);
  await deleteDoc(docRef);
};

// 7. User Budgets
export const subscribeToBudgets = (
  userId: string,
  onUpdate: (budgets: Budget[]) => void,
  onError?: (err: any) => void
) => {
  const budgetsRef = collection(db, 'users', userId, 'budgets');
  const q = query(budgetsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Budget[] = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
        } as Budget);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Budgets subscription error:', err);
      if (onError) onError(err);
    }
  );
};

export const saveBudgetToFirestore = async (
  userId: string,
  budget: Omit<Budget, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<string> => {
  const budgetsRef = collection(db, 'users', userId, 'budgets');
  const docRef = budget.id ? doc(budgetsRef, budget.id) : doc(budgetsRef);

  const payload: Record<string, any> = {
    id: docRef.id,
    userId,
    amount: Number(budget.amount) || 0,
    period: budget.period || 'monthly',
    monthKey: budget.monthKey || 'all',
    createdAt: budget.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  if (budget.categoryId) payload.categoryId = budget.categoryId;
  if (budget.alertThreshold !== undefined) payload.alertThreshold = Number(budget.alertThreshold);

  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
};

export const deleteBudgetFromFirestore = async (
  userId: string,
  budgetId: string
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'budgets', budgetId);
  await deleteDoc(docRef);
};

// ----------------------------------------------------
// 8. BUG & ERROR REPORTS (Direct to Firebase Firestore)
// ----------------------------------------------------

export const LOCAL_SAVED_REPORTS_KEY = 'moneytrack_saved_reports';

export const submitBugReport = async (
  report: Omit<BugReport, 'id' | 'createdAt' | 'status'> & { status?: BugReportStatus }
): Promise<BugReport> => {
  const reportsRef = collection(db, 'bug_reports');
  const docRef = doc(reportsRef);
  const now = Date.now();

  const newReport: BugReport = {
    id: docRef.id,
    message: String(report.message || '').trim(),
    reportType: report.reportType || 'bug',
    status: report.status || 'pending',
    userId: report.userId || 'guest',
    userEmail: report.userEmail || '',
    userDisplayName: report.userDisplayName || '',
    deviceInfo: report.deviceInfo || (typeof navigator !== 'undefined' ? `${navigator.userAgent} (${window.innerWidth}x${window.innerHeight})` : ''),
    language: report.language || 'th',
    createdAt: now,
    updatedAt: now,
  };

  // 1. Save directly into Firestore database
  try {
    await setDoc(docRef, newReport);
  } catch (err) {
    console.error('Failed to write bug report to Firestore:', err);
    // Still store locally below so user does not lose their report
  }

  // 2. Cache in localStorage so user can check it immediately in all circumstances
  try {
    const existingStr = localStorage.getItem(LOCAL_SAVED_REPORTS_KEY);
    const existingList: BugReport[] = existingStr ? JSON.parse(existingStr) : [];
    const updatedList = [newReport, ...existingList.filter((r) => r.id !== newReport.id)].slice(0, 50);
    localStorage.setItem(LOCAL_SAVED_REPORTS_KEY, JSON.stringify(updatedList));
  } catch (storageErr) {
    console.warn('LocalStorage error while saving bug report cache:', storageErr);
  }

  return newReport;
};

export const subscribeToBugReports = (
  onUpdate: (reports: BugReport[]) => void,
  onError?: (err: any) => void
) => {
  const reportsRef = collection(db, 'bug_reports');
  const q = query(reportsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: BugReport[] = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
        } as BugReport);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Bug reports subscription error:', err);
      // Fallback to local storage cache if firestore query has issue
      try {
        const cached = localStorage.getItem(LOCAL_SAVED_REPORTS_KEY);
        if (cached) {
          onUpdate(JSON.parse(cached));
        }
      } catch {
        // ignore
      }
      if (onError) onError(err);
    }
  );
};

export const updateBugReportStatus = async (
  reportId: string,
  status: BugReportStatus,
  adminResponse?: string
): Promise<void> => {
  const docRef = doc(db, 'bug_reports', reportId);
  const payload: Record<string, any> = {
    status,
    updatedAt: Date.now(),
  };
  if (adminResponse !== undefined) {
    payload.adminResponse = adminResponse.trim();
  }
  await setDoc(docRef, payload, { merge: true });

  // Update local cache if present
  try {
    const existingStr = localStorage.getItem(LOCAL_SAVED_REPORTS_KEY);
    if (existingStr) {
      const list: BugReport[] = JSON.parse(existingStr);
      const updated = list.map((r) => (r.id === reportId ? { ...r, status, ...(adminResponse !== undefined ? { adminResponse } : {}) } : r));
      localStorage.setItem(LOCAL_SAVED_REPORTS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }
};

export const deleteBugReport = async (reportId: string): Promise<void> => {
  const docRef = doc(db, 'bug_reports', reportId);
  await deleteDoc(docRef);

  try {
    const existingStr = localStorage.getItem(LOCAL_SAVED_REPORTS_KEY);
    if (existingStr) {
      const list: BugReport[] = JSON.parse(existingStr);
      localStorage.setItem(LOCAL_SAVED_REPORTS_KEY, JSON.stringify(list.filter((r) => r.id !== reportId)));
    }
  } catch (e) {
    // ignore
  }
};

