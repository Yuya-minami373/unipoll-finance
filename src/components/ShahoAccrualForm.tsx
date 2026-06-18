"use client";

import { useState } from "react";

export default function ShahoAccrualForm({
  initialMonthly,
  initialStart,
}: {
  initialMonthly: number;
  initialStart: string;
}) {
  const [monthly, setMonthly] = useState(String(initialMonthly));
  const [start, setStart] = useState(initialStart);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shaho_accrual_monthly: parseInt(monthly.replace(/,/g, ""), 10) || 0,
          shaho_accrual_start: start,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const numVal = parseInt(monthly.replace(/,/g, ""), 10);
  const display = isNaN(numVal) ? "" : `¥${numVal.toLocaleString()}`;
  const disabled = !isNaN(numVal) && numVal === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="max-w-[180px]">
          <label className="block text-xs text-slate-500 mb-1">月額平準化額（円・0で補正OFF）</label>
          <input
            type="text"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value.replace(/[^\d]/g, ""))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="92192"
          />
          {display && <p className="text-xs text-slate-400 mt-1">{display}</p>}
        </div>
        <div className="max-w-[140px]">
          <label className="block text-xs text-slate-500 mb-1">適用開始月</label>
          <input
            type="month"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || isNaN(numVal)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
      </div>
      {disabled && (
        <p className="text-xs text-amber-600">補正OFF（freee実績の現金主義のまま表示されます）。</p>
      )}
    </div>
  );
}
