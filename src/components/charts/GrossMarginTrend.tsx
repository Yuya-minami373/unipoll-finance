"use client";

import {
  LineChart,
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
};

export default function GrossMarginTrend({ data }: { data: MonthServiceData[] }) {
  // Group by month, compute per-service gross margin %
  const months = [...new Set(data.map(d => d.year_month))].sort();
  const services = [...new Set(data.map(d => d.service_name))];

  const chartData = months.map(ym => {
    const label = ym.replace(/^(\d{4})-(\d{2})$/, "$1年$2月");
    const row: Record<string, string | number> = { month: label };

    // Overall margin for this month
    const monthItems = data.filter(d => d.year_month === ym);
    const totalRev = monthItems.reduce((s, d) => s + d.revenue, 0);
    const totalGP = monthItems.reduce((s, d) => s + d.gross_profit, 0);
    row["全体"] = totalRev > 0 ? Math.round((totalGP / totalRev) * 100) : 0;

    // Per-service margin
    for (const svc of services) {
      const item = monthItems.find(d => d.service_name === svc);
      if (item && item.revenue > 0) {
        row[svc] = Math.round((item.gross_profit / item.revenue) * 100);
      }
    }

    return row;
  });

  // Only show services that have at least one data point
  const activeServices = services.filter(svc =>
    chartData.some(row => row[svc] !== undefined && row[svc] !== 0)
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
          domain={[0, 100]}
        />
        <Tooltip formatter={(value: number) => `${value}%`} />
        <Legend />
        <Line
          dataKey="全体"
          name="全体"
          type="monotone"
          stroke="#1e293b"
          strokeWidth={2.5}
          dot={{ r: 5 }}
          strokeDasharray="5 5"
        />
        {activeServices.map(svc => (
          <Line
            key={svc}
            dataKey={svc}
            name={svc}
            type="monotone"
            stroke={SERVICE_COLORS[svc] || "#94a3b8"}
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
