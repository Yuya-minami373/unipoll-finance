import { yen } from "@/lib/format";
import { getServicePLAllMonths } from "@/lib/finance";
import ServicePLCombo from "@/components/charts/ServicePLCombo";

export const dynamic = "force-dynamic";

export default function ServicePLPage() {
  const allMonthsPL = getServicePLAllMonths();

  // Build cross-tab: rows = services, columns = months
  const months = [...new Set(allMonthsPL.map(r => r.year_month))].sort();
  const services = [...new Set(allMonthsPL.map(r => r.service_name))];
  const serviceRevMap = new Map<string, number>();
  for (const r of allMonthsPL) {
    serviceRevMap.set(r.service_name, (serviceRevMap.get(r.service_name) || 0) + r.revenue);
  }
  services.sort((a, b) => (serviceRevMap.get(b) || 0) - (serviceRevMap.get(a) || 0));

  // Lookup map
  const lookup = new Map<string, { revenue: number; cost: number; gross_profit: number }>();
  for (const r of allMonthsPL) {
    lookup.set(`${r.service_name}|${r.year_month}`, r);
  }

  // Totals
  const monthTotals = months.map(m => {
    let rev = 0, cost = 0, gp = 0;
    for (const s of services) {
      const d = lookup.get(`${s}|${m}`);
      if (d) { rev += d.revenue; cost += d.cost; gp += d.gross_profit; }
    }
    return { revenue: rev, cost, gross_profit: gp };
  });

  const serviceTotals = services.map(s => {
    let rev = 0, cost = 0, gp = 0;
    for (const m of months) {
      const d = lookup.get(`${s}|${m}`);
      if (d) { rev += d.revenue; cost += d.cost; gp += d.gross_profit; }
    }
    return { revenue: rev, cost, gross_profit: gp };
  });

  const grandTotal = monthTotals.reduce(
    (acc, t) => ({ revenue: acc.revenue + t.revenue, cost: acc.cost + t.cost, gross_profit: acc.gross_profit + t.gross_profit }),
    { revenue: 0, cost: 0, gross_profit: 0 }
  );

  const fmtMonth = (ym: string) => ym.replace(/^\d{4}-/, "").replace(/^0/, "") + "月";

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">サービス別 P/L</h1>
        <p className="text-sm text-slate-500 mt-0.5">サービスラインごとの売上・粗利</p>
      </div>

      {/* Combined chart: stacked revenue bars + gross margin line */}
      <div className="card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">月次売上（積み上げ）＆ 粗利率推移</h2>
        <ServicePLCombo data={allMonthsPL} />
      </div>

      {/* Unified cross-tab table */}
      <div className="card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">サービス別 月次サマリー</h2>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-slate-500 font-medium sticky left-0 bg-white z-10 min-w-[140px]">サービス</th>
                {months.map(m => (
                  <th key={m} className="text-right py-2 text-slate-500 font-medium min-w-[100px]">{fmtMonth(m)}</th>
                ))}
                <th className="text-right py-2 text-slate-700 font-semibold min-w-[100px] border-l border-slate-200">売上計</th>
                <th className="text-right py-2 text-slate-700 font-semibold min-w-[100px]">粗利計</th>
                <th className="text-right py-2 text-slate-700 font-semibold min-w-[55px]">粗利率</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, si) => {
                const st = serviceTotals[si];
                const margin = st.revenue > 0 ? Math.round((st.gross_profit / st.revenue) * 100) : 0;
                return (
                  <tr key={s} className="border-b border-slate-100">
                    <td className="py-2.5 font-medium text-slate-800 sticky left-0 bg-white z-10">{s}</td>
                    {months.map(m => {
                      const d = lookup.get(`${s}|${m}`);
                      const rev = d?.revenue || 0;
                      return (
                        <td key={m} className={`py-2.5 text-right ${rev > 0 ? "text-slate-700" : "text-slate-300"}`}>
                          {yen(rev)}
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-right font-medium text-slate-900 border-l border-slate-200">{yen(st.revenue)}</td>
                    <td className={`py-2.5 text-right font-medium ${st.gross_profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{yen(st.gross_profit)}</td>
                    <td className="py-2.5 text-right text-slate-500">{margin > 0 ? `${margin}%` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td className="py-2.5 font-bold text-slate-900 sticky left-0 bg-white z-10">合計</td>
                {monthTotals.map((t, i) => (
                  <td key={months[i]} className="py-2.5 text-right font-bold text-slate-900">{yen(t.revenue)}</td>
                ))}
                <td className="py-2.5 text-right font-bold text-slate-900 border-l border-slate-200">{yen(grandTotal.revenue)}</td>
                <td className="py-2.5 text-right font-bold text-emerald-600">{yen(grandTotal.gross_profit)}</td>
                <td className="py-2.5 text-right font-bold text-slate-500">
                  {grandTotal.revenue > 0 ? `${Math.round((grandTotal.gross_profit / grandTotal.revenue) * 100)}%` : "-"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {services.map((s, si) => {
            const st = serviceTotals[si];
            const margin = st.revenue > 0 ? Math.round((st.gross_profit / st.revenue) * 100) : 0;
            return (
              <div key={s} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-800 text-sm">{s}</span>
                  <span className="text-xs text-slate-500">{margin > 0 ? `粗利率 ${margin}%` : "-"}</span>
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-500">売上計 <strong className="text-slate-900">{yen(st.revenue)}</strong></span>
                  <span className="text-slate-500">粗利計 <strong className={st.gross_profit >= 0 ? "text-emerald-600" : "text-red-500"}>{yen(st.gross_profit)}</strong></span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {months.map(m => {
                    const d = lookup.get(`${s}|${m}`);
                    return (
                      <div key={m}>
                        <span className="text-slate-400">{fmtMonth(m)}</span>
                        <p className="font-medium text-slate-700">{yen(d?.revenue || 0)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
