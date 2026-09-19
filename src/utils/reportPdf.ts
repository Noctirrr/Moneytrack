import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Transaction, Category, Language } from '../types';
import { formatCurrency, formatDateDisplay } from './format';

export interface GenerateReportOptions {
  transactions: Transaction[];
  categories: Category[];
  period: 'daily' | 'weekly' | 'monthly' | 'all';
  lang: Language;
  userEmail?: string | null;
}

export interface PdfGenerationResult {
  blobUrl: string;
  fileName: string;
}

export async function generateFinancialReportPDF({
  transactions,
  categories,
  period,
  lang,
  userEmail,
}: GenerateReportOptions): Promise<PdfGenerationResult> {
  // 1. Calculate Summary
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  transactions.forEach((tx) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Expense by category
  const expenseCatMap = new Map<string, number>();
  transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      expenseCatMap.set(tx.categoryId, (expenseCatMap.get(tx.categoryId) || 0) + tx.amount);
    });

  const topExpenseCategories = Array.from(expenseCatMap.entries())
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      const name = lang === 'th' ? (cat?.nameTh || catId) : (cat?.nameEn || catId);
      const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return { name, amount, percent };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Period label
  const periodLabelMap: Record<string, { th: string; en: string }> = {
    daily: { th: 'รายวัน (วันนี้)', en: 'Daily (Today)' },
    weekly: { th: 'รายสัปดาห์ (สัปดาห์นี้)', en: 'Weekly (This Week)' },
    monthly: { th: 'รายเดือน (เดือนนี้)', en: 'Monthly (This Month)' },
    all: { th: 'ทั้งหมด (ทุกช่วงเวลา)', en: 'All Time' },
  };
  const periodText = periodLabelMap[period]?.[lang] || period;

  const now = new Date();
  const printDateStr = now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Limit to 45 transactions for PDF export
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt)
    .slice(0, 45);

  // 2. Build DOM container for high-res rendering
  // Note: We use position: fixed; left: -9999px; top: 0; opacity: 1;
  // This ensures html2canvas renders all text and backgrounds crisp on mobile and desktop web without showing it on screen.
  const container = document.createElement('div');
  container.id = 'pdf-export-hidden-dom';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.minHeight = '1123px';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Sarabun', 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.padding = '36px 40px';
  container.style.boxSizing = 'border-box';

  const titleTh = 'รายงานสรุปบัญชีรายรับ-รายจ่าย';
  const titleEn = 'Financial Summary Report';
  const subtitle = lang === 'th' 
    ? 'สรุปภาพรวมรายรับ รายจ่าย เงินคงเหลือ และประวัติการทำรายการ' 
    : 'Summary of income, expenditure, net balance, and transaction history';

  container.innerHTML = `
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 22px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #0f172a; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">
            <span>MoneyTrack TH</span>
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
            ${lang === 'th' ? titleTh : titleEn}
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 12.5px; color: #475569;">
            ${subtitle}
          </p>
        </div>
        <div style="text-align: right; font-size: 12px; color: #475569; line-height: 1.6;">
          <div><strong style="color: #0f172a;">${lang === 'th' ? 'ช่วงเวลา' : 'Period'}:</strong> ${periodText}</div>
          <div><strong style="color: #0f172a;">${lang === 'th' ? 'วันที่พิมพ์' : 'Generated'}:</strong> ${printDateStr}</div>
          <div><strong style="color: #0f172a;">${lang === 'th' ? 'ผู้ใช้งาน' : 'User'}:</strong> ${userEmail || (lang === 'th' ? 'บัญชีส่วนตัว (Offline)' : 'Personal Account')}</div>
        </div>
      </div>
    </div>

    <!-- 4 Summary Metrics -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">
          ${lang === 'th' ? 'รายรับรวม' : 'Total Income'}
        </div>
        <div style="font-size: 18px; font-weight: 800; color: #059669; margin-top: 4px;">
          +${formatCurrency(totalIncome)}
        </div>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">
          ${lang === 'th' ? 'รายจ่ายรวม' : 'Total Expense'}
        </div>
        <div style="font-size: 18px; font-weight: 800; color: #dc2626; margin-top: 4px;">
          -${formatCurrency(totalExpense)}
        </div>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">
          ${lang === 'th' ? 'คงเหลือสุทธิ' : 'Net Balance'}
        </div>
        <div style="font-size: 18px; font-weight: 800; color: ${netSavings >= 0 ? '#0284c7' : '#ea580c'}; margin-top: 4px;">
          ${formatCurrency(netSavings)}
        </div>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">
          ${lang === 'th' ? 'อัตราการออม' : 'Savings Rate'}
        </div>
        <div style="font-size: 18px; font-weight: 800; color: #4f46e5; margin-top: 4px;">
          ${savingsRate}%
        </div>
      </div>
    </div>

    <!-- Category Breakdown (Top Expenses) -->
    ${topExpenseCategories.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          ${lang === 'th' ? 'สัดส่วนรายจ่ายตามหมวดหมู่สูงสุด' : 'Top Expense Categories'}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
              <th style="padding: 6px 10px; border-radius: 4px 0 0 4px;">${lang === 'th' ? 'หมวดหมู่' : 'Category'}</th>
              <th style="padding: 6px 10px; text-align: right;">${lang === 'th' ? 'จำนวนเงิน' : 'Amount'}</th>
              <th style="padding: 6px 10px; text-align: right; border-radius: 0 4px 4px 0;">${lang === 'th' ? 'สัดส่วน' : 'Share'}</th>
            </tr>
          </thead>
          <tbody>
            ${topExpenseCategories.map((c) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 10px; font-weight: 600; color: #1e293b;">${c.name}</td>
                <td style="padding: 6px 10px; text-align: right; color: #dc2626; font-weight: 600;">${formatCurrency(c.amount)}</td>
                <td style="padding: 6px 10px; text-align: right; color: #64748b;">${c.percent}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Transaction Table -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
        <h2 style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin: 0;">
          ${lang === 'th' ? 'ประวัติรายการธุรกรรม' : 'Transaction Records'} (${sortedTransactions.length} ${lang === 'th' ? 'รายการ' : 'items'})
        </h2>
        ${transactions.length > sortedTransactions.length ? `
          <span style="font-size: 11px; color: #64748b;">
            (${lang === 'th' ? `แสดง ${sortedTransactions.length} จาก ${transactions.length} รายการ` : `Showing first ${sortedTransactions.length} of ${transactions.length}`})
          </span>
        ` : ''}
      </div>

      ${sortedTransactions.length === 0 ? `
        <div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 12.5px; background-color: #f8fafc; border-radius: 8px;">
          ${lang === 'th' ? 'ไม่มีรายการธุรกรรมในช่วงเวลานี้' : 'No transactions found in this period'}
        </div>
      ` : `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
              <th style="padding: 6px 8px; border-radius: 4px 0 0 4px; width: 85px;">${lang === 'th' ? 'วันที่' : 'Date'}</th>
              <th style="padding: 6px 8px; width: 65px;">${lang === 'th' ? 'ประเภท' : 'Type'}</th>
              <th style="padding: 6px 8px;">${lang === 'th' ? 'หมวดหมู่' : 'Category'}</th>
              <th style="padding: 6px 8px;">${lang === 'th' ? 'บันทึก' : 'Note'}</th>
              <th style="padding: 6px 8px; text-align: right; border-radius: 0 4px 4px 0; width: 95px;">${lang === 'th' ? 'จำนวนเงิน' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const catName = lang === 'th' ? (cat?.nameTh || tx.categoryName || tx.categoryId) : (cat?.nameEn || tx.categoryName || tx.categoryId);
              const isInc = tx.type === 'income';
              const typeText = isInc ? (lang === 'th' ? 'รายรับ' : 'Income') : (lang === 'th' ? 'รายจ่าย' : 'Expense');
              const amountColor = isInc ? '#059669' : '#dc2626';
              const prefix = isInc ? '+' : '-';
              return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 6px 8px; color: #475569; white-space: nowrap;">${formatDateDisplay(tx.date, lang)}</td>
                  <td style="padding: 6px 8px;">
                    <span style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9.5px; font-weight: 700; background-color: ${isInc ? '#ecfdf5' : '#fef2f2'}; color: ${isInc ? '#065f46' : '#991b1b'};">
                      ${typeText}
                    </span>
                  </td>
                  <td style="padding: 6px 8px; font-weight: 600; color: #1e293b;">${catName}</td>
                  <td style="padding: 6px 8px; color: #64748b; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tx.note || '-'}</td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${amountColor}; white-space: nowrap;">
                    ${prefix}${formatCurrency(tx.amount)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Footer -->
    <div style="margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
      <div>MoneyTrack • บันทึกรายรับรายจ่าย</div>
      <div>เอกสารรายงานส่วนบุคคล • Confidential Report</div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait briefly for fonts and layout
    await new Promise((resolve) => setTimeout(resolve, 80));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      width: 794,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const dateFileStr = now.toISOString().split('T')[0];
    const fileName = `MoneyTrack_Report_${period}_${dateFileStr}.pdf`;

    // Create Blob for reliable universal download (works on Safari iOS & Desktop)
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Auto trigger download link
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      if (document.body.contains(downloadAnchor)) {
        document.body.removeChild(downloadAnchor);
      }
    }, 1500);

    return { blobUrl, fileName };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
