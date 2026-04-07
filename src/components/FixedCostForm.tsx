"use client";

import { useState } from "react";

export default function FixedCostForm({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(String(initialValue));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_fixed_cost_estimate: parseInt(value.replace(/,/g, ""), 10) }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const numVal = parseInt(value.replace(/,/g, ""), 10);
  const display = isNaN(numVal) ? "" : `¥${numVal.toLocaleString()}`;

  return (
    <div className="flex items-end gap-4">
      <div className="flex-1 max-w-xs">
        <label className="block text-xs text-slate-500 mb-1">月額固定費（円）</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="542000"
        />
        {display && <p className="text-xs text-slate-400 mt-1">{display}</p>}
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
  );
}
