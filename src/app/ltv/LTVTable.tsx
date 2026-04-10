"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerLTV } from "@/lib/finance";

const yen = (n: number) => `¥${(n / 10000).toFixed(0)}万`;

const CONTRACT_LABELS: Record<string, string> = {
  recurring: "定期",
  one_time: "単発",
  variable: "変動",
};

interface Props {
  customers: CustomerLTV[];
}

export default function LTVTable({ customers }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    service_name: "",
    contract_type: "recurring" as "recurring" | "one_time" | "variable",
    monthly_amount: 0,
    annual_amount: 0,
    start_date: "",
    ltv_3y: 0,
    ltv_5y: 0,
    notes: "",
  });

  async function handleAdd() {
    await fetch("/api/ltv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, is_active: 1, notes: form.notes || null }),
    });
    setAdding(false);
    setForm({ customer_name: "", service_name: "", contract_type: "recurring", monthly_amount: 0, annual_amount: 0, start_date: "", ltv_3y: 0, ltv_5y: 0, notes: "" });
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/ltv", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-1 font-medium text-slate-500">顧客</th>
              <th className="text-left py-2 px-1 font-medium text-slate-500">サービス</th>
              <th className="text-left py-2 px-1 font-medium text-slate-500">種別</th>
              <th className="text-right py-2 px-1 font-medium text-slate-500">月額</th>
              <th className="text-right py-2 px-1 font-medium text-slate-500">3年LTV</th>
              <th className="text-right py-2 px-1 font-medium text-slate-500">5年LTV</th>
              <th className="py-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-1 font-medium text-slate-700">{c.customer_name}</td>
                <td className="py-2 px-1 text-slate-600">{c.service_name}</td>
                <td className="py-2 px-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    c.contract_type === "recurring" ? "bg-emerald-100 text-emerald-700" :
                    c.contract_type === "variable" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {CONTRACT_LABELS[c.contract_type] || c.contract_type}
                  </span>
                </td>
                <td className="py-2 px-1 text-right font-medium">{yen(c.monthly_amount)}</td>
                <td className="py-2 px-1 text-right font-medium">{yen(c.ltv_3y)}</td>
                <td className="py-2 px-1 text-right font-medium">{yen(c.ltv_5y)}</td>
                <td className="py-2 px-1 text-right">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-400 hover:text-red-600 text-[10px]"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      {adding ? (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input className="input-field text-xs" placeholder="顧客名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input className="input-field text-xs" placeholder="サービス名" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select className="input-field text-xs" value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value as "recurring" | "one_time" | "variable" })}>
              <option value="recurring">定期</option>
              <option value="one_time">単発</option>
              <option value="variable">変動</option>
            </select>
            <input className="input-field text-xs" type="number" placeholder="月額" value={form.monthly_amount || ""} onChange={(e) => setForm({ ...form, monthly_amount: Number(e.target.value) })} />
            <input className="input-field text-xs" type="number" placeholder="年額" value={form.annual_amount || ""} onChange={(e) => setForm({ ...form, annual_amount: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="input-field text-xs" type="number" placeholder="3年LTV" value={form.ltv_3y || ""} onChange={(e) => setForm({ ...form, ltv_3y: Number(e.target.value) })} />
            <input className="input-field text-xs" type="number" placeholder="5年LTV" value={form.ltv_5y || ""} onChange={(e) => setForm({ ...form, ltv_5y: Number(e.target.value) })} />
            <input className="input-field text-xs" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">追加</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1 bg-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-300">キャンセル</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 text-xs text-blue-500 hover:underline"
        >
          + 顧客を追加
        </button>
      )}
    </div>
  );
}
