"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface ForecastPoint {
  month: string;
  balance: number;
  isActual: boolean;
}

function formatYen(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

export default function CashForecast({ data, dangerLine }: { data: ForecastPoint[]; dangerLine: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatYen} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
        <ReferenceLine
          y={dangerLine}
          stroke="#ef4444"
          strokeDasharray="5 5"
          label={{ value: "危険ライン", position: "right", fill: "#ef4444", fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          name="現預金残高"
          stroke="#22c55e"
          fill="url(#cashGrad)"
          strokeWidth={2.5}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            return (
              <circle
                key={payload.month}
                cx={cx}
                cy={cy}
                r={4}
                fill={payload.isActual ? "#22c55e" : "#94a3b8"}
                stroke={payload.isActual ? "#22c55e" : "#94a3b8"}
                strokeWidth={2}
                strokeDasharray={payload.isActual ? "" : "3 3"}
              />
            );
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
