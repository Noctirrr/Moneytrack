import { Category, TransactionType } from '../types';

export interface ParsedTransactionResult {
  type: TransactionType;
  amount: number | null;
  date: string; // YYYY-MM-DD
  dateDisplay: string; // Readable Thai date
  categoryId: string;
  categoryName: string;
  note: string;
  confidence: number;
  extractedDetails: {
    rawAmountText?: string;
    rawDateText?: string;
    matchedKeywords: string[];
    isTypeExplicit: boolean;
  };
}

export interface ChatCorrectionResult {
  isCorrection: boolean;
  hasChanges: boolean;
  updatedFields: {
    type?: TransactionType;
    amount?: number;
    categoryId?: string;
    categoryName?: string;
    date?: string;
    dateDisplay?: string;
    note?: string;
    walletId?: string;
  };
  changeDescriptions: string[];
  replyMessage: string;
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatToISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const THAI_MONTHS: { [key: string]: number } = {
  'ม.ค.': 0, 'มกรา': 0, 'มกราคม': 0,
  'ก.พ.': 1, 'กุมภา': 1, 'กุมภาพันธ์': 1,
  'มี.ค.': 2, 'มีนา': 2, 'มีนาคม': 2,
  'เม.ย.': 3, 'เมษา': 3, 'เมษายน': 3,
  'พ.ค.': 4, 'พฤษภา': 4, 'พฤษภาคม': 4,
  'มิ.ย.': 5, 'มิถุนา': 5, 'มิถุนายน': 5,
  'ก.ค.': 6, 'กรกฎา': 6, 'กรกฎาคม': 6,
  'ส.ค.': 7, 'สิงหา': 7, 'สิงหาคม': 7,
  'ก.ย.': 8, 'กันยา': 8, 'กันยายน': 8,
  'ต.ค.': 9, 'ตุลา': 9, 'ตุลาคม': 9,
  'พ.ย.': 10, 'พฤศจิกา': 10, 'พฤศจิกายน': 10,
  'ธ.ค.': 11, 'ธันวา': 11, 'ธันวาคม': 11,
};

/**
 * Extracts date from Thai message, defaulting to today
 */
export function extractDateFromThaiText(text: string): { date: string; display: string; matchedText?: string } {
  const today = new Date();
  const lower = text.toLowerCase();

  // Check "เมื่อวาน" or "เมื่อวานนี้"
  if (/เมื่อวานนี้?/.test(lower)) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return {
      date: formatToISODate(yesterday),
      display: 'เมื่อวาน',
      matchedText: 'เมื่อวาน',
    };
  }

  // Check "วันนี้"
  if (/วันนี้/.test(lower)) {
    return {
      date: formatToISODate(today),
      display: 'วันนี้',
      matchedText: 'วันนี้',
    };
  }

  // Check "พรุ่งนี้"
  if (/พรุ่งนี้/.test(lower)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      date: formatToISODate(tomorrow),
      display: 'พรุ่งนี้',
      matchedText: 'พรุ่งนี้',
    };
  }

  // Check explicit date like "19 ก.ย.", "20 กันยายน", "15 ม.ค. 67"
  const monthRegex = /(?:วันที่)?\s*(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)(?:\s*(\d{2,4}))?/i;
  const monthMatch = text.match(monthRegex);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const mStr = monthMatch[2];
    const monthIndex = THAI_MONTHS[mStr] !== undefined ? THAI_MONTHS[mStr] : today.getMonth();
    let year = today.getFullYear();
    if (monthMatch[3]) {
      const rawYear = parseInt(monthMatch[3], 10);
      if (rawYear > 2400) {
        year = rawYear - 543;
      } else if (rawYear < 100) {
        year = 2000 + (rawYear > 50 ? rawYear - 43 : rawYear);
      } else {
        year = rawYear;
      }
    }
    const parsed = new Date(year, monthIndex, day);
    if (!isNaN(parsed.getTime())) {
      return {
        date: formatToISODate(parsed),
        display: `${day} ${mStr}`,
        matchedText: monthMatch[0],
      };
    }
  }

  // Check DD/MM or DD/MM/YYYY
  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = today.getFullYear();
    if (slashMatch[3]) {
      const yVal = parseInt(slashMatch[3], 10);
      year = yVal > 2400 ? yVal - 543 : (yVal < 100 ? 2000 + yVal : yVal);
    }
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) {
      return {
        date: formatToISODate(parsed),
        display: `${day}/${month + 1}/${year}`,
        matchedText: slashMatch[0],
      };
    }
  }

  // Default to today
  return {
    date: formatToISODate(today),
    display: 'วันนี้',
  };
}

