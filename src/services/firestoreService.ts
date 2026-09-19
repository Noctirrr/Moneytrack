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
import { db } from '../firebase';
import { Transaction, Category } from '../types';

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
  transaction: Omit<Transaction, 'id'> & { id?: string }
): Promise<string> => {
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
