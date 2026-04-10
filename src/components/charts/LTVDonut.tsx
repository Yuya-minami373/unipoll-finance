"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface LTVDonutProps {
  data: Array<{ name: string; value: number }>;
}

const GP_COLORS = ["#ef4444", "#f97316"]; // red, orange for GP
const OTHER_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#06b6d4"]; // blue, green, purple, cyan

function getColor(name: string, idx: number): string {
  if (name.startsWith("Green Plus")) {
    return GP_COLORS[idx % GP_COLORS.length];
  }
  return OTHER_COLORS[idx % OTHER_COLORS.length];
}

const yen = (n: number) => `¥${Math.round(n / 10000)}万`;

export default function LTVDonut({ data }: LTVDonutProps) {
  // Sort: GP first, then others
  const sorted = [...data].sort((a, b) => {
    const aGP = a.name.startsWith("Green Plus") ? 0 : 1;
    const bGP = b.name.startsWith("Green Plus") ? 0 : 1;
    return aGP - bGP || b.value - a.value;
  });

  let gpIdx = 0;
  let otherIdx = 0;
  const colors = sorted.map((d) => {
    if (d.name.startsWith("Green Plus")) return getColor(d.name, gpIdx++);
    return getColor(d.name, otherIdx++);
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={sorted}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {sorted.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => yen(value)}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
