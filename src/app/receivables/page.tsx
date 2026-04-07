"use client";

import { useState, useEffect, useCallback } from "react";
import { yen } from "@/lib/format";

interface Receivable {
  id: number;
  due_date: string;
  source: string;
  service_name: string | null;
  amount: number;
  status: "pending" | "received" | "overdue";
  received_date: string | null;
  notes: string | null;
}

const statusConfig = {
  pending: { label: "未入金", color: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  received: { label: "入金済", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  overdue: { label: "期限超過", color: "bg-red-100 text-red-700", dot: "bg-red-400" },
};

function getCurrentAndNextMonth() {
  const today = new Date();
  const current = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const next = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  return [current, next];
}

export default function ReceivablesPage() {
  const [items, setItems] = useState<Receivable[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "received" | "overdue">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ due_date: "", source: "", service_name: "", amount: "", notes: "" });
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const [currentMonth, nextMonth] = getCurrentAndNextMonth();

  const load = useCallback(async () => {
    const res = await fetch("/api/receivables");
    const data = await res.json();
    const today = new Date().toISOString().split("T")[0];
    const updated = data.map((r: Receivable) => ({
      ...r,
      status: r.status === "pending" && r.due_date < today ? "overdue" as const : r.status,
    }));
    setItems(updated);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? items : items.filter((r) => r.status === filter);

  const grouped = filtered.reduce((acc, r) => {
    const month = r.due_date.substring(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(r);
    return acc;
  }, {} as Record<string, Receivable[]>);

  const monthTotals = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => ({
      month,
      label: month.replace("-", "年") + "月",
      total: items.reduce((s, r) => s + r.amount, 0),
      pending: items.filter((r) => r.status !== "received").reduce((s, r) => s + r.amount, 0),
      received: items.filter((r) => r.status === "received").reduce((s, r) => s + r.amount, 0),
      items,
      isFuture: month > nextMonth,
    }));

  const totalPending = items.filter((r) => r.status === "pending" || r.status === "overdue").reduce((s, r) => s + r.amount, 0);
  const totalReceived = items.filter((r) => r.status === "received").reduce((s, r) => s + r.amount, 0);
  const overdueCount = items.filter((r) => r.status === "overdue").length;

  function toggleMonth(month: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  function isCollapsed(month: string, isFuture: boolean) {
    if (collapsedMonths.has(month + ":open")) return false;
    if (collapsedMonths.has(month + ":closed")) return true;
    return isFuture;
  }

  function handleToggle(month: string, isFuture: boolean) {
    const currently = isCollapsed(month, isFuture);
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      next.delete(month + ":open");
      next.delete(month + ":closed");
      next.add(month + (currently ? ":open" : ":closed"));
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/receivables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseInt(form.amount, 10) }),
    });
    setForm({ due_date: "", source: "", service_name: "", amount: "", notes: "" });
    setShowForm(false);
    load();
  }

  async function markReceived(id: number) {
    await fetch("/api/receivables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status: "received" }),
    });
    load();
  }

  async function markPending(id: number) {
    await fetch("/api/receivables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status: "pending" }),
    });
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/receivables?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">入金予定</h1>
          <p className="text-sm text-slate-500 mt-0.5">売掛金の入金タイミングを管理</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          {showForm ? "キャンセル" : "+ 入金予定を追加"}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="card p-3 md:p-4">
          <p className="text-xs text-slate-500">未入金合計</p>
          <p className="text-lg md:text-xl font-bold text-amber-600">{yen(totalPending)}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-xs text-slate-500">入金済合計</p>
          <p className="text-lg md:text-xl font-bold text-emerald-600">{yen(totalReceived)}</p>
        </div>
        <div className="card p-3 md:p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-500">期限超過</p>
          <p className={`text-lg md:text-xl font-bold ${overdueCount > 0 ? "text-red-500" : "text-slate-400"}`}>{overdueCount}件</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 md:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-600">新規入金予定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">入金予定日 *</label>
              <input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">入金元 *</label>
              <input type="text" required placeholder="深谷市、Green Plus等" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">サービス名</label>
              <input type="text" placeholder="クルー、入札支援等" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">金額 *</label>
              <input type="number" required placeholder="1045000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">メモ</label>
            <input type="text" placeholder="備考" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">登録</button>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {([["all", "すべて"], ["pending", "未入金"], ["received", "入金済"], ["overdue", "期限超過"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors shrink-0 ${
              filter === key ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Grouped by month */}
      {monthTotals.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">入金予定がありません</div>
      ) : (
        monthTotals.map(({ month, label, total, pending, items, isFuture }) => {
          const collapsed = isCollapsed(month, isFuture);
          return (
            <div key={month} className="space-y-3">
              <button
                onClick={() => handleToggle(month, isFuture)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isFuture ? "text-slate-500" : "text-slate-700"}`}>
                    {label}
                  </span>
                  {isFuture && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">先行登録</span>
                  )}
                  <span className={`text-xs transition-transform duration-200 text-slate-400 ${collapsed ? "" : "rotate-180"}`}>▼</span>
                </div>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span>合計 <span className="font-medium text-slate-700">{yen(total)}</span></span>
                  {pending > 0 && <span>未入金 <span className="font-medium text-amber-600">{yen(pending)}</span></span>}
                </div>
              </button>

              {!collapsed && (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-2.5 text-slate-500 font-medium min-w-[100px]">予定日</th>
                          <th className="text-left px-4 py-2.5 text-slate-500 font-medium min-w-[120px]">入金元</th>
                          <th className="text-left px-4 py-2.5 text-slate-500 font-medium min-w-[100px]">サービス</th>
                          <th className="text-right px-4 py-2.5 text-slate-500 font-medium min-w-[100px]">金額</th>
                          <th className="text-center px-4 py-2.5 text-slate-500 font-medium min-w-[80px]">ステータス</th>
                          <th className="text-center px-4 py-2.5 text-slate-500 font-medium min-w-[120px]">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((r) => {
                          const cfg = statusConfig[r.status];
                          return (
                            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 text-slate-800">{r.due_date}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-800">{r.source}</td>
                              <td className="px-4 py-2.5 text-slate-600">{r.service_name || "—"}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-900">{yen(r.amount)}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex justify-center gap-1">
                                  {r.status !== "received" ? (
                                    <button onClick={() => markReceived(r.id)} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">入金確認</button>
                                  ) : (
                                    <button onClick={() => markPending(r.id)} className="px-2 py-1 text-xs bg-slate-50 text-slate-500 rounded hover:bg-slate-100">戻す</button>
                                  )}
                                  <button onClick={() => handleDelete(r.id)} className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100">削除</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2">
                    {items.map((r) => {
                      const cfg = statusConfig[r.status];
                      return (
                        <div key={r.id} className="card p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm text-slate-800">{r.source}</p>
                              <p className="text-xs text-slate-500">{r.service_name || ""} ・ {r.due_date}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-slate-900">{yen(r.amount)}</p>
                            <div className="flex gap-1">
                              {r.status !== "received" ? (
                                <button onClick={() => markReceived(r.id)} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded">入金確認</button>
                              ) : (
                                <button onClick={() => markPending(r.id)} className="px-2 py-1 text-xs bg-slate-50 text-slate-500 rounded">戻す</button>
                              )}
                              <button onClick={() => handleDelete(r.id)} className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded">削除</button>
                            </div>
                          </div>
                          {r.notes && <p className="text-[10px] text-slate-400 mt-1">{r.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
