export function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** UTC datetime string → JST表示（例: "2026/04/10 23:26"）*/
export function toJST(utcStr: string | null): string {
  if (!utcStr) return "未同期";
  // Tursoのdatetime('now','localtime')はUTCを返す
  const d = new Date(utcStr + (utcStr.includes("Z") || utcStr.includes("+") ? "" : "Z"));
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
