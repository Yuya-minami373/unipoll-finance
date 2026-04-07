"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SERVICES = ["Opsデザイン", "クルー", "アウトリーチ", "入札支援"];
const MUNICIPALITIES = ["深谷市", "横須賀市", "市原市"];

export default function ProjectForm() {
  const router = useRouter();
  const now = new Date();
  const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [yearMonth, setYearMonth] = useState(defaultYM);
  const [municipality, setMunicipality] = useState("");
  const [customMunicipality, setCustomMunicipality] = useState("");
  const [serviceName, setServiceName] = useState(SERVICES[0]);
  const [revenue, setRevenue] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const actualMunicipality = municipality === "__custom__" ? customMunicipality : municipality;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actualMunicipality || !yearMonth) return;
    setSaving(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year_month: yearMonth,
          municipality: actualMunicipality,
          service_name: serviceName,
          revenue: parseInt(revenue || "0", 10),
          cost: parseInt(cost || "0", 10),
          notes: notes || null,
        }),
      });
      router.refresh();
      setRevenue("");
      setCost("");
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  const rev = parseInt(revenue || "0", 10);
  const cst = parseInt(cost || "0", 10);
  const gp = rev - cst;
  const gpRate = rev > 0 ? Math.round((gp / rev) * 100) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">年月</label>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">自治体</label>
          <select
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          >
            <option value="">選択...</option>
            {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            <option value="__custom__">その他（手入力）</option>
          </select>
          {municipality === "__custom__" && (
            <input
              type="text"
              value={customMunicipality}
              onChange={(e) => setCustomMunicipality(e.target.value)}
              placeholder="自治体名を入力"
              className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          )}
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">サービス</label>
          <select
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">備考</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例: 市長選"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">売上（円）</label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">原価（円）</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex items-end">
          <div className="text-sm">
            <span className="text-slate-500">粗利: </span>
            <span className={`font-bold ${gp >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              ¥{gp.toLocaleString()}
            </span>
            <span className="text-slate-400 ml-2">({gpRate}%)</span>
          </div>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving || !actualMunicipality}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "登録中..." : "登録"}
          </button>
        </div>
      </div>
    </form>
  );
}
