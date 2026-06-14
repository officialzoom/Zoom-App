export function formatCurrency(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatPercentage(rate: number): string {
  const prefix = rate > 0 ? "+" : "";
  return `${prefix}${rate.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-NG", { day: 'numeric', month: 'short', year: 'numeric' });
}
