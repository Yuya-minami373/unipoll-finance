"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RecurringItem {
  id: number;
  name: string;
  type: "income" | "expense";
  amount: number;
  day_of_month: number;
  is_active: number;
  notes: string | null;
}

interface Props {
  items: RecurringItem[];
}

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

export default function RecurringItemsManager({ items }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", type: "expense" as "income" | "expense", amount: "", day_of_month: "25", notes: "" });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setForm({ name: "", type: "expense", amount: "", day_of_month: "25", notes: "" });
    setEditing(null);
    setAdding(false);
  };

  const startEdit = (item: RecurringItem) => {
    setEditing(item.id);
    setAdding(false);
    setForm({
      name: item.name,
      type: item.type,
      amount: String(item.amount),
      day_of_month: String(item.day_of_month),
      notes: item.notes || "",
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) return;
    setLoading(true);
    try {
      const body = {
        ...(editing ? { id: editing } : {}),
        name: form.name,
        type: form.type,
        amount: Number(form.amount),
        day_of_month: Number(form.day_of_month),
        notes: form.notes || null,
      };
      await fetch("/api/recurring", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この項目を削除しますか？")) return;
    setLoading(true);
    try {
      await fetch(`/api/recurring?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const FormRow = () => (
    <tr className="bg-blue-50/50">
      <td className="py-2 px-1">
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
          placeholder="名前"
        />
      </td>
      <td className="py-2 px-1">
        <select
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value as "income" | "expense" })}
          className="text-sm border border-slate-300 rounded px-2 py-1.5"
        >
          <option value="income">収入</option>
          <option value="expense">支出</option>
        </select>
      </td>
      <td className="py-2 px-1">
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 text-right"
          placeholder="金額"
        />
      </td>
      <td className="py-2 px-1">
        <input
          type="number"
          value={form.day_of_month}
          onChange={e => setForm({ ...form, day_of_month: e.target.value })}
          className="w-16 text-sm border border-slate-300 rounded px-2 py-1.5 text-right"
          min="1"
          max="31"
        />
      </td>
      <td className="py-2 px-1">
        <input
          type="text"
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
          placeholder="備考"
        />
      </td>
      <td className="py-2 px-1 text-right whitespace-nowrap">
        <button
          onClick={handleSave}
          disabled={loading || !form.name || !form.amount}
          className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50 mr-1"
        >
          {editing ? "更新" : "追加"}
        </button>
        <button
          onClick={resetForm}
          className="text-xs text-slate-500 px-2 py-1.5 hover:text-slate-700"
        >
          取消
        </button>
      </td>
    </tr>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-600">月次固定項目</h2>
          <p className="text-xs text-slate-400 mt-0.5">キャッシュフロー予測に使用される毎月の収支項目</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => { setAdding(true); setEditing(null); }}
            className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600"
          >
            + 追加
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-slate-500 font-medium">名前</th>
              <th className="text-left py-2 text-slate-500 font-medium">種別</th>
              <th className="text-right py-2 text-slate-500 font-medium">金額</th>
              <th className="text-right py-2 text-slate-500 font-medium">支払日</th>
              <th className="text-left py-2 text-slate-500 font-medium">備考</th>
              <th className="text-right py-2 text-slate-500 font-medium w-28"></th>
            </tr>
          </thead>
          <tbody>
            {adding && <FormRow />}
            {items.map((r) =>
              editing === r.id ? (
                <FormRow key={r.id} />
              ) : (
                <tr key={r.id} className="border-b border-slate-100 group">
                  <td className="py-2.5 font-medium text-slate-800">{r.name}</td>
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {r.type === "income" ? "収入" : "支出"}
                    </span>
                  </td>
                  <td className={`py-2.5 text-right font-medium ${
                    r.type === "income" ? "text-emerald-600" : "text-red-500"
                  }`}>{yen(r.amount)}</td>
                  <td className="py-2.5 text-right text-slate-500">毎月{r.day_of_month}日</td>
                  <td className="py-2.5 text-xs text-slate-400">{r.notes || "-"}</td>
                  <td className="py-2.5 text-right opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <button
                      onClick={() => startEdit(r)}
                      className="text-xs text-blue-500 hover:text-blue-700 mr-2"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {adding && (
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-2">
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full text-sm border rounded px-2 py-1.5" placeholder="名前" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as "income" | "expense" })} className="text-sm border rounded px-2 py-1.5">
                <option value="income">収入</option>
                <option value="expense">支出</option>
              </select>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="text-sm border rounded px-2 py-1.5 text-right" placeholder="金額" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={form.day_of_month} onChange={e => setForm({ ...form, day_of_month: e.target.value })} className="text-sm border rounded px-2 py-1.5" placeholder="支払日" min="1" max="31" />
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="text-sm border rounded px-2 py-1.5" placeholder="備考" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={loading || !form.name || !form.amount} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded disabled:opacity-50">追加</button>
              <button onClick={resetForm} className="text-xs text-slate-500 px-2 py-1.5">取消</button>
            </div>
          </div>
        )}
        {items.map((r) =>
          editing === r.id ? (
            <div key={r.id} className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-2">
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full text-sm border rounded px-2 py-1.5" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as "income" | "expense" })} className="text-sm border rounded px-2 py-1.5">
                  <option value="income">収入</option>
                  <option value="expense">支出</option>
                </select>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="text-sm border rounded px-2 py-1.5 text-right" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={loading || !form.name || !form.amount} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded disabled:opacity-50">更新</button>
                <button onClick={resetForm} className="text-xs text-slate-500 px-2 py-1.5">取消</button>
              </div>
            </div>
          ) : (
            <div key={r.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-slate-800 text-sm">{r.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}>
                  {r.type === "income" ? "収入" : "支出"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">毎月{r.day_of_month}日 {r.notes && `/ ${r.notes}`}</span>
                <span className={`font-medium ${r.type === "income" ? "text-emerald-600" : "text-red-500"}`}>{yen(r.amount)}</span>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => startEdit(r)} className="text-xs text-blue-500">編集</button>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500">削除</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
