import { yen } from "@/lib/format";
import { getLastSync, getRecurringItems, getMonthlyFixedCostEstimate } from "@/lib/finance";
import { dbAll } from "@/lib/db";
import FixedCostForm from "@/components/FixedCostForm";
import RecurringItemsManager from "@/components/RecurringItemsManager";
import BudgetManager from "@/components/BudgetManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [lastSync, recurring, fixedCostEstimate, syncLogs] = await Promise.all([
    getLastSync(),
    getRecurringItems(),
    getMonthlyFixedCostEstimate(),
    dbAll("SELECT * FROM sync_log ORDER BY id DESC LIMIT 10") as Promise<Array<{
      id: number; synced_at: string; source: string; status: string; details: string | null;
    }>>,
  ]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">設定</h1>
        <p className="text-sm text-slate-500 mt-0.5">データ同期・固定費設定</p>
      </div>

      {/* Monthly fixed cost estimate */}
      <div className="card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-2">月次固定費（見込み）</h2>
        <p className="text-xs text-slate-400 mb-4">
          ランウェイ・損益分岐点の計算に使用する「これから発生する月次固定費」を設定します。<br />
          過去の実績ではなく、将来の見込み額を入力してください。
        </p>
        <FixedCostForm initialValue={fixedCostEstimate} />
      </div>

      {/* Sync status */}
      <div className="card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">データ同期</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm text-slate-700">最終同期: {lastSync || "未同期"}</span>
        </div>
        <p className="text-xs text-slate-400">
          同期はケイ（経理エージェント）経由で実行されます。<br />
          「freeeのデータを同期して」と指示してください。
        </p>

        <h3 className="text-xs font-medium text-slate-500 mt-6 mb-2">同期ログ</h3>
        <div className="space-y-1">
          {syncLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-xs text-slate-500">
              <span className={String(log.status) === "success" ? "text-emerald-500" : "text-red-500"}>●</span>
              <span>{String(log.synced_at)}</span>
              <span className="text-slate-400">{String(log.source)}</span>
              {log.details && <span className="text-slate-400 truncate max-w-[300px]">{String(log.details)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Budget management */}
      <div className="card p-4 md:p-6">
        <BudgetManager />
      </div>

      {/* Recurring items — with CRUD */}
      <div className="card p-4 md:p-6">
        <RecurringItemsManager items={recurring} />
      </div>
    </div>
  );
}
