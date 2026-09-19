export const formatCurrency = (amount: number, currency: string = 'THB'): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCompactNumber = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(amount) >= 1_000) {
    return (amount / 1_000).toFixed(1) + 'k';
  }
  return amount.toLocaleString('th-TH');
};

export const formatDateDisplay = (dateString: string, lang: 'th' | 'en'): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (lang === 'th') {
    const thMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const thYear = year + 543;
    return `${day} ${thMonths[month - 1]} ${thYear}`;
  } else {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
};
