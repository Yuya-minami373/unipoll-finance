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
  Line,
  ComposedChart,
  Legend,
} from "recharts";

interface ForecastPoint {
  month: string;
  balance: number;
  isActual: boolean;
}

interface ScenarioPoint {
  month: string;
  balance: number;
}

function formatYen(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

// Original single-line chart (kept for backwards compat)
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

// Scenario 3-line chart
interface ScenarioData {
  base: ScenarioPoint[];
  upside: ScenarioPoint[];
  downside: ScenarioPoint[];
}

export function CashForecastScenario({ scenarios, dangerLine }: { scenarios: ScenarioData; dangerLine: number }) {
  // Merge into single dataset keyed by month
  const merged = scenarios.base.map((bp, i) => ({
    month: bp.month,
    base: bp.balance,
    upside: scenarios.upside[i]?.balance ?? bp.balance,
    downside: scenarios.downside[i]?.balance ?? bp.balance,
  }));

  if (merged.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={merged} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatYen} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
        <Legend
          iconType="line"
          wrapperStyle={{ fontSize: 11 }}
        />
        <ReferenceLine
          y={dangerLine}
          stroke="#ef4444"
          strokeDasharray="5 5"
          label={{ value: "危険ライン", position: "right", fill: "#ef4444", fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="base"
          name="Base"
          stroke="#3b82f6"
          fill="url(#baseGrad)"
          strokeWidth={2.5}
        />
        <Line
          type="monotone"
          dataKey="upside"
          name="Upside"
          stroke="#22c55e"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="downside"
          name="Downside"
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
