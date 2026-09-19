import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  FileDown, 
  Printer, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Transaction, Category, Language } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/format';
import { generateFinancialReportPDF } from '../utils/reportPdf';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  lang: Language;
  user: User | null;
  initialPeriod?: 'daily' | 'weekly' | 'monthly' | 'all';
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  lang,
  user,
  initialPeriod = 'all',
}) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>(initialPeriod);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [manualDownloadUrl, setManualDownloadUrl] = useState<{ url: string; fileName: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filter transactions according to selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);

    // Week range
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    const mondayStr = monday.toISOString().split('T')[0];

    return transactions.filter((tx) => {
      if (period === 'daily') return tx.date === todayStr;
      if (period === 'monthly') return tx.date.startsWith(thisMonthStr);
      if (period === 'weekly') return tx.date >= mondayStr && tx.date <= todayStr;
      return true;
    });
  }, [transactions, period]);

  // Calculate totals
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    const balance = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;
    return { income, expense, balance, savingsRate };
  }, [filteredTransactions]);

  // Top categories for preview
  const topExpenses = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
      });

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId);
        const name = lang === 'th' ? (cat?.nameTh || catId) : (cat?.nameEn || catId);
        const percent = totals.expense > 0 ? Math.round((amount / totals.expense) * 100) : 0;
        return { name, amount, percent };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions, totals.expense, categoryMap, lang]);

  const sortedList = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt);
  }, [filteredTransactions]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setDownloadSuccess(false);

      const result = await generateFinancialReportPDF({
        transactions: filteredTransactions.length > 0 ? filteredTransactions : transactions,
        categories,
        period,
        lang,
        userEmail: user?.email,
      });

      setManualDownloadUrl({ url: result.blobUrl, fileName: result.fileName });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      console.error('PDF Generation failed:', err);
      setErrorMessage(lang === 'th' ? 'เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่มพิมพ์รายงาน' : 'Failed to generate PDF. Please try again or use Print to PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const periodOptions: { id: 'all' | 'monthly' | 'weekly' | 'daily'; labelTh: string; labelEn: string }[] = [
    { id: 'all', labelTh: 'ทั้งหมด (ทุกช่วงเวลา)', labelEn: 'All Time' },
    { id: 'monthly', labelTh: 'เดือนนี้', labelEn: 'This Month' },
    { id: 'weekly', labelTh: 'สัปดาห์นี้', labelEn: 'This Week' },
    { id: 'daily', labelTh: 'วันนี้', labelEn: 'Today' },
  ];

  return (
    <div 
      id="pdf-export-modal-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shadow-sm">
              <FileDown size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                {lang === 'th' ? 'ดาวน์โหลดรายงานการเงิน (PDF)' : 'Download Financial Report (PDF)'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {lang === 'th' ? 'ส่งออกเป็นเอกสาร PDF หรือพิมพ์บันทึกเก็บไว้' : 'Export clean PDF document or print to file'}
              </p>
            </div>
          </div>

          <button
            id="pdf-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Controls & Period Selection */}
        <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900">
          {/* Period Tabs */}
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                id={`pdf-period-${opt.id}-btn`}
                onClick={() => setPeriod(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === opt.id
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {lang === 'th' ? opt.labelTh : opt.labelEn}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="pdf-print-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold active:scale-95 transition-all shadow-sm"
              title={lang === 'th' ? 'พิมพ์ หรือ บันทึกเป็น PDF ผ่านระบบ' : 'Print or Save to PDF'}
            >
              <Printer size={15} />
              <span>{lang === 'th' ? 'พิมพ์ / บันทึกเป็น PDF' : 'Print / Save as PDF'}</span>
            </button>

            <button
              id="pdf-direct-download-btn"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin text-amber-400" />
                  <span>{lang === 'th' ? 'กำลังสร้าง PDF...' : 'Generating PDF...'}</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>{lang === 'th' ? 'ดาวน์โหลดสำเร็จ!' : 'Downloaded!'}</span>
                </>
              ) : (
                <>
                  <FileDown size={15} />
                  <span>{lang === 'th' ? '📥 ดาวน์โหลด PDF' : '📥 Download PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Alert or Fallback Link */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {manualDownloadUrl && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
              <span>{lang === 'th' ? 'หากการดาวน์โหลดไม่เริ่มอัตโนมัติบนอุปกรณ์ของคุณ:' : 'If download did not start automatically:'}</span>
            </div>
            <a
              id="pdf-manual-download-link"
              href={manualDownloadUrl.url}
              download={manualDownloadUrl.fileName}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold underline text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
            >
              <span>{lang === 'th' ? 'คลิกที่นี่เพื่อเปิด/ดาวน์โหลดไฟล์' : 'Click here to open/download'}</span>
              <ExternalLink size={13} />
            </a>
          </div>
        )}

        {/* Document Preview (Scrollable A4 paper simulation) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-100 dark:bg-neutral-950/70">
          <div 
            id="pdf-print-area"
            className="max-w-[760px] mx-auto bg-white text-neutral-900 rounded-xl shadow-lg border border-neutral-200 p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:m-0 print:p-0"
          >
            {/* Report Header */}
            <div className="border-b-2 border-neutral-900 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded bg-neutral-900 text-white text-[10px] font-bold tracking-wider uppercase mb-1">
                  MoneyTrack TH
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                  {lang === 'th' ? 'รายงานสรุปบัญชีรายรับ-รายจ่าย' : 'Financial Summary Report'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {lang === 'th' ? 'สรุปภาพรวมรายรับ รายจ่าย เงินคงเหลือ และประวัติการทำรายการ' : 'Summary of income, expenditure, and ledger history'}
                </p>
              </div>

              <div className="text-xs text-neutral-500 space-y-1 sm:text-right">
                <div>
                  <strong className="text-neutral-800">{lang === 'th' ? 'ช่วงเวลา: ' : 'Period: '}</strong>
                  <span className="font-semibold text-neutral-900">
                    {periodOptions.find((p) => p.id === period)?.[lang === 'th' ? 'labelTh' : 'labelEn']}
                  </span>
                </div>
                <div>
                  <strong className="text-neutral-800">{lang === 'th' ? 'ผู้ใช้งาน: ' : 'User: '}</strong>
                  <span>{user?.email || (lang === 'th' ? 'บัญชีส่วนตัว (Offline)' : 'Personal Account')}</span>
                </div>
                <div>
                  <strong className="text-neutral-800">{lang === 'th' ? 'วันที่พิมพ์: ' : 'Date: '}</strong>
                  <span>{new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* 4 Summary Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                  {lang === 'th' ? 'รายรับรวม' : 'Total Income'}
                </div>
                <div className="text-lg font-bold text-emerald-600 mt-1">
                  +{formatCurrency(totals.income)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                  {lang === 'th' ? 'รายจ่ายรวม' : 'Total Expense'}
                </div>
                <div className="text-lg font-bold text-rose-600 mt-1">
                  -{formatCurrency(totals.expense)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                  {lang === 'th' ? 'คงเหลือสุทธิ' : 'Net Balance'}
                </div>
                <div className={`text-lg font-bold mt-1 ${totals.balance >= 0 ? 'text-sky-600' : 'text-amber-600'}`}>
                  {formatCurrency(totals.balance)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                  {lang === 'th' ? 'อัตราการออม' : 'Savings Rate'}
                </div>
                <div className="text-lg font-bold text-indigo-600 mt-1">
                  {totals.savingsRate}%
                </div>
              </div>
            </div>

            {/* Top Categories */}
            {topExpenses.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 border-b border-neutral-200 pb-1.5">
                  {lang === 'th' ? 'สัดส่วนรายจ่ายตามหมวดหมู่สูงสุด' : 'Top Expense Categories'}
                </h4>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-3">{lang === 'th' ? 'หมวดหมู่' : 'Category'}</th>
                        <th className="py-2 px-3 text-right">{lang === 'th' ? 'จำนวนเงิน' : 'Amount'}</th>
                        <th className="py-2 px-3 text-right">{lang === 'th' ? 'สัดส่วน' : 'Share'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {topExpenses.map((c, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-neutral-800">{c.name}</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600">-{formatCurrency(c.amount)}</td>
                          <td className="py-2 px-3 text-right text-neutral-500">{c.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transactions List */}
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-neutral-200 pb-1.5">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  {lang === 'th' ? 'รายการธุรกรรม' : 'Transaction History'} ({sortedList.length} {lang === 'th' ? 'รายการ' : 'items'})
                </h4>
                {sortedList.length > 40 && (
                  <span className="text-[10px] text-neutral-400">
                    {lang === 'th' ? 'แสดง 40 รายการแรก' : 'Showing first 40 items'}
                  </span>
                )}
              </div>

              {sortedList.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400 bg-neutral-50 rounded-lg">
                  {lang === 'th' ? 'ไม่มีรายการธุรกรรมในช่วงเวลานี้' : 'No transactions found in this period'}
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-3">{lang === 'th' ? 'วันที่' : 'Date'}</th>
                        <th className="py-2 px-3">{lang === 'th' ? 'ประเภท' : 'Type'}</th>
                        <th className="py-2 px-3">{lang === 'th' ? 'หมวดหมู่' : 'Category'}</th>
                        <th className="py-2 px-3">{lang === 'th' ? 'บันทึก' : 'Note'}</th>
                        <th className="py-2 px-3 text-right">{lang === 'th' ? 'จำนวนเงิน' : 'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {sortedList.slice(0, 40).map((tx) => {
                        const cat = categoryMap.get(tx.categoryId);
                        const catName = lang === 'th' ? (cat?.nameTh || tx.categoryName || tx.categoryId) : (cat?.nameEn || tx.categoryName || tx.categoryId);
                        const isInc = tx.type === 'income';
                        return (
                          <tr key={tx.id}>
                            <td className="py-1.5 px-3 text-neutral-500 whitespace-nowrap">{formatDateDisplay(tx.date, lang)}</td>
                            <td className="py-1.5 px-3">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isInc ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {isInc ? (lang === 'th' ? 'รายรับ' : 'Income') : (lang === 'th' ? 'รายจ่าย' : 'Expense')}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 font-medium text-neutral-800">{catName}</td>
                            <td className="py-1.5 px-3 text-neutral-500 truncate max-w-[180px]">{tx.note || '-'}</td>
                            <td className={`py-1.5 px-3 text-right font-bold whitespace-nowrap ${
                              isInc ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {isInc ? '+' : '-'}{formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Document Footer */}
            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-400">
              <div>MoneyTrack • บันทึกรายรับรายจ่าย</div>
              <div>Confidential Financial Report</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {lang === 'th' ? 'สามารถกด "พิมพ์ / บันทึกเป็น PDF" เพื่อเลือกบันทึกผ่านระบบเครื่องได้โดยตรง' : 'You can also use "Print / Save as PDF" for native system PDF saving.'}
          </span>
          <button
            id="pdf-modal-done-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
