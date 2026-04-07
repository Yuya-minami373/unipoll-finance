"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthServiceData {
  year_month: string;
  service_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
}

const SERVICE_COLORS: Record<string, string> = {
  "入札支援": "#22c55e",
  "クルー": "#3b82f6",
  "Opsデザイン": "#f59e0b",
  "アウトリーチ": "#8b5cf6",
  "営業代行": "#ec4899",
};

function formatYen(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

export default function ServicePLCombo({ data }: { data: MonthServiceData[] }) {
  const months = [...new Set(data.map(d => d.year_month))].sort();
  const services = [...new Set(data.map(d => d.service_name))];

  // Sort services by total revenue desc
  const svcRev = new Map<string, number>();
  for (const r of data) svcRev.set(r.service_name, (svcRev.get(r.service_name) || 0) + r.revenue);
  services.sort((a, b) => (svcRev.get(b) || 0) - (svcRev.get(a) || 0));

  const chartData = months.map(ym => {
    const label = ym.replace(/^\d{4}-0?/, "").replace(/^/, "") + "月";
    const row: Record<string, string | number> = { month: label };

    const monthItems = data.filter(d => d.year_month === ym);
    const totalRev = monthItems.reduce((s, d) => s + d.revenue, 0);
    const totalGP = monthItems.reduce((s, d) => s + d.gross_profit, 0);

    for (const svc of services) {
      const item = monthItems.find(d => d.service_name === svc);
      row[svc] = item?.revenue || 0;
    }

    row["粗利率"] = totalRev > 0 ? Math.round((totalGP / totalRev) * 100) : 0;

    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="left"
          tickFormatter={formatYen}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
          domain={[0, 100]}
        />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "粗利率" ? `${value}%` : `¥${value.toLocaleString()}`
          }
        />
        <Legend />
        {services.map(svc => (
          <Bar
            key={svc}
            yAxisId="left"
            dataKey={svc}
            name={svc}
            stackId="revenue"
            fill={SERVICE_COLORS[svc] || "#94a3b8"}
            radius={services.indexOf(svc) === services.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
        <Line
          yAxisId="right"
          dataKey="粗利率"
          name="粗利率"
          type="monotone"
          stroke="#1e293b"
          strokeWidth={2.5}
          dot={{ r: 5 }}
          strokeDasharray="5 5"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
