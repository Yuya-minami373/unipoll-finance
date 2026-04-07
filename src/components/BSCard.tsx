import { yen } from "@/lib/format";
import type { BSSnapshot } from "@/lib/finance";

export default function BSCard({ bs }: { bs: BSSnapshot }) {
  const totalLiabilities = bs.payables + bs.loan_balance;
  const debtRatio = bs.total_assets > 0 ? Math.round((totalLiabilities / bs.total_assets) * 100) : 0;
  const equityRatio = bs.total_assets > 0 ? Math.round((bs.net_assets / bs.total_assets) * 100) : 0;
  const currentRatio = (bs.payables > 0) ? Math.round(((bs.cash + bs.receivables_total) / bs.payables) * 100) : 999;

  return (
    <div className="card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-600">BS概要（{bs.year_month.replace("-", "年")}月）</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-8">
        {/* Assets */}
        <div>
          <h3 className="text-xs font-medium text-blue-600 mb-2">資産</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">現預金</span>
              <span className="text-sm font-medium text-slate-900">{yen(bs.cash)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">売掛金</span>
              <span className="text-sm font-medium text-slate-900">{yen(bs.receivables_total)}</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">資産計</span>
              <span className="text-sm font-bold text-slate-900">{yen(bs.total_assets)}</span>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div>
          <h3 className="text-xs font-medium text-red-500 mb-2">負債・純資産</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">未払金</span>
              <span className="text-sm font-medium text-slate-900">{yen(bs.payables)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">借入金</span>
              <span className="text-sm font-medium text-slate-900">{yen(bs.loan_balance)}</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">純資産</span>
              <span className={`text-sm font-bold ${bs.net_assets >= 0 ? "text-emerald-600" : "text-red-500"}`}>{yen(bs.net_assets)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial ratios */}
      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[10px] text-slate-400">自己資本比率</p>
          <p className={`text-lg font-bold ${equityRatio >= 30 ? "text-emerald-600" : equityRatio >= 15 ? "text-amber-500" : "text-red-500"}`}>
            {equityRatio}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400">負債比率</p>
          <p className={`text-lg font-bold ${debtRatio <= 50 ? "text-emerald-600" : debtRatio <= 70 ? "text-amber-500" : "text-red-500"}`}>
            {debtRatio}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400">流動比率</p>
          <p className={`text-lg font-bold ${currentRatio >= 200 ? "text-emerald-600" : currentRatio >= 100 ? "text-amber-500" : "text-red-500"}`}>
            {currentRatio > 900 ? "—" : `${currentRatio}%`}
          </p>
        </div>
      </div>
    </div>
  );
}
