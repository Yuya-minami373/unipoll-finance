"use client";

import { useState, useEffect } from "react";
import { yen } from "@/lib/format";

interface Budget {
  id: number;
  year_month: string;
  revenue_budget: number;
  expense_budget: number;
  notes: string | null;
}

export default function BudgetManager() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [form, setForm] = useState({ year_month: "", revenue_budget: "", expense_budget: "", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingYm, setEditingYm] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/budgets");
    setBudgets(await res.json());
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year_month: form.year_month,
        revenue_budget: parseInt(form.revenue_budget, 10) || 0,
        expense_budget: parseInt(form.expense_budget, 10) || 0,
        notes: form.notes || null,
      }),
    });
    setForm({ year_month: "", revenue_budget: "", expense_budget: "", notes: "" });
    setShowForm(false);
    setEditingYm(null);
    load();
  };

  const handleEdit = (b: Budget) => {
    setForm({
      year_month: b.year_month,
      revenue_budget: String(b.revenue_budget),
      expense_budget: String(b.expense_budget),
      notes: b.notes || "",
    });
    setEditingYm(b.year_month);
    setShowForm(true);
  };

  const handleDelete = async (ym: string) => {
    if (!confirm(`${ym} の予算を削除しますか？`)) return;
    await fetch(`/api/budgets?year_month=${ym}`, { method: "DELETE" });
    load();
  };

  // Generate next 12 months as options
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-600">月次予算</h2>
          <p className="text-xs text-slate-400 mt-0.5">月別の売上・費用予算を設定。予実対比に使用します</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingYm(null); setForm({ year_month: "", revenue_budget: "", expense_budget: "", notes: "" }); }}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? "キャンセル" : "+ 予算追加"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">月</label>
              <select
                value={form.year_month}
                onChange={(e) => setForm({ ...form, year_month: e.target.value })}
                required
                disabled={!!editingYm}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">選択...</option>
                {monthOptions.map(m => (
                  <option key={m} value={m}>{m.replace("-", "年") + "月"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">売上予算</label>
              <input
                type="number"
                placeholder="770000"
                value={form.revenue_budget}
                onChange={(e) => setForm({ ...form, revenue_budget: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">費用予算</label>
              <input
                type="number"
                placeholder="540000"
                value={form.expense_budget}
                onChange={(e) => setForm({ ...form, expense_budget: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">メモ</label>
              <input
                type="text"
                placeholder="備考"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            {editingYm ? "更新" : "登録"}
          </button>
        </form>
      )}

      {budgets.length === 0 ? (
        <p className="text-xs text-slate-400">予算が設定されていません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-slate-500 font-medium">月</th>
                <th className="text-right py-2 text-slate-500 font-medium">売上予算</th>
                <th className="text-right py-2 text-slate-500 font-medium">費用予算</th>
                <th className="text-right py-2 text-slate-500 font-medium">差引</th>
                <th className="text-left py-2 text-slate-500 font-medium pl-4">メモ</th>
                <th className="text-center py-2 text-slate-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map(b => {
                const net = b.revenue_budget - b.expense_budget;
                return (
                  <tr key={b.year_month} className="border-b border-slate-100">
                    <td className="py-2 text-slate-800 font-medium">{b.year_month.replace("-", "年") + "月"}</td>
                    <td className="py-2 text-right text-emerald-600">{yen(b.revenue_budget)}</td>
                    <td className="py-2 text-right text-red-500">{yen(b.expense_budget)}</td>
                    <td className={`py-2 text-right font-medium ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>{yen(net)}</td>
                    <td className="py-2 text-slate-400 text-xs pl-4">{b.notes || "—"}</td>
                    <td className="py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEdit(b)} className="px-2 py-1 text-xs bg-slate-50 text-slate-500 rounded hover:bg-slate-100">編集</button>
                        <button onClick={() => handleDelete(b.year_month)} className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100">削除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
