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
import { Transaction, Category, SystemAnnouncement, SystemConfig, UserProfile } from '../types';
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
