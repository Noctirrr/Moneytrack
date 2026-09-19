import { Wallet, Transaction, Budget, Category } from '../types';

export interface WalletWithBalance extends Wallet {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  totalTransferIn: number;
  totalTransferOut: number;
}

/**
 * Calculates current balance for all wallets based on transactions
 */
export function calculateWalletBalances(
  wallets: Wallet[],
  transactions: Transaction[]
): {
  walletsWithBalance: WalletWithBalance[];
  totalNetWorth: number;
  walletMap: Map<string, WalletWithBalance>;
} {
  const defaultWallet = wallets.find((w) => w.isDefault) || wallets[0];
  const walletMap = new Map<string, WalletWithBalance>();

  wallets.forEach((w) => {
    walletMap.set(w.id, {
      ...w,
      balance: w.initialBalance || 0,
      totalIncome: 0,
      totalExpense: 0,
      totalTransferIn: 0,
      totalTransferOut: 0,
    });
  });

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      const targetId = tx.walletId || defaultWallet?.id;
      if (targetId && walletMap.has(targetId)) {
        const w = walletMap.get(targetId)!;
        w.balance += tx.amount;
        w.totalIncome += tx.amount;
      }
    } else if (tx.type === 'expense') {
      const targetId = tx.walletId || defaultWallet?.id;
      if (targetId && walletMap.has(targetId)) {
        const w = walletMap.get(targetId)!;
        w.balance -= tx.amount;
        w.totalExpense += tx.amount;
      }
    } else if (tx.type === 'transfer') {
      // Outbound from walletId
      if (tx.walletId && walletMap.has(tx.walletId)) {
        const fromW = walletMap.get(tx.walletId)!;
        fromW.balance -= tx.amount;
        fromW.totalTransferOut += tx.amount;
      }
      // Inbound to toWalletId
      if (tx.toWalletId && walletMap.has(tx.toWalletId)) {
        const toW = walletMap.get(tx.toWalletId)!;
        toW.balance += tx.amount;
        toW.totalTransferIn += tx.amount;
      }
    }
  });

  const walletsWithBalance = Array.from(walletMap.values());
  const totalNetWorth = walletsWithBalance.reduce((sum, w) => sum + w.balance, 0);

  return { walletsWithBalance, totalNetWorth, walletMap };
}

export interface BudgetStatus {
  budget: Budget;
  category?: Category;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOver: boolean;
  isNearLimit: boolean;
}

export interface OverallBudgetProgress {
  hasBudget: boolean;
  totalLimit: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  monthElapsedPercent: number;
  dailyAllowanceRemaining: number;
  status: 'safe' | 'warning' | 'danger';
  statusMessageTh: string;
  statusMessageEn: string;
  categoryBudgets: BudgetStatus[];
}

/**
 * Calculates current month's budget progress and pacing analytics
 */
export function calculateBudgetProgress(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  currentDate: Date = new Date()
): OverallBudgetProgress {
  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;
  const monthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const currentDay = currentDate.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
  const monthElapsedPercent = Math.min(100, Math.round((currentDay / daysInMonth) * 100));

  // Find relevant active budgets for this month
  const activeBudgets = budgets.filter(
    (b) => b.monthKey === monthKey || b.monthKey === 'all'
  );

  // Overall monthly budget
  const totalBudget = activeBudgets.find(
    (b) => !b.categoryId || b.categoryId === 'total'
  );

  // Current month's expenses
  const monthExpenses = transactions.filter((tx) => {
    return tx.type === 'expense' && tx.date.startsWith(monthKey);
  });

  const totalSpent = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const totalLimit = totalBudget ? totalBudget.amount : 0;
  const hasBudget = totalLimit > 0;

  const remaining = Math.max(0, totalLimit - totalSpent);
  const percentage = hasBudget ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const dailyAllowanceRemaining = Math.max(0, Math.round(remaining / daysRemaining));

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  let statusMessageTh = 'การใช้จ่ายอยู่ในเกณฑ์ควบคุมที่ดี';
  let statusMessageEn = 'Spending is well within budget';

  if (hasBudget) {
    if (totalSpent > totalLimit) {
      status = 'danger';
      const overAmount = totalSpent - totalLimit;
      statusMessageTh = `เกินงบประมาณแล้ว +${overAmount.toLocaleString()} บาท`;
      statusMessageEn = `Over budget by +฿${overAmount.toLocaleString()}`;
    } else if (percentage >= 85 || percentage > monthElapsedPercent + 20) {
      status = 'warning';
      statusMessageTh = `ใช้เงินเร็วกว่าปกติ (${percentage}% ของงบ ใน ${monthElapsedPercent}% ของเดือน) แนะนำใช้วันละไม่เกิน ฿${dailyAllowanceRemaining.toLocaleString()}`;
      statusMessageEn = `Spending pacing faster than expected. Recommended max ฿${dailyAllowanceRemaining.toLocaleString()}/day`;
    } else {
      status = 'safe';
      statusMessageTh = `อยู่ในแผนการเงิน แนะนำใช้วันละไม่เกิน ฿${dailyAllowanceRemaining.toLocaleString()} ใน ${daysRemaining} วันที่เหลือ`;
      statusMessageEn = `On track. Allowance ~฿${dailyAllowanceRemaining.toLocaleString()}/day for remaining ${daysRemaining} days`;
    }
  }

  // Category specific budgets
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const categoryBudgets: BudgetStatus[] = activeBudgets
    .filter((b) => b.categoryId && b.categoryId !== 'total')
    .map((b) => {
      const cat = categoryMap.get(b.categoryId!);
      const catSpent = monthExpenses
        .filter((tx) => tx.categoryId === b.categoryId)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const catRemaining = Math.max(0, b.amount - catSpent);
      const catPercent = b.amount > 0 ? Math.round((catSpent / b.amount) * 100) : 0;

      return {
        budget: b,
        category: cat,
        limit: b.amount,
        spent: catSpent,
        remaining: catRemaining,
        percentage: catPercent,
        isOver: catSpent > b.amount,
        isNearLimit: catPercent >= (b.alertThreshold || 80),
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  return {
    hasBudget,
    totalLimit,
    totalSpent,
    remaining,
    percentage,
    daysInMonth,
    currentDay,
    daysRemaining,
    monthElapsedPercent,
    dailyAllowanceRemaining,
    status,
    statusMessageTh,
    statusMessageEn,
    categoryBudgets,
  };
}
