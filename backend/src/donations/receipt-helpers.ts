// Helper function to convert number to words (matches ReceiptView.tsx)
export function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num === 0) return 'zero';
  if (num < 20) return ones[num];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return ones[hundred] + ' hundred' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const remainder = num % 1000;
    return numberToWords(thousand) + ' thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  return num.toString();
}

export function formatAmountInWords(amount: number, showAmountInWords: boolean = true): string {
  if (!showAmountInWords) return '';
  const dollars = Math.floor(amount);
  const cents = Math.floor((amount % 1) * 100);
  const dollarsInWords = numberToWords(dollars);
  return `${dollarsInWords} dollars${cents > 0 ? ` and ${cents} cents` : ''} only.`;
}

