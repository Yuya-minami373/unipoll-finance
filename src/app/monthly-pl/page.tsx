import { yen, pctChange } from "@/lib/format";
import { getAllSnapshots, getExpenseTotalsByMonth, getYTDSummary, getBudgets } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function MonthlyPLPage() {
  const [snapshots, expenseTrend, ytd, budgets] = await Promise.all([
    getAllSnapshots(),
    getExpenseTotalsByMonth(),
    getYTDSummary(),
    getBudgets(),
  ]);

  // Build lookup for expense breakdown
  const expenseMap = new Map(expenseTrend.map(e => [e.year_month, e]));
  const budgetMap = new Map(budgets.map(b => [String(b.year_month), b]));
  const hasBudgets = budgets.length > 0;

  // Cross-tab data: rows = line items, columns = months
  const months = snapshots.map(s => String(s.year_month));
  const fmtMonth = (ym: string) => ym.replace(/^\d{4}-/, "").replace(/^0/, "") + "月";

  // Row definitions
  const rows = [
    { key: "revenue", label: "売上", getValue: (ym: string) => Number(snapshots.find(s => s.year_month === ym)?.total_revenue || 0), style: "text-emerald-600 font-medium" },
    { key: "fixed", label: "固定費", getValue: (ym: string) => Number(expenseMap.get(ym)?.fixed || 0), style: "text-slate-700" },
    { key: "variable", label: "変動費", getValue: (ym: string) => Number(expenseMap.get(ym)?.variable || 0), style: "text-slate-700" },
    { key: "expense", label: "費用合計", getValue: (ym: string) => Number(snapshots.find(s => s.year_month === ym)?.total_expense || 0), style: "text-red-500 font-medium" },
    { key: "net", label: "営業損益", getValue: (ym: string) => Number(snapshots.find(s => s.year_month === ym)?.net_income || 0), style: "font-bold", dynamic: true },
  ];

  // Compute totals per row
  const rowTotals = rows.map(r => months.reduce((s, m) => s + r.getValue(m), 0));

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">月次 P/L</h1>
        <p className="text-sm text-slate-500 mt-0.5">月別の損益計算書</p>
      </div>

      {/* YTD Summary Card */}
      <div className="card p-4 md:p-6 gradient-cash">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">年度累計（{ytd.months}ヶ月）</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">売上合計</p>
            <p className="text-xl font-bold text-emerald-600">{yen(ytd.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">費用合計</p>
            <p className="text-xl font-bold text-red-500">{yen(ytd.expense)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">損益</p>
            <p className={`text-xl font-bold ${ytd.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {yen(ytd.netIncome)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">月平均売上</p>
            <p className="text-xl font-bold text-slate-900">{yen(Math.round(ytd.revenue / ytd.months))}</p>
          </div>
        </div>
      </div>

      {/* Cross-tab P/L Table */}
      <div className="card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">月次損益一覧</h2>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-slate-500 font-medium sticky left-0 bg-white z-10 min-w-[100px]">科目</th>
                {months.map(m => (
                  <th key={m} className="text-right py-2 text-slate-500 font-medium min-w-[100px]">{fmtMonth(m)}</th>
                ))}
                <th className="text-right py-2 text-slate-700 font-semibold min-w-[110px] border-l border-slate-200">合計</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const isNet = r.key === "net";
                const isExpenseTotal = r.key === "expense";
                return (
                  <tr key={r.key} className={`${isNet ? "border-t-2 border-slate-300" : "border-b border-slate-100"} ${isExpenseTotal ? "border-b-2 border-slate-200" : ""}`}>
                    <td className={`py-2.5 text-slate-800 sticky left-0 bg-white z-10 ${r.style}`}>{r.label}</td>
                    {months.map(m => {
                      const val = r.getValue(m);
                      const colorClass = r.dynamic
                        ? (val >= 0 ? "text-emerald-600" : "text-red-500")
                        : r.style;
                      return (
                        <td key={m} className={`py-2.5 text-right ${colorClass}`}>{yen(val)}</td>
                      );
                    })}
                    <td className={`py-2.5 text-right border-l border-slate-200 ${r.dynamic ? (rowTotals[ri] >= 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold") : r.style}`}>
                      {yen(rowTotals[ri])}
                    </td>
                  </tr>
                );
              })}
              {/* Budget vs actual rows */}
              {hasBudgets && (
                <>
                  <tr className="border-t border-dashed border-blue-200 bg-blue-50/30">
                    <td className="py-2 text-xs text-blue-600 font-medium sticky left-0 bg-blue-50/30 z-10">予算（損益）</td>
                    {months.map(m => {
                      const b = budgetMap.get(m);
                      if (!b) return <td key={m} className="py-2 text-right text-xs text-slate-300">—</td>;
                      const net = Number(b.revenue_budget) - Number(b.expense_budget);
                      return <td key={m} className={`py-2 text-right text-xs ${net >= 0 ? "text-blue-600" : "text-red-400"}`}>{yen(net)}</td>;
                    })}
                    <td className="py-2 text-right text-xs text-blue-600 border-l border-slate-200">
                      {yen(budgets.reduce((s, b) => s + Number(b.revenue_budget) - Number(b.expense_budget), 0))}
                    </td>
                  </tr>
                  <tr className="bg-blue-50/30">
                    <td className="py-2 text-xs text-blue-600 font-medium sticky left-0 bg-blue-50/30 z-10">差異</td>
                    {months.map(m => {
                      const b = budgetMap.get(m);
                      const snap = snapshots.find(s => s.year_month === m);
                      if (!b || !snap) return <td key={m} className="py-2 text-right text-xs text-slate-300">—</td>;
                      const actualNet = Number(snap.net_income);
                      const budgetNet = Number(b.revenue_budget) - Number(b.expense_budget);
                      const diff = actualNet - budgetNet;
                      return <td key={m} className={`py-2 text-right text-xs font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>{diff >= 0 ? "+" : ""}{yen(diff)}</td>;
                    })}
                    <td className="py-2 text-right text-xs border-l border-slate-200">
                      {(() => {
                        const totalActual = ytd.netIncome;
                        const totalBudget = budgets.reduce((s, b) => s + Number(b.revenue_budget) - Number(b.expense_budget), 0);
                        const diff = totalActual - totalBudget;
                        return <span className={`font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>{diff >= 0 ? "+" : ""}{yen(diff)}</span>;
                      })()}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {[...months].reverse().map((m) => {
            const snap = snapshots.find(s => s.year_month === m);
            const expense = expenseMap.get(m);
            if (!snap) return null;
            return (
              <div key={m} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800">{String(m).replace("-", "年") + "月"}</span>
                  <span className={`text-sm font-bold ${Number(snap.net_income) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {yen(Number(snap.net_income))}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">売上</span>
                    <span className="text-emerald-600 font-medium">{yen(Number(snap.total_revenue))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">費用</span>
                    <span className="text-red-500 font-medium">{yen(Number(snap.total_expense))}</span>
                  </div>
                  {expense && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">固定費</span>
                        <span className="text-slate-700">{yen(Number(expense.fixed))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">変動費</span>
                        <span className="text-slate-700">{yen(Number(expense.variable))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