/**
 * Extracts transaction amount from text
 */
export function extractAmountFromThaiText(text: string): { amount: number | null; matchedText?: string } {
  // 1. Try pattern with "บาท", "บ.", "฿" first, e.g. "50 บาท", "1,200 บ.", "60฿", "1000 บาท"
  const withCurrencyRegex = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:บาท|บ\.|฿)/i;
  const currencyMatch = text.match(withCurrencyRegex);
  if (currencyMatch) {
    const cleanNum = currencyMatch[1].replace(/,/g, '');
    const num = parseFloat(cleanNum);
    if (!isNaN(num) && num > 0) {
      return { amount: num, matchedText: currencyMatch[0] };
    }
  }

  // 2. Look for patterns preceded by financial verbs e.g. "จ่าย 50", "ได้ 60", "ราคา 120", "ยอด 500", "ได้ตัง 1000"
  const verbPrefixRegex = /(?:จ่ายไป|จ่าย|ได้เงินจาก|ได้ตังค์จาก|ได้ตังจาก|ได้เงิน|ได้ตังค์|ได้ตัง|ได้ค่า|ได้รับเงิน|รับเงิน|ได้|รับ|เสีย|ราคา|ยอด|ค่า|โอนให้|โอน)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|\d+(?:\.\d{1,2})?)/i;
  const verbMatch = text.match(verbPrefixRegex);
  if (verbMatch) {
    const cleanNum = verbMatch[1].replace(/,/g, '');
    const num = parseFloat(cleanNum);
    if (!isNaN(num) && num > 0) {
      return { amount: num, matchedText: verbMatch[0] };
    }
  }

  // 3. Look for standalone numbers with k/พัน/หมื่น suffix, e.g. "500k", "2พัน"
  const multiplierMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(k|พัน|หมื่น|แสน)/i);
  if (multiplierMatch) {
    const base = parseFloat(multiplierMatch[1]);
    const unit = multiplierMatch[2].toLowerCase();
    let mult = 1;
    if (unit === 'k' || unit === 'พัน') mult = 1000;
    else if (unit === 'หมื่น') mult = 10000;
    else if (unit === 'แสน') mult = 100000;
    const finalAmount = base * mult;
    if (!isNaN(finalAmount) && finalAmount > 0) {
      return { amount: finalAmount, matchedText: multiplierMatch[0] };
    }
  }

  // 4. General number match (excluding dates if already matched)
  const generalNumRegex = /(?:^|\s)([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|\d+(?:\.\d{1,2})?)(?:\s|$)/g;
  let match;
  const numbers: { val: number; raw: string }[] = [];
  while ((match = generalNumRegex.exec(text)) !== null) {
    const raw = match[1].replace(/,/g, '');
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      numbers.push({ val, raw: match[1] });
    }
  }

  if (numbers.length > 0) {
    // Return the first valid amount
    return { amount: numbers[0].val, matchedText: numbers[0].raw };
  }

  return { amount: null };
}

