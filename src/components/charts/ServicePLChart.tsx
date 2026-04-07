"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ServiceData {
  service_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];

function formatYen(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

export default function ServicePLChart({ data }: { data: ServiceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="service_name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatYen} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: any) => `¥${Number(value).toLocaleString()}`} />
        <Bar dataKey="revenue" name="売上" radius={[4, 4, 0, 0]} barSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
