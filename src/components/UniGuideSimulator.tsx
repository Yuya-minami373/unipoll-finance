"use client";

import { useState } from "react";

const UNIGUIDE_LTV = {
  S: { year1: 2000000, label: "S（5名以下）" },
  M: { year1: 2500000, label: "M（6〜10名）" },
  L: { year1: 3000000, label: "L（11名以上）" },
};
const ANNUAL_RECURRING = 5800000; // 月額40万 + 選挙加算100万
const CREW_ANNUAL = 3460000; // パターンB×2箇所×7日

function calcLTV3y(size: "S" | "M" | "L", withCrew: boolean): number {
  const y1 = UNIGUIDE_LTV[size].year1;
  const annual = ANNUAL_RECURRING + (withCrew ? CREW_ANNUAL : 0);
  return y1 + annual * 2;
}

const yen = (n: number) => `¥${(n / 10000).toFixed(0)}万`;

interface Props {
  currentLTV3y: number;
  currentGPLTV3y: number;
}

export default function UniGuideSimulator({ currentLTV3y, currentGPLTV3y }: Props) {
  const [size, setSize] = useState<"S" | "M" | "L">("M");
  const [withCrew, setWithCrew] = useState(false);
  const [count, setCount] = useState(1);

  const perCustomer = calcLTV3y(size, withCrew);
  const addedLTV = perCustomer * count;
  const newTotal = currentLTV3y + addedLTV;
  const newGPConcentration = newTotal > 0 ? Math.round(currentGPLTV3y / newTotal * 100) : 0;

  return (
    <div className="card p-4 md:p-6">
      <h2 className="text-sm font-semibold text-slate-600 mb-4">UniGuide受注シミュレーション</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Size selector */}
        <div>
          <label className="text-xs text-slate-500 block mb-1">規模</label>
          <div className="flex gap-2">
            {(["S", "M", "L"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  size === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{UNIGUIDE_LTV[size].label}</p>
        </div>

        {/* Crew toggle */}
        <div>
          <label className="text-xs text-slate-500 block mb-1">クルーセット</label>
          <button
            onClick={() => setWithCrew(!withCrew)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              withCrew
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {withCrew ? "あり" : "なし"}
          </button>
        </div>

        {/* Count */}
        <div>
          <label className="text-xs text-slate-500 block mb-1">受注数</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-9 h-9 text-sm rounded-lg font-medium transition-colors ${
                  count === n
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-blue-400">1社あたり3年LTV</p>
          <p className="text-lg font-bold text-blue-700">{yen(perCustomer)}</p>
        </div>
        <div>
          <p className="text-[10px] text-blue-400">LTV増分（{count}社）</p>
          <p className="text-lg font-bold text-emerald-600">+{yen(addedLTV)}</p>
        </div>
        <div>
          <p className="text-[10px] text-blue-400">LTV合計（新）</p>
          <p className="text-lg font-bold text-slate-800">{yen(newTotal)}</p>
        </div>
        <div>
          <p className="text-[10px] text-blue-400">GP集中度</p>
          <p className={`text-lg font-bold ${newGPConcentration > 70 ? "text-red-500" : newGPConcentration > 50 ? "text-amber-500" : "text-emerald-600"}`}>
            {newGPConcentration}%
            <span className="text-[10px] font-normal text-slate-400 ml-1">
              (現在{currentLTV3y > 0 ? Math.round(currentGPLTV3y / currentLTV3y * 100) : 0}%)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