// Spoken Thai patterns indicating INCOME (รายรับ)
const INCOME_PATTERNS: RegExp[] = [
  // ได้ตัง / ได้เงิน / ได้ตังค์ จากบุคคลหรือการกระทำ เช่น "ได้ตังจากพี่", "ได้ตัง", "ได้ตังค์"
  /ได้ตัง(?:ค์)?จาก/i,
  /ได้ตัง(?:ค์)?/i,
  /ได้เงินจาก/i,
  /ได้เงิน/i,
  /ได้รับเงิน/i,
  /รับเงิน/i,
  /รับตัง(?:ค์)?/i,
  /ได้ค่า/i,
  /ได้ตังค์มา/i,
  /ได้มา/i,
  
  // Person transferred to me: "พี่โอนให้", "แม่โอนให้", "พ่อโอนให้", "แฟนโอนให้", "ลูกค้าโอนให้", "คนโอนมา", "โอนมาให้"
  /(?:พี่|แม่|พ่อ|เพื่อน|แฟน|น้อง|หัวหน้า|ลูกค้า|คน|เขา|ป้า|ลุง|น้า|อา|บริษัท|ที่ทำงาน)\s*(?:โอนให้|โอนมาให้|โอนมา|ให้ตัง(?:ค์)?|ให้เงิน|จ่ายให้)/i,
  /โอนมาให้/i,
  /โอนมา/i,
  /โอนเข้า/i,
  /เงินเข้า/i,
  /ตัง(?:ค์)?เข้า/i,

  // Salary & Work income
  /เงินเดือนเข้า/i,
  /เงินเดือนออก/i,
  /ได้เงินเดือน/i,
  /เงินเดือน/i,
  /ค่าจ้าง/i,
  /จ้างงาน/i,
  /รับจ้าง/i,
  /งานเสริม/i,
  /รายได้เสริม/i,
  /ฟรีแลนซ์/i,
  
  // Extra, sales, lottery, investment
  /โบนัส/i,
  /ปันผล/i,
  /ดอกเบี้ย/i,
  /ได้กำไร/i,
  /กำไร/i,
  /ขายของได้/i,
  /ขายได้/i,
  /ทิป/i,
  /คืนเงิน/i,
  /เงินคืน/i,
  /ถูกหวย/i,
  /ถูกรางวัล/i,
  /รายได้/i,
  /รายรับ/i,
  /income/i,
  /salary/i,
  /bonus/i,
];

// Spoken Thai patterns indicating EXPENSE (รายจ่าย)
const EXPENSE_PATTERNS: RegExp[] = [
  // จ่ายไป / ซื้อมา / กิน / ใช้ไป
  /จ่ายไป/i,
  /จ่าย/i,
  /ซื้อมา/i,
  /ซื้อ/i,
  /กินข้าว/i,
  /กิน/i,
  /เติมน้ำมัน/i,
  /เติม/i,
  /เสียตัง(?:ค์)?/i,
  /เสียเงิน/i,
  /เสีย/i,
  /ชำระ/i,
  /ช้อป/i,
  /สั่งของ/i,
  /สั่ง/i,
  /เลี้ยง/i,
  /บิล/i,
  
  // Transfer to someone: "โอนให้พี่", "โอนให้แม่", "โอนจ่าย", "โอนออก", "โอนไป"
  /โอนจ่าย/i,
  /โอนออก/i,
  /โอนไป(?:ให้)?/i,
  /โอนให้\s*(?:พี่|แม่|พ่อ|เพื่อน|แฟน|น้อง|หัวหน้า|ลูกค้า|คน|เขา|ป้า|ลุง|น้า|อา|ร้าน)/i,

  /หมดไป/i,
  /ใช้ไป/i,
  /โดนหัก/i,
  /หักเงิน/i,
  /ค่าห้อง/i,
  /ค่าหอ/i,
  /ค่าไฟ/i,
  /ค่าน้ำ/i,
  /ค่าเน็ต/i,
  /ค่ารถ/i,
  /รายจ่าย/i,
  /expense/i,
];

