import { getLTVSummary } from "@/lib/finance";
import { yen } from "@/lib/format";
import KPICard from "@/components/KPICard";
import LTVDonut from "@/components/charts/LTVDonut";
import UniGuideSimulator from "@/components/UniGuideSimulator";
import LTVTable from "./LTVTable";

export const dynamic = "force-dynamic";

export default async function LTVPage() {
  const summary = await getLTVSummary();

  const donutData = summary.customers
    .filter((c) => c.ltv_3y > 0)
    .map((c) => ({
      name: `${c.customer_name} (${c.service_name})`,
      value: c.ltv_3y,
    }));

  const gpLTV3y = summary.customers
    .filter((c) => c.customer_name === "Green Plus")
    .reduce((s, c) => s + Number(c.ltv_3y), 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">顧客LTV</h1>
        <p className="text-sm text-slate-500 mt-0.5">顧客別のライフタイムバリューと集中リスク</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPICard
          title="月額定期収入（MRR）"
          value={yen(summary.totalMRR)}
          subtitle="active contracts"
          gradient="gradient-revenue"
        />
        <KPICard
          title="3年LTV合計"
          value={yen(summary.totalLTV3y)}
          subtitle={`5年: ${yen(summary.totalLTV5y)}`}
          gradient="gradient-cash"
        />
        <KPICard
          title="GP集中度"
          value={`${summary.gpConcentration}%`}
          subtitle={summary.gpConcentration > 70 ? "⚠️ 要分散" : ""}
          gradient={summary.gpConcentration > 70 ? "gradient-burn" : "gradient-runway"}
        />
        <KPICard
          title="顧客数"
          value={`${summary.customers.length}`}
          subtitle="active"
          gradient="gradient-cash"
        />
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">LTV集中度（3年）</h2>
          {donutData.length > 0 ? (
            <>
              <LTVDonut data={donutData} />
              <div className="mt-3 space-y-1">
                {donutData.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-600">{d.name}</span>
                    <span className="font-medium text-slate-800">{yen(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">LTVデータがありません</p>
          )}
        </div>

        <div className="card p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">顧客一覧</h2>
          <LTVTable customers={summary.customers} />
        </div>
      </div>

      {/* UniGuide Simulator */}
      <UniGuideSimulator
        currentLTV3y={summary.totalLTV3y}
        currentGPLTV3y={gpLTV3y}
      />
    </div>
  );
}
