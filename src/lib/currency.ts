export const CURRENCY_SYMBOL = "৳";
export const DEFAULT_CURRENCY = "BDT";

export function formatMoney(amount: number | string, currency = DEFAULT_CURRENCY) {
  const n = Number(amount) || 0;
  const symbol = currency === "BDT" ? "৳" : "";
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return symbol ? `${symbol}${formatted}` : `${currency} ${formatted}`;
}