// Category keyword mappings for common Thai phrases
const CATEGORY_RULES: {
  id: string;
  defaultType: TransactionType;
  keywords: string[];
}[] = [
  {
    id: 'food',
    defaultType: 'expense',
    keywords: [
      'กินข้าว', 'ข้าว', 'อาหาร', 'ก๋วยเตี๋ยว', 'กาแฟ', 'ชา', 'ชานม', 'ขนม', 
      'น้ำ', 'หมูกระทะ', 'ชาบู', 'บุฟเฟต์', 'ส้มตำ', 'ข้าวเที่ยง', 'ข้าวเย็น', 
      'ข้าวเช้า', 'มื้อเช้า', 'มื้อเที่ยง', 'มื้อเย็น', 'ตามสั่ง', 'เซเว่น', '7-11', 
      'kfc', 'mcdonald', 'amazon', 'starbucks', 'เครื่องดื่ม', 'กิน', 'ร้านอาหาร',
      'กะเพรา', 'ของหวาน', 'เบเกอรี่', 'ผลไม้', 'ไอติม', 'ไอศกรีม', 'บาร์', 'เหล้า', 'เบียร์',
      'กับข้าว', 'มื้อดึก', 'เค้ก'
    ],
  },
  {
    id: 'transportation',
    defaultType: 'expense',
    keywords: [
      'เดินทาง', 'น้ำมัน', 'เติมน้ำมัน', 'bts', 'mrt', 'รถเมล์', 'แท็กซี่', 'taxi', 
      'วิน', 'มอเตอร์ไซค์', 'แกร็บ', 'grab', 'bolt', 'รถไฟ', 'ค่ารถ', 'ทางด่วน', 
      'ตั๋ว', 'ค่าเดินทาง', 'ที่จอดรถ', 'ค่าจอดรถ', 'ล้างรถ', 'ซ่อมรถ', 'เครื่องบิน', 'รถตู้'
    ],
  },
  {
    id: 'shopping',
    defaultType: 'expense',
    keywords: [
      'ซื้อของ', 'ช้อป', 'ช้อปปิ้ง', 'สั่งของ', 'เสื้อผ้า', 'เสื้อ', 'กางเกง', 
      'รองเท้า', 'shopee', 'lazada', 'tiktok', 'เครื่องสำอาง', 'ครีม', 'กระเป๋า', 
      'ของใช้', 'ห้าง', 'ตลาด', 'ซื้อ', 'ซื้อมา'
    ],
  },
  {
    id: 'bills',
    defaultType: 'expense',
    keywords: [
      'บิล', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าเน็ต', 'เน็ตบ้าน', 'ค่าโทรศัพท์', 'ค่าห้อง', 
      'ค่าหอ', 'ค่าเช่า', 'ประกัน', 'ผ่อน', 'ค่างวด', 'บัตรเครดิต', 'ค่าส่วนกลาง', 
      'หนี้', 'ภาษี'
    ],
  },
  {
    id: 'entertainment',
    defaultType: 'expense',
    keywords: [
      'ดูหนัง', 'หนัง', 'ตั๋วหนัง', 'netflix', 'youtube', 'spotify', 'เกม', 
      'เติมเกม', 'คอนเสิร์ต', 'เที่ยว', 'คาราโอเกะ', 'ร้องเกะ', 'ท่องเที่ยว', 'สวนสนุก'
    ],
  },
  {
    id: 'salary',
    defaultType: 'income',
    keywords: ['เงินเดือน', 'salary', 'เงินเดือนเข้า', 'เงินเดือนออก', 'เงินออก', 'ได้เงินเดือน'],
  },
  {
    id: 'bonus',
    defaultType: 'income',
    keywords: [
      'ได้ตังจากพี่', 'ได้ตังจาก', 'ได้เงินจาก', 'ได้ตัง', 'ได้ตังค์', 'พี่โอนให้', 'แม่โอนให้',
      'พ่อโอนให้', 'แฟนโอนให้', 'เพื่อนโอนให้', 'โอนมาให้', 'เงินได้รับ', 'จ้างงาน', 
      'รับจ้าง', 'การจ้างงาน', 'งานเสริม', 'ฟรีแลนซ์', 'โบนัส', 'ขายของได้', 
      'ขายได้', 'กำไร', 'ค่าคอม', 'คอมมิชชั่น', 'เงินพิเศษ', 'ทิป', 'รายได้เสริม',
      'เงินได้'
    ],
  },
  {
    id: 'investment',
    defaultType: 'income',
    keywords: [
      'ปันผล', 'เงินปันผล', 'ดอกเบี้ย', 'กำไรหุ้น', 'หุ้น', 'กองทุน', 'คริปโต', 
      'บิตคอยน์', 'ทองคำ', 'เทรด'
    ],
  },
];

/**
 * Main Thai Finance NLP Analyzer
 */
