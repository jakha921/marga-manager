
export const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  
  // Handle YYYY-MM-DD string specifically to avoid timezone shifts
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year.slice(-2)}`;
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr); // Fallback if invalid
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  
  return `${day}.${month}.${year}`;
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('ru-RU').replace(/,/g, ' ').replace(/\u00A0/g, ' ');
};

export const parseNumber = (str: string): number => {
  if (!str) return 0;
  // Remove spaces and replace comma with dot if user typed comma
  const cleanStr = str.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

export const formatCompactNumber = (num: number): string => {
  if (num === 0) return '0';
  
  const formatter = Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  });
  
  return formatter.format(num);
};
