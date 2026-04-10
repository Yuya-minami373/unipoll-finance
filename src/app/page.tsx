import { yen, pctChange, toJST } from "@/lib/format";
import KPICard from "@/components/KPICard";
import AlertBanner from "@/components/AlertBanner";
import RunwayGauge from "@/components/charts/RunwayGauge";
import ServicePLChart from "@/components/charts/ServicePLChart";
import CashForecast, { CashForecastScenario } from "@/components/charts/CashForecast";
import LTVDonut from "@/components/charts/LTVDonut";
import { getDashboardData, getLTVSummary } from "@/lib/finance";
import BSCard from "@/components/BSCard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [dashData, ltvSummary] = await Promise.all([
    getDashboardData(),
    getLTVSummary(),
  ]);
  const {
    snapshot, snapshots, servicePL, lastSync, ytd, expenseTrend,
    bsSnapshot, runway, effRunway, fixedCostEstimate,
    fundingDanger, cashForecast, cashForecastScenarios, latestExpenses,
  } = dashData;

  const ltvDonutData = ltvSummary.customers
    .filter((c) => c.ltv_3y > 0)
    .map((c) => ({ name: `${c.customer_name} (${c.service_name})`, value: c.ltv_3y }));

  if (!snapshot) {
    return <p className="text-slate-500 mt-8">データがありません。freeeから同期してください。</p>;
  }

  const fixedTotal = latestExpenses.filter(e => e.is_fixed).reduce((s, e) => s + Number(e.amount), 0);
  const variableTotal = latestExpenses.filter(e => !e.is_fixed).reduce((s, e) => s + Number(e.amount), 0);

  // Monthly revenue trend
  const totalRevenue = snapshots.reduce((s, snap) => s + Number(snap.total_revenue), 0);
  const avgRevenue = Math.round(totalRevenue / snapshots.length);

  // Expense month-over-month change
  const expensePctChange = expenseTrend.length >= 2
    ? pctChange(Number(expenseTrend[expenseTrend.length - 1].total), Number(expenseTrend[expenseTrend.length - 2].total))
    : null;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Alerts */}
      <AlertBanner
        runwayMonths={runway.months}
        expensePctChange={expensePctChange}
        netIncome={Number(snapshot.net_income)}
        fundingDangerMonths={fundingDanger}
      />

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {(() => {
              const ym = String(bsSnapshot?.year_month || snapshot.year_month);
              const [y, m] = ym.split("-");
              return `${y}年${parseInt(m)}月末時点`;
            })()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">最終同期</p>
          <p className="text-xs text-slate-500">{toJST(lastSync)}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPICard
          title="現預金残高"
          value={yen(runway.cashTotal)}
          subtitle={`現金 ${yen(Number(snapshot.cash_balance))} + 銀行 ${yen(Number(snapshot.bank_balance))}`}
          gradient="gradient-cash"
        />
        <KPICard
          title="月間売上（平均）"
          value={yen(avgRevenue)}
          subtitle={`累計 ${yen(totalRevenue)}（${snapshots.length}ヶ月）`}
          gradient="gradient-revenue"
        />
        <KPICard
          title="月間固定費（見込み）"
          value={yen(fixedCostEstimate)}
          subtitle={`実績 ${yen(fixedTotal)} / 変動費 ${yen(variableTotal)}`}
          gradient="gradient-burn"
        />
        <KPICard
          title="売掛金"
          value={yen(Number(snapshot.accounts_receivable))}
          subtitle="入金予定額"
          gradient="gradient-cash"
        />
      </div>

      {/* YTD Summary + Runway — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="card p-4 md:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-600">年度累計（YTD: {ytd.months}ヶ月）</h2>
            <a href="/monthly-pl" className="text-xs text-blue-500 hover:underline">月次P/L →</a>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">売上合計</p>
              <p className="text-lg md:text-xl font-bold text-emerald-600">{yen(ytd.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">費用合計</p>
              <p className="text-lg md:text-xl font-bold text-red-500">{yen(ytd.expense)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">損益</p>
              <p className={`text-lg md:text-xl font-bold ${ytd.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {yen(ytd.netIncome)}
              </p>
            </div>
          </div>
          {/* Quick links */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-4">
            <a href="/funding" className="text-xs text-blue-500 hover:underline">資金繰り表 →</a>
          </div>
        </div>

        <div className="card p-4 md:p-6 gradient-runway">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">ランウェイ</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center">
              <p className="text-[10px] text-slate-400">簡易</p>
              <RunwayGauge months={runway.months} />
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400">実効（売掛+返済込）</p>
              <RunwayGauge months={effRunway.months} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-200/50 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>現預金</span>
              <span className="font-medium">{yen(runway.cashTotal)}</span>
            </div>
            {effRunway.pendingReceivables > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>+ 入金予定（3ヶ月以内）</span>
                <span className="font-medium text-emerald-600">{yen(effRunway.pendingReceivables)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-500">
              <span>月間固定費</span>
              <span className="font-medium">{yen(runway.monthlyBurn)}</span>
            </div>
            {effRunway.monthlyLoanRepayment > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>+ 月間返済額</span>
                <span className="font-medium text-red-400">{yen(effRunway.monthlyLoanRepayment)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BS Overview */}
      {bsSnapshot && <BSCard bs={bsSnapshot} />}

      {/* Cash Flow Forecast */}
      {cashForecast.length > 0 && (
        <div className="card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-600">現預金残高予測</h2>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />実績</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />予測</span>
            </div>
          </div>
          <CashForecast data={cashForecast} dangerLine={fixedCostEstimate * 2} />
        </div>
      )}

      {/* Scenario Cash Flow Forecast */}
      {cashForecastScenarios.base.length > 0 && (
        <div className="card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-600">CF予測（シナリオ別）</h2>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Base</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Upside</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Downside</span>
            </div>
          </div>
          <CashForecastScenario scenarios={cashForecastScenarios} dangerLine={fixedCostEstimate * 2} />
        </div>
      )}

      {/* Service P/L + LTV side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-600">サービス別売上（累計）</h2>
            <a href="/service-pl" className="text-xs text-blue-500 hover:underline">詳細 →</a>
          </div>
          <ServicePLChart data={servicePL} />
        </div>

        <div className="card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-600">LTV集中度（3年）</h2>
            <a href="/ltv" className="text-xs text-blue-500 hover:underline">詳細 →</a>
          </div>
          {ltvDonutData.length > 0 ? (
            <>
              <LTVDonut data={ltvDonutData} />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">GP集中度</span>
                <span className={`font-bold ${ltvSummary.gpConcentration > 70 ? "text-red-500" : "text-emerald-600"}`}>
                  {ltvSummary.gpConcentration}%
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">LTVデータなし</p>
          )}
        </div>
      </div>
    </div>
  );
}
