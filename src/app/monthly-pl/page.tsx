import { yen } from "@/lib/format";
import {
  getAllSnapshots,
  getExpenseByCategoryByMonth,
  getBudgets,
  getShahoAccrualConfig,
  shahoCorrectionDelta,
  SHAHO_ACCRUAL_CATEGORY,
} from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function MonthlyPLPage() {
  const [snapshots, categoryExpenses, budgets, shahoConfig] = await Promise.all([
    getAllSnapshots(),
    getExpenseByCategoryByMonth(),
    getBudgets(),
    getShahoAccrualConfig(),
  ]);

  const months = snapshots.map(s => String(s.year_month));
  const fmtMonth = (ym: string) => ym.replace(/^\d{4}-/, "").replace(/^0/, "") + "月";

  const snapByMonth = new Map(snapshots.map(s => [String(s.year_month), s]));
  const budgetMap = new Map(budgets.map(b => [String(b.year_month), b]));
  const hasBudgets = budgets.length > 0;

  // category → (year_month → amount) と費目メタ（固定/変動）を構築
  const catMonthMap = new Map<string, Map<string, number>>();
  const catIsFixed = new Map<string, number>();
  for (const e of categoryExpenses) {
    const cat = String(e.category);
    const ym = String(e.year_month);
    if (!catMonthMap.has(cat)) catMonthMap.set(cat, new Map());
    catMonthMap.get(cat)!.set(ym, Number(e.amount));
    catIsFixed.set(cat, Number(e.is_fixed));
  }

  // 社保（法定福利費）発生主義補正
  const correctionApplies = shahoConfig.monthlyAmount > 0;
  const rawShaho = (ym: string) => catMonthMap.get(SHAHO_ACCRUAL_CATEGORY)?.get(ym) ?? 0;
  const correctionByMonth = new Map<string, number>();
  for (const ym of months) {
    correctionByMonth.set(ym, shahoCorrectionDelta(ym, rawShaho(ym), shahoConfig));
  }
  // 補正対象月（社保=0の月でも行を出すため、対象月が存在する限り費目を保証）
  const correctedMonths = months.filter(m => correctionApplies && m >= shahoConfig.startMonth);
  if (correctionApplies && correctedMonths.length > 0 && !catMonthMap.has(SHAHO_ACCRUAL_CATEGORY)) {
    catMonthMap.set(SHAHO_ACCRUAL_CATEGORY, new Map());
    catIsFixed.set(SHAHO_ACCRUAL_CATEGORY, 1);
  }

  // 表示用の費目金額（法定福利費は補正対象月に平準化額へ置換）
  const catAmount = (cat: string, ym: string): number => {
    if (cat === SHAHO_ACCRUAL_CATEGORY && correctionApplies && ym >= shahoConfig.startMonth) {
      return shahoConfig.monthlyAmount;
    }
    return catMonthMap.get(cat)?.get(ym) ?? 0;
  };
  const catYtd = (cat: string) => months.reduce((s, m) => s + catAmount(cat, m), 0);

  // 固定費・変動費グループ（各グループ内はYTD合計の降順）
  const allCats = Array.from(catMonthMap.keys());
  const fixedCats = allCats.filter(c => catIsFixed.get(c) === 1).sort((a, b) => catYtd(b) - catYtd(a));
  const variableCats = allCats.filter(c => catIsFixed.get(c) !== 1).sort((a, b) => catYtd(b) - catYtd(a));

  // 月次の集計値
  const revenueOf = (ym: string) => Number(snapByMonth.get(ym)?.total_revenue || 0);
  const fixedTotalOf = (ym: string) => fixedCats.reduce((s, c) => s + catAmount(c, ym), 0);
  const variableTotalOf = (ym: string) => variableCats.reduce((s, c) => s + catAmount(c, ym), 0);
  const expenseTotalOf = (ym: string) => fixedTotalOf(ym) + variableTotalOf(ym); // = total_expense + 補正
  const netOf = (ym: string) => Number(snapByMonth.get(ym)?.net_income || 0) - (correctionByMonth.get(ym) || 0);

  // YTD（補正後・テーブルと整合）
  const ytdRevenue = months.reduce((s, m) => s + revenueOf(m), 0);
  const ytdExpense = months.reduce((s, m) => s + expenseTotalOf(m), 0);
  const ytdNet = months.reduce((s, m) => s + netOf(m), 0);
  const ytdMonthCount = months.length;

  // 法定福利費は補正注記（※）を付ける
  const shahoNote = (cat: string) => correctionApplies && cat === SHAHO_ACCRUAL_CATEGORY;

  // Desktop: 1行レンダリングヘルパー用の行データ
  type Row = {
    key: string;
    label: string;
    indent?: boolean;
    valueOf: (ym: string) => number;
    total: number;
    kind: "revenue" | "groupSubtotal" | "category" | "expenseTotal" | "net";
    note?: boolean;
  };

  const rows: Row[] = [];
  rows.push({ key: "revenue", label: "売上", valueOf: revenueOf, total: ytdRevenue, kind: "revenue" });
  rows.push({ key: "fixed-subtotal", label: "〈固定費〉", valueOf: fixedTotalOf, total: months.reduce((s, m) => s + fixedTotalOf(m), 0), kind: "groupSubtotal" });
  for (const c of fixedCats) {
    rows.push({ key: `fx-${c}`, label: c, indent: true, valueOf: (ym) => catAmount(c, ym), total: catYtd(c), kind: "category", note: shahoNote(c) });
  }
  rows.push({ key: "variable-subtotal", label: "〈変動費〉", valueOf: variableTotalOf, total: months.reduce((s, m) => s + variableTotalOf(m), 0), kind: "groupSubtotal" });
  for (const c of variableCats) {
    rows.push({ key: `vr-${c}`, label: c, indent: true, valueOf: (ym) => catAmount(c, ym), total: catYtd(c), kind: "category" });
  }
  rows.push({ key: "expense-total", label: "費用合計", valueOf: expenseTotalOf, total: ytdExpense, kind: "expenseTotal" });
  rows.push({ key: "net", label: "営業損益", valueOf: netOf, total: ytdNet, kind: "net" });

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">月次 P/L</h1>
        <p className="text-sm text-slate-500 mt-0.5">費目別の損益計算書（発生主義）</p>
      </div>

      {/* YTD Summary Card */}
      <div className="card p-4 md:p-6 gradient-cash">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">年度累計（{ytdMonthCount}ヶ月）</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">売上合計</p>
            <p className="text-xl font-bold text-emerald-600">{yen(ytdRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">費用合計</p>
            <p className="text-xl font-bold text-red-500">{yen(ytdExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">損益</p>
            <p className={`text-xl font-bold ${ytdNet >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {yen(ytdNet)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">月平均売上</p>
            <p className="text-xl font-bold text-slate-900">{yen(Math.round(ytdRevenue / ytdMonthCount))}</p>
          </div>
        </div>
      </div>

      {/* Cross-tab P/L Table */}
      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-600">費目別 月次損益</h2>
          {correctionApplies && (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
              社保 発生主義補正 適用中
            </span>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-slate-500 font-medium sticky left-0 bg-white z-10 min-w-[140px]">科目</th>
                {months.map(m => (
                  <th key={m} className="text-right py-2 text-slate-500 font-medium min-w-[100px]">{fmtMonth(m)}</th>
                ))}
                <th className="text-right py-2 text-slate-700 font-semibold min-w-[110px] border-l border-slate-200">合計</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isNet = r.kind === "net";
                const isExpenseTotal = r.kind === "expenseTotal";
                const isSubtotal = r.kind === "groupSubtotal";
                const isRevenue = r.kind === "revenue";

                const rowCls = isNet
                  ? "border-t-2 border-slate-300"
                  : isExpenseTotal
                    ? "border-t border-slate-200 border-b-2 border-slate-200"
                    : "border-b border-slate-100";

                const labelCls = isRevenue
                  ? "text-emerald-600 font-medium"
                  : isExpenseTotal
                    ? "text-red-500 font-semibold"
                    : isNet
                      ? "font-bold text-slate-800"
                      : isSubtotal
                        ? "font-semibold text-slate-700"
                        : `text-slate-600 ${r.indent ? "pl-5" : ""}`;

                const valueColor = (val: number) =>
                  isNet
                    ? (val >= 0 ? "text-emerald-600" : "text-red-500")
                    : isRevenue
                      ? "text-emerald-600"
                      : isExpenseTotal
                        ? "text-red-500"
                        : isSubtotal
                          ? "text-slate-700 font-medium"
                          : "text-slate-600";

                const cellWeight = isSubtotal || isExpenseTotal || isNet || isRevenue ? "font-medium" : "";

                return (
                  <tr key={r.key} className={`${rowCls} ${isSubtotal ? "bg-slate-50/60" : ""}`}>
                    <td className={`py-2.5 sticky left-0 z-10 ${isSubtotal ? "bg-slate-50/60" : "bg-white"} ${labelCls}`}>
                      {r.label}{r.note && <sup className="text-amber-600 ml-0.5">※</sup>}
                    </td>
                    {months.map(m => {
                      const val = r.valueOf(m);
                      return (
                        <td key={m} className={`py-2.5 text-right ${valueColor(val)} ${cellWeight}`}>{yen(val)}</td>
                      );
                    })}
                    <td className={`py-2.5 text-right border-l border-slate-200 font-${isSubtotal || isRevenue || isExpenseTotal || isNet ? "bold" : "medium"} ${
                      isNet ? (r.total >= 0 ? "text-emerald-600" : "text-red-500") : valueColor(r.total)
                    }`}>
                      {yen(r.total)}
                    </td>
                  </tr>
                );
              })}

              {/* Budget vs actual rows（損益は補正後で比較） */}
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
                      if (!b) return <td key={m} className="py-2 text-right text-xs text-slate-300">—</td>;
                      const actualNet = netOf(m);
                      const budgetNet = Number(b.revenue_budget) - Number(b.expense_budget);
                      const diff = actualNet - budgetNet;
                      return <td key={m} className={`py-2 text-right text-xs font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>{diff >= 0 ? "+" : ""}{yen(diff)}</td>;
                    })}
                    <td className="py-2 text-right text-xs border-l border-slate-200">
                      {(() => {
                        const totalBudget = budgets.reduce((s, b) => s + Number(b.revenue_budget) - Number(b.expense_budget), 0);
                        const diff = ytdNet - totalBudget;
                        return <span className={`font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>{diff >= 0 ? "+" : ""}{yen(diff)}</span>;
                      })()}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div className="mt-3 space-y-1">
            {correctionApplies && (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <span className="text-amber-600">※</span> 法定福利費は社保の発生主義補正（月額{yen(shahoConfig.monthlyAmount)}・{shahoConfig.startMonth.replace("-", "年") + "月"}以降）を反映。
                freee本体・税務・資金繰り表（現金主義・引落月）は変更していません。
              </p>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              営業損益はfreee当期純利益ベース（雑収入・支払利息等の営業外損益を含むため、「売上−費用合計」と一致しない月があります）。
            </p>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {[...months].reverse().map((m) => {
            const snap = snapByMonth.get(m);
            if (!snap) return null;
            const net = netOf(m);
            return (
              <div key={m} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800">{String(m).replace("-0", "-").replace("-", "年") + "月"}</span>
                  <span className={`text-sm font-bold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {yen(net)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">売上</span>
                    <span className="text-emerald-600 font-medium">{yen(revenueOf(m))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">費用</span>
                    <span className="text-red-500 font-medium">{yen(expenseTotalOf(m))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">固定費</span>
                    <span className="text-slate-700">{yen(fixedTotalOf(m))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">変動費</span>
                    <span className="text-slate-700">{yen(variableTotalOf(m))}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {correctionApplies && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              費用は社保の発生主義補正（法定福利費 月額{yen(shahoConfig.monthlyAmount)}・{shahoConfig.startMonth.replace("-", "年") + "月"}以降）を反映しています。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
