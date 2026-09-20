import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Tag, 
  Wallet as WalletIcon, 
  FileText, 
  Check, 
  X, 
  Bot, 
  User as UserIcon, 
  Sparkles,
  ChevronRight,
  Edit3,
  CheckCircle2,
  HelpCircle,
  CornerDownLeft
} from 'lucide-react';
import { Transaction, Category, Wallet, Language, TransactionType } from '../types';
import { 
  parseThaiFinanceMessage, 
  parseChatCorrection,
  ParsedTransactionResult 
} from '../utils/thaiFinanceParser';
import { CategoryIcon } from './CategoryIcon';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  parsedDraft?: ParsedTransactionResult | null;
  status?: 'pending_confirmation' | 'confirmed' | 'cancelled';
  savedTransactionId?: string;
  updatedFieldsHighlight?: string[];
}

interface ChatTransactionViewProps {
  categories: Category[];
  wallets: Wallet[];
  lang: Language;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onNavigateToDashboard: () => void;
  onNavigateToTransactions: () => void;
  onSwitchToForm?: () => void;
}

export const ChatTransactionView: React.FC<ChatTransactionViewProps> = ({
  categories,
  wallets,
  lang,
  onSave,
  onNavigateToDashboard,
  onNavigateToTransactions,
  onSwitchToForm,
}) => {
  const defaultWallet = wallets.find((w) => w.isDefault) || wallets[0] || {
    id: 'wallet-cash',
    name: 'เงินสด',
    type: 'cash',
    color: '#0284c7',
  };

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: lang === 'th'
        ? 'สวัสดีครับ พิมพ์รายการรายรับหรือรายจ่ายเป็นภาษาพูดได้เลย เช่น "ได้ตังจากพี่ 1000", "วันนี้ไปกินข้าวจ่าย 50 บาท" หรือ "พี่โอนให้ 500 บาท" ระบบจะวิเคราะห์ให้ หากไม่ถูกต้อง คุณสามารถพิมพ์สั่งแก้ไขในแชทได้ทันที เช่น "ไม่ใช่รายรับ เป็นรายจ่าย" หรือ "เปลี่ยนเป็น 500 บาท"'
        : 'Hello! Type your income or expense in conversational Thai (e.g. "ได้ตังจากพี่ 1000" or "Lunch 50 baht"). You can also correct it via chat like "Change to expense" or "Change to 500 baht" before saving.',
      timestamp: Date.now(),
    },
  ]);

  // Track editable draft state for the active pending confirmation
  const [activeDraft, setActiveDraft] = useState<{
    messageId: string;
    type: TransactionType;
    amount: number;
    categoryId: string;
    categoryName: string;
    walletId: string;
    date: string;
    dateDisplay?: string;
    note: string;
  } | null>(null);

  // Manual inline edit mode on the card
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeDraft, isInlineEditing]);

  // Suggested quick prompts
  const samplePrompts = [
    'ได้ตังจากพี่ 1000',
    'วันนี้ไปกินข้าวจ่าย 50 บาท',
    'วันนี้ได้เงินจากการจ้างงาน 60 บาท',
    'พี่โอนให้ 500 บาท',
    'เติมน้ำมัน 800 บาท',
    'ซื้อกาแฟ 65 บาท',
  ];

  // Quick edit suggestions when a draft is active
  const getCorrectionSuggestions = () => {
    if (!activeDraft) return [];
    const list: { label: string; text: string }[] = [];

    // Type toggle
    if (activeDraft.type === 'income') {
      list.push({ label: 'ไม่ใช่รายรับ เป็นรายจ่าย', text: 'ไม่ใช่รายรับ เป็นรายจ่าย' });
    } else {
      list.push({ label: 'ไม่ใช่รายจ่าย เป็นรายรับ', text: 'ไม่ใช่รายจ่าย เป็นรายรับ' });
    }

    // Date correction
    list.push({ label: 'วันที่เมื่อวาน', text: 'วันที่เมื่อวาน' });

    // Category suggestions
    if (activeDraft.type === 'expense') {
      if (activeDraft.categoryId !== 'food') {
        list.push({ label: 'เปลี่ยนหมวดเป็นอาหาร', text: 'เปลี่ยนหมวดเป็นอาหาร' });
      } else {
        list.push({ label: 'เปลี่ยนหมวดเป็นเดินทาง', text: 'เปลี่ยนหมวดเป็นเดินทาง' });
      }
    } else {
      list.push({ label: 'เปลี่ยนหมวดเป็นโบนัส', text: 'เปลี่ยนหมวดเป็นโบนัส' });
    }

    return list;
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessing) return;

    const userMsgId = 'msg-user-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsProcessing(true);

    setTimeout(() => {
      // 1. Check if there is an active draft and the message is a CORRECTION
      if (activeDraft) {
        const correction = parseChatCorrection(text, activeDraft, categories);

        if (correction.isCorrection) {
          if (correction.hasChanges) {
            const updated = {
              ...activeDraft,
              ...(correction.updatedFields.type ? { type: correction.updatedFields.type } : {}),
              ...(correction.updatedFields.amount !== undefined ? { amount: correction.updatedFields.amount } : {}),
              ...(correction.updatedFields.categoryId ? { categoryId: correction.updatedFields.categoryId } : {}),
              ...(correction.updatedFields.categoryName ? { categoryName: correction.updatedFields.categoryName } : {}),
              ...(correction.updatedFields.date ? { date: correction.updatedFields.date } : {}),
              ...(correction.updatedFields.dateDisplay ? { dateDisplay: correction.updatedFields.dateDisplay } : {}),
              ...(correction.updatedFields.note ? { note: correction.updatedFields.note } : {}),
              ...(correction.updatedFields.walletId ? { walletId: correction.updatedFields.walletId } : {}),
            };

            setActiveDraft(updated);

            // Update original assistant message parsed draft
            setMessages((prev) =>
              prev.map((m) =>
                m.id === activeDraft.messageId
                  ? {
                      ...m,
                      updatedFieldsHighlight: correction.changeDescriptions,
                      parsedDraft: m.parsedDraft
                        ? {
                            ...m.parsedDraft,
                            type: updated.type,
                            amount: updated.amount,
                            categoryId: updated.categoryId,
                            categoryName: updated.categoryName,
                            date: updated.date,
                            dateDisplay: updated.dateDisplay || m.parsedDraft.dateDisplay,
                            note: updated.note,
                          }
                        : null,
                    }
                  : m
              )
            );

            // Add response message acknowledging the specific changes
            const confirmReply: ChatMessage = {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: correction.replyMessage,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, confirmReply]);
            setIsProcessing(false);
            return;
          } else {
            // Identified as correction intent but values were identical
            const noChangeReply: ChatMessage = {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: correction.replyMessage || (lang === 'th' ? 'ข้อมูลดังกล่าวเป็นค่าปัจจุบันอยู่แล้ว คุณสามารถระบุจุดที่ต้องการแก้ไขเพิ่มเติม หรือกดยืนยันการบันทึกได้ทันที' : 'The specified values match current draft.'),
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, noChangeReply]);
            setIsProcessing(false);
            return;
          }
        }
      }

      // 2. Not a correction or no active draft -> Parse as new transaction
      const parsed = parseThaiFinanceMessage(text, categories);

      if (!parsed.amount || parsed.amount <= 0) {
        // No amount found
        const replyMsg: ChatMessage = {
          id: 'msg-asst-' + Date.now(),
          sender: 'assistant',
          text: lang === 'th'
            ? 'ระบบยังไม่พบจำนวนเงินในข้อความ กรุณาระบุจำนวนเงินด้วย เช่น "ได้ตังจากพี่ 1000" หรือ "วันนี้ไปกินข้าวจ่าย 50 บาท" หรือหากต้องการแก้ไขรายการเดิม กรุณาพิมพ์คำสั่งแก้ไข'
            : 'No amount found. Please specify an amount (e.g. "ได้ตังจากพี่ 1000" or "Lunch 50 baht").',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, replyMsg]);
        setIsProcessing(false);
        return;
      }

      // Valid amount parsed -> If previous was active, mark it replaced
      if (activeDraft) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeDraft.messageId && m.status === 'pending_confirmation'
              ? { ...m, status: 'cancelled' }
              : m
          )
        );
      }

      const asstMsgId = 'msg-asst-' + Date.now();
      const asstMsg: ChatMessage = {
        id: asstMsgId,
        sender: 'assistant',
        text: lang === 'th'
          ? 'ระบบวิเคราะห์ข้อความเรียบร้อยแล้ว กรุณาตรวจสอบรายละเอียด หากต้องการแก้ไขสามารถพิมพ์บอกในแชท กดปุ่ม [แก้ไข] หรือกด [ยืนยันการบันทึก]'
          : 'Transaction analyzed. Review details below, type to correct via chat, click [Edit], or click [Confirm & Save].',
        timestamp: Date.now(),
        parsedDraft: parsed,
        status: 'pending_confirmation',
      };

      setMessages((prev) => [...prev, asstMsg]);

      // Initialize active draft state
      setActiveDraft({
        messageId: asstMsgId,
        type: parsed.type,
        amount: parsed.amount,
        categoryId: parsed.categoryId,
        categoryName: parsed.categoryName,
        walletId: defaultWallet.id,
        date: parsed.date,
        dateDisplay: parsed.dateDisplay,
        note: parsed.note,
      });

      setIsInlineEditing(false);
      setIsProcessing(false);
    }, 150);
  };

  // Handle Confirm and Save Transaction to Database / Transactions List
  const handleConfirmSave = async (messageId: string) => {
    if (!activeDraft || activeDraft.messageId !== messageId) return;

    setIsProcessing(true);
    try {
      const cat = categories.find((c) => c.id === activeDraft.categoryId);
      const catName = cat ? (lang === 'th' ? cat.nameTh : cat.nameEn) : activeDraft.categoryName || 'ทั่วไป';

      await onSave({
        type: activeDraft.type,
        amount: activeDraft.amount,
        categoryId: activeDraft.categoryId,
        categoryName: catName,
        walletId: activeDraft.walletId,
        date: activeDraft.date,
        note: activeDraft.note.trim() || catName,
      });

      // Update message status to confirmed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: 'confirmed' }
            : msg
        )
      );

      // Assistant follow-up confirmation
      const typeText = activeDraft.type === 'income' ? 'รายรับ (+)' : 'รายจ่าย (-)';
      const followUpMsg: ChatMessage = {
        id: 'msg-confirmed-' + Date.now(),
        sender: 'assistant',
        text: lang === 'th'
          ? `บันทึกรายการสำเร็จเรียบร้อย! เพิ่ม ${typeText} จำนวน ฿${activeDraft.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} หมวดหมู่ "${catName}" ลงในระบบ และอัปเดตหน้าภาพรวม (Dashboard) อัตโนมัติแล้ว`
          : `Recorded successfully! Added ${activeDraft.type === 'income' ? 'Income (+)' : 'Expense (-)'} ฿${activeDraft.amount.toLocaleString()} in category "${catName}" and updated Dashboard.`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, followUpMsg]);
      setActiveDraft(null);
      setIsInlineEditing(false);
    } catch (err) {
      console.error('Failed to save transaction via chat:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Cancel
  const handleCancel = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: 'cancelled' }
          : msg
      )
    );

    const cancelReply: ChatMessage = {
      id: 'msg-cancelled-' + Date.now(),
      sender: 'assistant',
      text: lang === 'th'
        ? 'ยกเลิกรายการนี้แล้ว คุณสามารถพิมพ์ข้อความใหม่เพื่อเริ่มบันทึกรายการใหม่ได้ทันที'
        : 'Transaction cancelled. You can type a new message anytime.',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, cancelReply]);
    setActiveDraft(null);
    setIsInlineEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div id="chat-transaction-view" className="max-w-3xl mx-auto space-y-4">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold shadow-xs flex-shrink-0">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{lang === 'th' ? 'แชทบันทึกและวิเคราะห์รายการ' : 'Chat & Transaction Analyzer'}</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                NLP Live
              </span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {lang === 'th'
                ? 'วิเคราะห์ความหมายภาษาพูด และแก้ไขรายการผ่านแชทได้ทันที'
                : 'Understands Thai spoken phrases and allows real-time chat corrections'}
            </p>
          </div>
        </div>

        {/* Switch to standard form */}
        {onSwitchToForm && (
          <button
            id="switch-to-standard-form-btn"
            onClick={onSwitchToForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors self-start sm:self-center"
          >
            <FileText size={13} className="text-neutral-500" />
            <span>{lang === 'th' ? 'แบบฟอร์มมาตรฐาน' : 'Standard Form'}</span>
          </button>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-neutral-400 dark:text-neutral-500 text-[11px] font-medium whitespace-nowrap pl-1 flex items-center gap-1">
          <Sparkles size={12} />
          <span>{lang === 'th' ? 'ตัวอย่างคำพูด:' : 'Try:'}</span>
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition-colors shadow-2xs active:scale-95"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div 
        id="chat-messages-container"
        className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 min-h-[380px] max-h-[600px] overflow-y-auto space-y-4 shadow-xs"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isPending = msg.status === 'pending_confirmation';
          const isConfirmed = msg.status === 'confirmed';
          const isCancelled = msg.status === 'cancelled';
          const isCurrentActive = activeDraft && activeDraft.messageId === msg.id;
          const currentData = isCurrentActive ? activeDraft : msg.parsedDraft;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex-shrink-0 flex items-center justify-center mt-1 border border-neutral-200/80 dark:border-neutral-700">
                  <Bot size={15} />
                </div>
              )}

              <div className={`max-w-[92%] sm:max-w-[85%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Text Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-tr-xs font-medium shadow-xs'
                      : 'bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 rounded-tl-xs border border-neutral-200/60 dark:border-neutral-700/60'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Structured Confirmation & Analysis Card */}
                {currentData && (msg.parsedDraft || isCurrentActive) && (
                  <div className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 p-4 sm:p-4.5 space-y-3.5 shadow-xs">
                    {/* Header bar with Type indicator and Status */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-200/80 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentData.type === 'income'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300/80 dark:border-rose-700/80'
                          }`}
                        >
                          {currentData.type === 'income' ? (
                            <ArrowDownLeft size={14} className="stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight size={14} className="stroke-[2.5]" />
                          )}
                          <span>
                            {currentData.type === 'income'
                              ? (lang === 'th' ? 'ประเภท: รายรับ (+)' : 'Type: Income (+)')
                              : (lang === 'th' ? 'ประเภท: รายจ่าย (-)' : 'Type: Expense (-)')}
                          </span>
                        </span>

                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                          {isPending ? (lang === 'th' ? 'รอการยืนยัน' : 'Awaiting Confirmation') : ''}
                        </span>
                      </div>

                      {/* Status indicator */}
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Check size={13} className="stroke-[2.5]" />
                          <span>{lang === 'th' ? 'บันทึกสำเร็จ' : 'Saved'}</span>
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700">
                          <X size={13} />
                          <span>{lang === 'th' ? 'ยกเลิกแล้ว' : 'Cancelled'}</span>
                        </span>
                      )}
                    </div>

                    {/* Amount Block */}
                    <div className="flex items-baseline justify-between py-1">
                      <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                        {lang === 'th' ? 'จำนวนเงิน:' : 'Amount:'}
                      </span>
                      {isCurrentActive && isInlineEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold text-neutral-500">฿</span>
                          <input
                            type="number"
                            step="0.01"
                            value={activeDraft.amount}
                            onChange={(e) => setActiveDraft({ ...activeDraft, amount: parseFloat(e.target.value) || 0 })}
                            className="w-32 text-right text-lg sm:text-xl font-bold bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 outline-none text-neutral-900 dark:text-white"
                          />
                        </div>
                      ) : (
                        <div className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-bold text-neutral-400">฿</span>
                          <span>{(currentData.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-xs sm:text-sm font-normal text-neutral-400 ml-1">{lang === 'th' ? 'บาท' : 'THB'}</span>
                        </div>
                      )}
                    </div>

                    {/* Detail Specification Table */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
                      {/* Category */}
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-neutral-400 flex-shrink-0" />
                        <span className="text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
                          {lang === 'th' ? 'หมวดหมู่:' : 'Category:'}
                        </span>
                        {isCurrentActive && isInlineEditing ? (
                          <select
                            value={activeDraft.categoryId}
                            onChange={(e) => {
                              const selCat = categories.find((c) => c.id === e.target.value);
                              setActiveDraft({
                                ...activeDraft,
                                categoryId: e.target.value,
                                categoryName: selCat ? selCat.nameTh : activeDraft.categoryName,
                              });
                            }}
                            className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 outline-none text-xs flex-1 truncate"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {lang === 'th' ? c.nameTh : c.nameEn}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-neutral-900 dark:text-white truncate">
                            {categories.find((c) => c.id === currentData.categoryId)?.nameTh || currentData.categoryName || 'ทั่วไป'}
                          </span>
                        )}
                      </div>

                      {/* Wallet */}
                      <div className="flex items-center gap-2">
                        <WalletIcon size={13} className="text-neutral-400 flex-shrink-0" />
                        <span className="text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
                          {lang === 'th' ? 'บัญชี:' : 'Account:'}
                        </span>
                        {isCurrentActive && isInlineEditing ? (
                          <select
                            value={activeDraft.walletId}
                            onChange={(e) => setActiveDraft({ ...activeDraft, walletId: e.target.value })}
                            className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 outline-none text-xs flex-1 truncate"
                          >
                            {wallets.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-neutral-900 dark:text-white truncate">
                            {wallets.find((w) => w.id === (isCurrentActive ? activeDraft.walletId : defaultWallet.id))?.name || defaultWallet.name}
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-neutral-400 flex-shrink-0" />
                        <span className="text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
                          {lang === 'th' ? 'วันที่:' : 'Date:'}
                        </span>
                        {isCurrentActive && isInlineEditing ? (
                          <input
                            type="date"
                            value={activeDraft.date}
                            onChange={(e) => setActiveDraft({ ...activeDraft, date: e.target.value })}
                            className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 outline-none text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {currentData.dateDisplay ? `${currentData.dateDisplay} (${currentData.date})` : currentData.date}
                          </span>
                        )}
                      </div>

                      {/* Type Toggle in Inline Mode */}
                      {isCurrentActive && isInlineEditing && (
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                            {lang === 'th' ? 'เปลี่ยนประเภท:' : 'Type:'}
                          </span>
                          <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800">
                            <button
                              onClick={() => setActiveDraft({ ...activeDraft, type: 'expense' })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                activeDraft.type === 'expense'
                                  ? 'bg-rose-500 text-white'
                                  : 'text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              รายจ่าย (-)
                            </button>
                            <button
                              onClick={() => setActiveDraft({ ...activeDraft, type: 'income' })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                activeDraft.type === 'income'
                                  ? 'bg-emerald-500 text-white'
                                  : 'text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              รายรับ (+)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Note / Description */}
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <FileText size={13} className="text-neutral-400 flex-shrink-0" />
                        <span className="text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
                          {lang === 'th' ? 'รายละเอียด:' : 'Note:'}
                        </span>
                        {isCurrentActive && isInlineEditing ? (
                          <input
                            type="text"
                            value={activeDraft.note}
                            onChange={(e) => setActiveDraft({ ...activeDraft, note: e.target.value })}
                            className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 outline-none text-xs"
                            placeholder={lang === 'th' ? 'ระบุรายละเอียด เช่น ได้เงินจากพี่' : 'Note details'}
                          />
                        ) : (
                          <span className="font-semibold text-neutral-900 dark:text-white truncate">
                            {currentData.note || 'ไม่มีรายละเอียด'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: [แก้ไข] [ยกเลิก] [ยืนยันการบันทึก] */}
                    {isPending && isCurrentActive && (
                      <div className="space-y-2.5 pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* [แก้ไข] Button */}
                          <button
                            id={`chat-edit-btn-${msg.id}`}
                            onClick={() => setIsInlineEditing(!isInlineEditing)}
                            disabled={isProcessing}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                              isInlineEditing
                                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
                                : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            <Edit3 size={13} />
                            <span>
                              {isInlineEditing
                                ? (lang === 'th' ? 'เสร็จสิ้นการแก้ไข' : 'Done Editing')
                                : (lang === 'th' ? 'แก้ไข' : 'Edit')}
                            </span>
                          </button>

                          {/* [ยกเลิก] Button */}
                          <button
                            id={`chat-cancel-btn-${msg.id}`}
                            onClick={() => handleCancel(msg.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors disabled:opacity-50 active:scale-95"
                          >
                            <X size={14} />
                            <span>{lang === 'th' ? 'ยกเลิก' : 'Cancel'}</span>
                          </button>

                          {/* [ยืนยันการบันทึก] Button */}
                          <button
                            id={`chat-confirm-btn-${msg.id}`}
                            onClick={() => handleConfirmSave(msg.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-95"
                          >
                            <Check size={14} className="stroke-[2.5]" />
                            <span>
                              {isProcessing
                                ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                                : (lang === 'th' ? 'ยืนยันการบันทึก' : 'Confirm & Save')}
                            </span>
                          </button>
                        </div>

                        {/* Quick In-Chat Edit Suggestion Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <CornerDownLeft size={11} />
                            <span>{lang === 'th' ? 'หรือพิมพ์แก้ไขในแชท:' : 'Or type to edit:'}</span>
                          </span>
                          {getCorrectionSuggestions().map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(sug.text)}
                              className="px-2 py-0.5 rounded-lg bg-neutral-200/70 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                            >
                              “{sug.label}”
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex-shrink-0 flex items-center justify-center mt-1">
                  <UserIcon size={14} />
                </div>
              )}
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 pl-10">
            <span className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" />
            <span>{lang === 'th' ? 'กำลังวิเคราะห์ความหมายภาษา...' : 'Analyzing semantic intent...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Navigation Quick Shortcuts After Confirmation */}
      <div className="flex items-center justify-between text-xs px-1 text-neutral-500 dark:text-neutral-400">
        <button
          onClick={onNavigateToDashboard}
          className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <span>{lang === 'th' ? 'กลับไปหน้าภาพรวม' : 'Back to Dashboard'}</span>
          <ChevronRight size={13} />
        </button>

        <button
          onClick={onNavigateToTransactions}
          className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium"
        >
          <span>{lang === 'th' ? 'ดูรายการธุรกรรมทั้งหมด' : 'View all transactions'}</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Input Message Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-2 sm:p-2.5 border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex items-center gap-2">
        <input
          ref={inputRef}
          id="chat-transaction-input"
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeDraft
              ? (lang === 'th'
                  ? 'พิมพ์เพื่อแก้ไข เช่น "ไม่ใช่รายรับ เป็นรายจ่าย", "เปลี่ยนเป็น 500 บาท", "วันที่เมื่อวาน"'
                  : 'Type to edit e.g. "Change to expense", "Change to 500 baht", "Yesterday"')
              : (lang === 'th'
                  ? 'พิมพ์รายการ เช่น "ได้ตังจากพี่ 1000", "วันนี้ไปกินข้าวจ่าย 50 บาท"'
                  : 'Type e.g. "ได้ตังจากพี่ 1000", "Lunch 50 baht"')
          }
          className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
        />

        <button
          id="chat-send-btn"
          onClick={() => handleSend()}
          disabled={!inputMessage.trim() || isProcessing}
          className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 flex items-center justify-center transition-all disabled:opacity-40 active:scale-95 flex-shrink-0"
          title={lang === 'th' ? 'ส่งข้อความ' : 'Send message'}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};
