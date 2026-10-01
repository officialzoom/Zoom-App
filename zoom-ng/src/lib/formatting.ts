export function formatCurrency(amount: number | null | undefined): string {
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return "₦" + safeAmount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatPercentage(rate: number | null | undefined): string {
  const safeRate = typeof rate === "number" && Number.isFinite(rate) ? rate : 0;
  const prefix = safeRate > 0 ? "+" : "";
  return `${prefix}${safeRate.toFixed(1)}%`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}
