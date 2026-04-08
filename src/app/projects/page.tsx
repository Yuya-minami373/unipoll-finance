import { yen } from "@/lib/format";
import { getProjectProfitability, getProjectProfitabilitySummary } from "@/lib/finance";
import ProjectForm from "@/components/ProjectForm";
import ProjectTable from "@/components/ProjectTable";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, summary] = await Promise.all([
    getProjectProfitability(),
    getProjectProfitabilitySummary(),
  ]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">案件別採算</h1>
        <p className="text-sm text-slate-500 mt-0.5">自治体 × サービスごとの売上・原価・粗利</p>
      </div>

      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="card p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">案件サマリー（累計）</h2>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">自治体</th>
                  <th className="text-left py-2 text-slate-500 font-medium">サービス</th>
                  <th className="text-right py-2 text-slate-500 font-medium">売上</th>
                  <th className="text-right py-2 text-slate-500 font-medium">原価</th>
                  <th className="text-right py-2 text-slate-500 font-medium">粗利</th>
                  <th className="text-right py-2 text-slate-500 font-medium">粗利率</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2.5 font-medium text-slate-800">{String(s.municipality)}</td>
                    <td className="py-2.5 text-slate-700">{String(s.service_name)}</td>
                    <td className="py-2.5 text-right text-slate-700">{yen(Number(s.total_revenue))}</td>
                    <td className="py-2.5 text-right text-slate-700">{yen(Number(s.total_cost))}</td>
                    <td className={`py-2.5 text-right font-medium ${Number(s.total_gross_profit) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {yen(Number(s.total_gross_profit))}
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      {Number(s.total_revenue) > 0 ? `${Math.round((Number(s.total_gross_profit) / Number(s.total_revenue)) * 100)}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {summary.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300">
                    <td className="py-2.5 font-bold text-slate-900" colSpan={2}>合計</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{yen(summary.reduce((s, r) => s + Number(r.total_revenue), 0))}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{yen(summary.reduce((s, r) => s + Number(r.total_cost), 0))}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{yen(summary.reduce((s, r) => s + Number(r.total_gross_profit), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {summary.map((s, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-800 text-sm">{String(s.municipality)} / {String(s.service_name)}</span>
                  <span className="text-xs text-slate-500">
                    {Number(s.total_revenue) > 0 ? `${Math.round((Number(s.total_gross_profit) / Number(s.total_revenue)) * 100)}%` : "-"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">売上</span>
                    <p className="font-medium">{yen(Number(s.total_revenue))}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">原価</span>
                    <p className="font-medium">{yen(Number(s.total_cost))}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">粗利</span>
                    <p className={`font-medium ${Number(s.total_gross_profit) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{yen(Number(s.total_gross_profit))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new record */}
      <div className="card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">案件データ登録</h2>
        <ProjectForm />
      </div>

      {/* Detail table */}
      {projects.length > 0 && (
        <div className="card p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">月次明細</h2>
          <ProjectTable data={projects} />
        </div>
      )}

      {projects.length === 0 && summary.length === 0 && (
        <div className="card p-4 md:p-6 text-center text-slate-400 text-sm">
          データがありません。上のフォームから案件データを登録してください。
        </div>
      )}
    </div>
  );
}
