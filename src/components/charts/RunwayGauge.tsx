"use client";

interface RunwayGaugeProps {
  months: number;
  max?: number;
}

export default function RunwayGauge({ months, max = 12 }: RunwayGaugeProps) {
  const pct = Math.min((months / max) * 100, 100);
  const color =
    months < 2 ? "bg-red-500" :
    months < 4 ? "bg-amber-500" :
    months < 6 ? "bg-yellow-400" :
    "bg-emerald-500";

  const textColor =
    months < 2 ? "text-red-600" :
    months < 4 ? "text-amber-600" :
    "text-emerald-600";

  return (
    <div>
      <div className="flex items-end gap-2 mb-3">
        <span className={`text-5xl font-black ${textColor}`}>{months}</span>
        <span className="text-lg text-slate-500 font-medium pb-1">ヶ月</span>
      </div>
      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full progress-bar ${color} ${months < 2 ? "pulse-warning" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-slate-400">0</span>
        <span className="text-[10px] text-slate-400">{max}ヶ月</span>
      </div>
    </div>
  );
}
