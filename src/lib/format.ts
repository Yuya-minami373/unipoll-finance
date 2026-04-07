export function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
