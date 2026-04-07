import { yen } from "@/lib/format";

interface Alert {
  level: "danger" | "warning" | "info";
  message: string;
}

interface Props {
  runwayMonths: number;
  expensePctChange: number | null;
  netIncome: number;
  fundingDangerMonths?: Array<{ year_month: string; closing_balance: number }>;
}

export default function AlertBanner({ runwayMonths, expensePctChange, netIncome, fundingDangerMonths }: Props) {
  const alerts: Alert[] = [];

  if (runwayMonths < 3) {
    alerts.push({
      level: "danger",
      message: `ランウェイが${runwayMonths}ヶ月です。資金計画を見直してください。`,
    });
  } else if (runwayMonths < 6) {
    alerts.push({
      level: "warning",
      message: `ランウェイ${runwayMonths}ヶ月 — 6ヶ月を切っています。`,
    });
  }

  if (fundingDangerMonths && fundingDangerMonths.length > 0) {
    const labels = fundingDangerMonths.map(m => m.year_month.replace("-", "年") + "月").join("・");
    alerts.push({
      level: fundingDangerMonths.some(m => m.closing_balance < 0) ? "danger" : "warning",
      message: `資金繰り注意: ${labels} の残高が固定費2ヶ月分を下回ります。`,
    });
  }

  if (expensePctChange !== null && expensePctChange > 20) {
    alerts.push({
      level: "warning",
      message: `費用が前月比 +${expensePctChange}% 増加しています。`,
    });
  }

  if (netIncome < -500000) {
    alerts.push({
      level: "warning",
      message: `今月の損益が ${yen(netIncome)} です。`,
    });
  }

  if (alerts.length === 0) return null;

  const bgMap = {
    danger: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  const iconMap = {
    danger: "🔴",
    warning: "🟡",
    info: "🔵",
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${bgMap[alert.level]}`}>
          <span>{iconMap[alert.level]}</span>
          {alert.message}
        </div>
      ))}
    </div>
  );
}
