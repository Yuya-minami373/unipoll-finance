"use client";

import { useRouter } from "next/navigation";

interface ProjectRow {
  id: number;
  year_month: string;
  municipality: string;
  service_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  notes: string | null;
}

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

export default function ProjectTable({ data }: { data: ProjectRow[] }) {
  const router = useRouter();

  async function handleDelete(id: number) {
    if (!confirm("この明細を削除しますか？")) return;
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 text-slate-500 font-medium min-w-[80px]">年月</th>
            <th className="text-left py-2 text-slate-500 font-medium min-w-[80px]">自治体</th>
            <th className="text-left py-2 text-slate-500 font-medium min-w-[100px]">サービス</th>
            <th className="text-right py-2 text-slate-500 font-medium min-w-[90px]">売上</th>
            <th className="text-right py-2 text-slate-500 font-medium min-w-[90px]">原価</th>
            <th className="text-right py-2 text-slate-500 font-medium min-w-[90px]">粗利</th>
            <th className="text-right py-2 text-slate-500 font-medium min-w-[60px]">粗利率</th>
            <th className="text-left py-2 text-slate-500 font-medium min-w-[80px]">備考</th>
            <th className="py-2 min-w-[40px]"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="py-2.5 text-slate-700">{row.year_month.replace("-", "年") + "月"}</td>
              <td className="py-2.5 font-medium text-slate-800">{row.municipality}</td>
              <td className="py-2.5 text-slate-700">{row.service_name}</td>
              <td className="py-2.5 text-right text-slate-700">{yen(row.revenue)}</td>
              <td className="py-2.5 text-right text-slate-700">{yen(row.cost)}</td>
              <td className={`py-2.5 text-right font-medium ${row.gross_profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {yen(row.gross_profit)}
              </td>
              <td className="py-2.5 text-right text-slate-500">
                {row.revenue > 0 ? `${Math.round((row.gross_profit / row.revenue) * 100)}%` : "-"}
              </td>
              <td className="py-2.5 text-xs text-slate-400">{row.notes || "-"}</td>
              <td className="py-2.5 text-center">
                <button
                  onClick={() => handleDelete(row.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors text-xs"
                  title="削除"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