export function parseThaiFinanceMessage(
  text: string,
  categories: Category[]
): ParsedTransactionResult {
  const trimmed = text.trim();
  const matchedKeywords: string[] = [];

  // 1. Extract Amount
  const { amount, matchedText: rawAmountText } = extractAmountFromThaiText(trimmed);
  if (rawAmountText) matchedKeywords.push(rawAmountText);

  // 2. Extract Date (defaults to today)
  const { date, display: dateDisplay, matchedText: rawDateText } = extractDateFromThaiText(trimmed);
  if (rawDateText) matchedKeywords.push(rawDateText);

  // 3. Determine Type (Income vs Expense) from conversational semantics
  let isTypeExplicit = false;
  let detectedType: TransactionType = 'expense';

  // Check income patterns
  let incomeMatchIndex = -1;
  for (const pat of INCOME_PATTERNS) {
    const match = trimmed.match(pat);
    if (match) {
      const idx = trimmed.indexOf(match[0]);
      if (incomeMatchIndex === -1 || idx < incomeMatchIndex) {
        incomeMatchIndex = idx;
        matchedKeywords.push(match[0]);
      }
    }
  }

  // Check expense patterns
  let expenseMatchIndex = -1;
  for (const pat of EXPENSE_PATTERNS) {
    const match = trimmed.match(pat);
    if (match) {
      const idx = trimmed.indexOf(match[0]);
      if (expenseMatchIndex === -1 || idx < expenseMatchIndex) {
        expenseMatchIndex = idx;
        matchedKeywords.push(match[0]);
      }
    }
  }

  if (incomeMatchIndex !== -1 && expenseMatchIndex === -1) {
    detectedType = 'income';
    isTypeExplicit = true;
  } else if (incomeMatchIndex === -1 && expenseMatchIndex !== -1) {
    detectedType = 'expense';
    isTypeExplicit = true;
  } else if (incomeMatchIndex !== -1 && expenseMatchIndex !== -1) {
    // Both matched (e.g. "ได้ตังจากพี่ไปซื้อข้าว" or "พี่โอนให้จ่ายค่าไฟ")
    // The earlier intent usually describes the primary action
    detectedType = incomeMatchIndex <= expenseMatchIndex ? 'income' : 'expense';
    isTypeExplicit = true;
  } else {
    // Default assumption: if no explicit markers, assume expense
    detectedType = 'expense';
  }

  // 4. Determine Category
  // Default to appropriate category for detected type
  let matchedCategoryId: string = detectedType === 'income' ? 'bonus' : 'food';
  let bestScore = 0;

  // Check user custom categories first
  for (const cat of categories) {
    if (cat.nameTh && trimmed.includes(cat.nameTh)) {
      matchedCategoryId = cat.id;
      bestScore = 100;
      matchedKeywords.push(cat.nameTh);
      if (cat.type !== 'both') detectedType = cat.type;
      break;
    }
    if (cat.nameEn && trimmed.toLowerCase().includes(cat.nameEn.toLowerCase())) {
      matchedCategoryId = cat.id;
      bestScore = 100;
      matchedKeywords.push(cat.nameEn);
      if (cat.type !== 'both') detectedType = cat.type;
      break;
    }
  }

  if (bestScore < 100) {
    // Match against built-in rule sets
    for (const rule of CATEGORY_RULES) {
      for (const kw of rule.keywords) {
        if (trimmed.includes(kw)) {
          // Weight longer keywords higher
          const score = kw.length * 2;
          if (score > bestScore) {
            bestScore = score;
            matchedCategoryId = rule.id;
            // If the category is strictly an income category, adjust detected type if not explicitly expense
            if (rule.defaultType === 'income' && expenseMatchIndex === -1) {
              detectedType = 'income';
            }
          }
        }
      }
    }
  }

  // If detectedType is income but matchedCategoryId is an expense-only category, fix to an income category
  const targetCategory = categories.find((c) => c.id === matchedCategoryId);
  if (targetCategory && targetCategory.type !== 'both' && targetCategory.type !== detectedType) {
    const fallbackCategory = categories.find((c) => c.type === detectedType || c.type === 'both');
    if (fallbackCategory) {
      matchedCategoryId = fallbackCategory.id;
    }
  }

  // Verify matched category exists in the passed categories; fallback if needed
  const matchedCategory = categories.find((c) => c.id === matchedCategoryId) ||
    categories.find((c) => c.type === detectedType || c.type === 'both') ||
    categories[0];

  // Friendly category display name
  let categoryName = matchedCategory ? matchedCategory.nameTh : 'อื่นๆ';
  if (detectedType === 'income' && (matchedCategoryId === 'bonus' || matchedCategoryId === 'other')) {
    // If text specifically mentioned ได้ตังจากพี่ or เงินได้รับ, keep it friendly
    if (trimmed.includes('ได้ตัง') || trimmed.includes('โอนให้') || trimmed.includes('เงินได้รับ')) {
      categoryName = matchedCategory?.nameTh || 'เงินได้รับ / รายได้พิเศษ';
    }
  }

  // 5. Extract Note / Description (keep meaningful conversational intent)
  let cleanedNote = trimmed;
  if (rawAmountText) {
    cleanedNote = cleanedNote.replace(rawAmountText, '');
  }
  if (rawDateText) {
    cleanedNote = cleanedNote.replace(rawDateText, '');
  }

  // Remove trailing currency words or leading fillers
  cleanedNote = cleanedNote
    .replace(/(?:วันนี้|เมื่อวานนี้?|พรุ่งนี้)/g, '')
    .replace(/(?:บาท|บ\.|฿)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let finalNote = cleanedNote;
  if (!finalNote || finalNote.length < 2) {
    // Sensible defaults if stripped too far
    if (/ได้ตัง(?:ค์)?จาก/.test(trimmed)) {
      const match = trimmed.match(/ได้ตัง(?:ค์)?จาก\s*([^\s0-9]+)/);
      finalNote = match ? `ได้ตังจาก${match[1]}` : 'ได้ตัง';
    } else if (/โอนให้/.test(trimmed)) {
      finalNote = trimmed;
    } else if (trimmed.includes('กินข้าว')) {
      finalNote = 'กินข้าว';
    } else if (trimmed.includes('กาแฟ')) {
      finalNote = 'กาแฟ';
    } else if (trimmed.includes('น้ำมัน')) {
      finalNote = 'เติมน้ำมัน';
    } else if (trimmed.includes('เงินเดือน')) {
      finalNote = 'เงินเดือน';
    } else {
      finalNote = trimmed;
    }
  }

  // Clean leading/trailing orphan words
  finalNote = finalNote.replace(/^(?:ไป|ของ|ยอด|จำนวน|ราคา)\s*/, '').trim();

  // Confidence calculation
  let confidence = 0.6;
  if (amount !== null) confidence += 0.25;
  if (bestScore > 0) confidence += 0.1;
  if (isTypeExplicit) confidence += 0.05;

  return {
    type: detectedType,
    amount,
    date,
    dateDisplay,
    categoryId: matchedCategory ? matchedCategory.id : 'other',
    categoryName,
    note: finalNote || categoryName,
    confidence: Math.min(confidence, 1),
    extractedDetails: {
      rawAmountText,
      rawDateText,
      matchedKeywords,
      isTypeExplicit,
    },
  };
}

/**
 * Checks if a chat message is attempting to modify/correct the active draft transaction
 * Examples:
 * - "ไม่ใช่รายรับ เป็นรายจ่าย"
 * - "เปลี่ยนเป็น 500 บาท"
 * - "เปลี่ยนหมวดเป็นอาหาร"
 * - "วันที่เมื่อวาน"
 * - "แก้รายละเอียดเป็น ได้เงินจากพี่"
 */
export function parseChatCorrection(
  text: string,
  currentDraft: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    walletId: string;
    date: string;
    note: string;
  },
  categories: Category[]
): ChatCorrectionResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const changeDescriptions: string[] = [];
  const updatedFields: ChatCorrectionResult['updatedFields'] = {};

  let isCorrectionIntent = false;

  // Triggers that signal correction / modification
  const correctionTriggerWords = [
    'ไม่ใช่', 'แก้เป็น', 'แก้', 'เปลี่ยนเป็น', 'เปลี่ยน', 'เป็นรายรับ', 'เป็นรายจ่าย',
    'หมวด', 'หมวดหมู่', 'วันที่', 'เมื่อวาน', 'วันนี้', 'รายละเอียด', 'โน้ต'
  ];
  const hasTriggerWord = correctionTriggerWords.some((w) => trimmed.includes(w));

  // 1. Check TYPE modification
  // e.g. "ไม่ใช่รายรับ เป็นรายจ่าย", "เปลี่ยนเป็นรายจ่าย", "เป็นรายจ่าย", "รายจ่าย"
  if (
    /(?:ไม่ใช่\s*รายรับ|เปลี่ยนเป็น\s*รายจ่าย|แก้เป็น\s*รายจ่าย|เป็นรายจ่าย|^รายจ่าย$)/i.test(trimmed) ||
    (trimmed.includes('รายจ่าย') && !trimmed.includes('รายรับ'))
  ) {
    if (currentDraft.type !== 'expense') {
      updatedFields.type = 'expense';
      changeDescriptions.push('ประเภท: รายจ่าย (-)');
      isCorrectionIntent = true;

      // Also adjust category if currently on an income-only category
      const currentCat = categories.find((c) => c.id === currentDraft.categoryId);
      if (currentCat && currentCat.type === 'income') {
        const fallbackExp = categories.find((c) => c.type === 'expense') || categories[0];
        updatedFields.categoryId = fallbackExp.id;
        updatedFields.categoryName = fallbackExp.nameTh;
        changeDescriptions.push(`หมวดหมู่: ${fallbackExp.nameTh}`);
      }
    }
  } else if (
    /(?:ไม่ใช่\s*รายจ่าย|เปลี่ยนเป็น\s*รายรับ|แก้เป็น\s*รายรับ|เป็นรายรับ|^รายรับ$)/i.test(trimmed) ||
    (trimmed.includes('รายรับ') && !trimmed.includes('รายจ่าย'))
  ) {
    if (currentDraft.type !== 'income') {
      updatedFields.type = 'income';
      changeDescriptions.push('ประเภท: รายรับ (+)');
      isCorrectionIntent = true;

      // Also adjust category if currently on an expense-only category
      const currentCat = categories.find((c) => c.id === currentDraft.categoryId);
      if (currentCat && currentCat.type === 'expense') {
        const fallbackInc = categories.find((c) => c.type === 'income') || categories[0];
        updatedFields.categoryId = fallbackInc.id;
        updatedFields.categoryName = fallbackInc.nameTh;
        changeDescriptions.push(`หมวดหมู่: ${fallbackInc.nameTh}`);
      }
    }
  }

  // 2. Check AMOUNT modification
  // e.g. "เปลี่ยนเป็น 500 บาท", "แก้เป็น 500", "500 บาท", "แก้ราคาเป็น 200", "500"
  const amountMatch = trimmed.match(/(?:เปลี่ยนเป็น|แก้เป็น|เปลี่ยนจำนวนเป็น|เป็น|ยอด|ราคา)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:บาท|บ\.|฿)?$/i);
  if (amountMatch && (hasTriggerWord || /^\d+(?:\.\d{1,2})?$/.test(trimmed) || /^\d+\s*บาท$/.test(trimmed))) {
    const rawVal = amountMatch[1].replace(/,/g, '');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0 && num !== currentDraft.amount) {
      updatedFields.amount = num;
      changeDescriptions.push(`จำนวนเงิน: ฿${num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      isCorrectionIntent = true;
    }
  }

  // 3. Check CATEGORY modification
  // e.g. "เปลี่ยนหมวดเป็นอาหาร", "หมวดเดินทาง", "เปลี่ยนเป็นหมวดช้อปปิ้ง", "แก้หมวดเป็นอาหาร"
  const categoryTrigger = /(?:เปลี่ยนหมวด(?:หมู่)?(?:เป็น)?|แก้หมวด(?:เป็น)?|หมวด(?:หมู่)?)\s*(.+)/i.exec(trimmed);
  const targetCategoryText = categoryTrigger ? categoryTrigger[1].trim() : (hasTriggerWord ? trimmed : '');

  if (targetCategoryText) {
    // Search matching category
    let foundCat: Category | undefined;
    for (const cat of categories) {
      if (
        cat.nameTh.toLowerCase().includes(targetCategoryText.toLowerCase()) ||
        targetCategoryText.toLowerCase().includes(cat.nameTh.toLowerCase()) ||
        (cat.nameEn && targetCategoryText.toLowerCase().includes(cat.nameEn.toLowerCase()))
      ) {
        foundCat = cat;
        break;
      }
    }

    // Keyword rule fallback (e.g. user said "หมวดกิน" or "หมวดกาแฟ" -> food)
    if (!foundCat) {
      for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some((kw) => targetCategoryText.includes(kw))) {
          foundCat = categories.find((c) => c.id === rule.id);
          if (foundCat) break;
        }
      }
    }

    if (foundCat && foundCat.id !== currentDraft.categoryId) {
      updatedFields.categoryId = foundCat.id;
      updatedFields.categoryName = foundCat.nameTh;
      changeDescriptions.push(`หมวดหมู่: ${foundCat.nameTh}`);
      isCorrectionIntent = true;

      // If category has specific type, adjust transaction type if needed
      if (foundCat.type !== 'both' && (updatedFields.type || currentDraft.type) !== foundCat.type) {
        updatedFields.type = foundCat.type;
        changeDescriptions.push(`ประเภท: ${foundCat.type === 'income' ? 'รายรับ (+)' : 'รายจ่าย (-)'}`);
      }
    }
  }

  // 4. Check DATE modification
  // e.g. "วันที่เมื่อวาน", "เปลี่ยนเป็นเมื่อวาน", "วันที่ 15 ม.ค.", "วันนี้", "เมื่อวาน"
  if (
    trimmed.includes('เมื่อวาน') ||
    trimmed.includes('วันนี้') ||
    trimmed.includes('พรุ่งนี้') ||
    /(?:วันที่|เปลี่ยนวัน|แก้วัน)\s*(\d{1,2})/.test(trimmed)
  ) {
    const { date, display } = extractDateFromThaiText(trimmed);
    if (date !== currentDraft.date) {
      updatedFields.date = date;
      updatedFields.dateDisplay = display;
      changeDescriptions.push(`วันที่: ${display} (${date})`);
      isCorrectionIntent = true;
    }
  }

  // 5. Check NOTE / DESCRIPTION modification
  // e.g. "แก้รายละเอียดเป็น ได้เงินจากพี่", "เปลี่ยนรายละเอียดเป็น ซื้อขนม", "เปลี่ยนโน้ตเป็น...", "รายละเอียดคือ..."
  const noteMatch = /(?:แก้รายละเอียด(?:เป็น)?|เปลี่ยนรายละเอียด(?:เป็น)?|เปลี่ยนโน้ต(?:เป็น)?|รายละเอียด(?:คือ)?|โน้ต(?:คือ)?)\s*(.+)/i.exec(trimmed);
  if (noteMatch && noteMatch[1].trim()) {
    const newNote = noteMatch[1].trim();
    if (newNote !== currentDraft.note) {
      updatedFields.note = newNote;
      changeDescriptions.push(`รายละเอียด: ${newNote}`);
      isCorrectionIntent = true;
    }
  }

  const hasChanges = changeDescriptions.length > 0;
  let replyMessage = '';

  if (hasChanges) {
    replyMessage = `ระบบได้แก้ไขข้อมูลตามที่คุณระบุแล้ว (${changeDescriptions.join(', ')}) กรุณาตรวจสอบรายละเอียดและกดยืนยันการบันทึก`;
  } else if (isCorrectionIntent) {
    replyMessage = 'ระบบรับทราบคำสั่งแก้ไข แต่ค่าที่ระบุตรงกับข้อมูลปัจจุบันอยู่แล้ว คุณสามารถระบุจุดที่ต้องการแก้ไขเพิ่มเติม หรือกดยืนยันการบันทึกได้ทันที';
  }

  return {
    isCorrection: isCorrectionIntent || (hasTriggerWord && hasChanges),
    hasChanges,
    updatedFields,
    changeDescriptions,
    replyMessage,
  };
}
