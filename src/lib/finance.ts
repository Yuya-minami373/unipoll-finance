import { dbAll, dbGet, dbRun } from "./db";

export interface MonthlySnapshot {
  year_month: string;
  cash_balance: number;
  bank_balance: number;
  accounts_receivable: number;
  total_revenue: number;
  total_expense: number;
  net_income: number;
}

export interface ServicePL {
  service_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
}

export interface ExpenseItem {
  category: string;
  sub_category: string;
  amount: number;
  is_fixed: number;
}

export interface RecurringItem {
  id: number;
  name: string;
  type: "income" | "expense";
  amount: number;
  day_of_month: number;
  is_active: number;
  notes: string | null;
}

// Get latest snapshot
export async function getLatestSnapshot(): Promise<MonthlySnapshot | null> {
  return await dbGet("SELECT * FROM monthly_snapshots ORDER BY year_month DESC LIMIT 1") as MonthlySnapshot | null;
}

// Get all snapshots
export async function getAllSnapshots(): Promise<MonthlySnapshot[]> {
  return await dbAll("SELECT * FROM monthly_snapshots ORDER BY year_month ASC") as unknown as MonthlySnapshot[];
}

// Get service P/L for a given month
export async function getServicePL(yearMonth: string): Promise<ServicePL[]> {
  return await dbAll("SELECT service_name, revenue, cost, gross_profit FROM service_pl WHERE year_month = ? ORDER BY revenue DESC", yearMonth) as unknown as ServicePL[];
}

// Get service P/L aggregated across all months
export async function getServicePLTotal(): Promise<ServicePL[]> {
  return await dbAll(`
    SELECT service_name, SUM(revenue) as revenue, SUM(cost) as cost, SUM(gross_profit) as gross_profit
    FROM service_pl GROUP BY service_name ORDER BY revenue DESC
  `) as unknown as ServicePL[];
}

// Get expense breakdown (with sub_category for detailed views)
export async function getExpenseBreakdown(yearMonth: string): Promise<ExpenseItem[]> {
  return await dbAll("SELECT category, sub_category, amount, is_fixed FROM expense_breakdown WHERE year_month = ? ORDER BY is_fixed DESC, amount DESC", yearMonth) as unknown as ExpenseItem[];
}

// Get monthly fixed costs
export async function getMonthlyFixedCosts(): Promise<number> {
  const latest = await dbGet("SELECT year_month FROM monthly_snapshots ORDER BY year_month DESC LIMIT 1") as { year_month: string } | null;
  if (!latest) return 0;
  const result = await dbGet("SELECT SUM(amount) as total FROM expense_breakdown WHERE year_month = ? AND is_fixed = 1", latest.year_month) as { total: number | null };
  return result?.total || 0;
}

// Get recurring items
export async function getRecurringItems(): Promise<RecurringItem[]> {
  return await dbAll("SELECT * FROM recurring_items WHERE is_active = 1 ORDER BY type, name") as unknown as RecurringItem[];
}

// Calculate runway
export async function getRunway(): Promise<{ months: number; cashTotal: number; monthlyBurn: number }> {
  const snapshot = await getLatestSnapshot();
  if (!snapshot) return { months: 0, cashTotal: 0, monthlyBurn: 0 };

  const cashTotal = snapshot.cash_balance + snapshot.bank_balance;
  const monthlyBurn = await getMonthlyFixedCosts();
  const months = monthlyBurn > 0 ? cashTotal / monthlyBurn : 99;

  return { months: Math.round(months * 10) / 10, cashTotal, monthlyBurn };
}

// Get app setting
export async function getSetting(key: string): Promise<string | null> {
  const row = await dbGet("SELECT value FROM app_settings WHERE key = ?", key) as { value: string } | null;
  return row?.value || null;
}

// Update app setting
export async function setSetting(key: string, value: string): Promise<void> {
  await dbRun("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now', 'localtime')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", key, value);
}

// Get monthly fixed cost estimate (from settings)
export async function getMonthlyFixedCostEstimate(): Promise<number> {
  const val = await getSetting("monthly_fixed_cost_estimate");
  return val ? parseInt(val, 10) : 542000;
}

// Calculate runway using estimate (not historical)
export async function getRunwayWithEstimate(): Promise<{ months: number; cashTotal: number; monthlyBurn: number }> {
  const [snapshot, monthlyBurn] = await Promise.all([
    getLatestSnapshot(),
    getMonthlyFixedCostEstimate(),
  ]);
  if (!snapshot) return { months: 0, cashTotal: 0, monthlyBurn: 0 };

  const cashTotal = snapshot.cash_balance + snapshot.bank_balance;
  const months = monthlyBurn > 0 ? cashTotal / monthlyBurn : 99;

  return { months: Math.round(months * 10) / 10, cashTotal, monthlyBurn };
}

// Effective runway: factors in pending receivables and loan repayment
export async function getEffectiveRunway(): Promise<{
  months: number;
  cashTotal: number;
  monthlyBurn: number;
  pendingReceivables: number;
  monthlyLoanRepayment: number;
  effectiveCash: number;
  effectiveBurn: number;
}> {
  // Pending receivables cutoff
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const cutoff = threeMonthsLater.toISOString().split("T")[0];

  // Run all 4 queries in parallel
  const [snapshot, monthlyBurn, pendingRow, loanRow] = await Promise.all([
    getLatestSnapshot(),
    getMonthlyFixedCostEstimate(),
    dbGet(
      "SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'pending' AND due_date <= ?", cutoff
    ) as unknown as Promise<{ total: number }>,
    dbGet(
      "SELECT AVG(amount) as avg_amount FROM funding_items WHERE section = 'financing_expense'"
    ) as unknown as Promise<{ avg_amount: number | null }>,
  ]);

  if (!snapshot) return { months: 0, cashTotal: 0, monthlyBurn: 0, pendingReceivables: 0, monthlyLoanRepayment: 0, effectiveCash: 0, effectiveBurn: 0 };

  const cashTotal = snapshot.cash_balance + snapshot.bank_balance;
  const pendingReceivables = Number(pendingRow?.total || 0);
  const monthlyLoanRepayment = Math.round(Number(loanRow?.avg_amount || 0));

  const effectiveCash = cashTotal + pendingReceivables;
  const effectiveBurn = monthlyBurn + monthlyLoanRepayment;
  const months = effectiveBurn > 0 ? effectiveCash / effectiveBurn : 99;

  return {
    months: Math.round(months * 10) / 10,
    cashTotal,
    monthlyBurn,
    pendingReceivables,
    monthlyLoanRepayment,
    effectiveCash,
    effectiveBurn,
  };
}

// Get service P/L for all months (for gross margin trend)
export async function getServicePLAllMonths(): Promise<Array<{ year_month: string; service_name: string; revenue: number; cost: number; gross_profit: number }>> {
  return await dbAll("SELECT year_month, service_name, revenue, cost, gross_profit FROM service_pl ORDER BY year_month ASC, service_name ASC") as unknown as Array<{ year_month: string; service_name: string; revenue: number; cost: number; gross_profit: number }>;
}

// Project profitability
export interface ProjectProfit {
  id: number;
  year_month: string;
  municipality: string;
  service_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  notes: string | null;
}

export async function getProjectProfitability(): Promise<ProjectProfit[]> {
  return await dbAll("SELECT * FROM project_profitability ORDER BY year_month DESC, municipality ASC") as unknown as ProjectProfit[];
}

export async function getProjectProfitabilitySummary(): Promise<Array<{ municipality: string; service_name: string; total_revenue: number; total_cost: number; total_gross_profit: number }>> {
  return await dbAll(`
    SELECT municipality, service_name, SUM(revenue) as total_revenue, SUM(cost) as total_cost, SUM(gross_profit) as total_gross_profit
    FROM project_profitability GROUP BY municipality, service_name ORDER BY total_revenue DESC
  `) as unknown as Array<{ municipality: string; service_name: string; total_revenue: number; total_cost: number; total_gross_profit: number }>;
}

// Get last sync time
export async function getLastSync(): Promise<string | null> {
  const row = await dbGet("SELECT synced_at FROM sync_log ORDER BY id DESC LIMIT 1") as { synced_at: string } | null;
  return row?.synced_at || null;
}

// Get expense totals per month (for trend comparison)
export async function getExpenseTotalsByMonth(): Promise<Array<{ year_month: string; fixed: number; variable: number; total: number }>> {
  return await dbAll(`
    SELECT year_month,
      SUM(CASE WHEN is_fixed = 1 THEN amount ELSE 0 END) as fixed,
      SUM(CASE WHEN is_fixed = 0 THEN amount ELSE 0 END) as variable,
      SUM(amount) as total
    FROM expense_breakdown
    GROUP BY year_month ORDER BY year_month ASC
  `) as unknown as Array<{ year_month: string; fixed: number; variable: number; total: number }>;
}

// Get YTD summary — uses a single aggregate query instead of fetching all snapshots
export async function getYTDSummary(): Promise<{ revenue: number; expense: number; netIncome: number; months: number }> {
  const row = await dbGet(`
    SELECT COALESCE(SUM(total_revenue), 0) as revenue,
           COALESCE(SUM(total_expense), 0) as expense,
           COUNT(*) as months
    FROM monthly_snapshots
  `) as unknown as { revenue: number; expense: number; months: number } | null;
  if (!row || row.months === 0) return { revenue: 0, expense: 0, netIncome: 0, months: 0 };
  return {
    revenue: Number(row.revenue),
    expense: Number(row.expense),
    netIncome: Number(row.revenue) - Number(row.expense),
    months: Number(row.months),
  };
}

// CRUD for recurring items
export async function addRecurringItem(name: string, type: "income" | "expense", amount: number, dayOfMonth: number, notes: string | null): Promise<void> {
  await dbRun("INSERT INTO recurring_items (name, type, amount, day_of_month, notes) VALUES (?, ?, ?, ?, ?)", name, type, amount, dayOfMonth, notes);
}

export async function updateRecurringItem(id: number, name: string, type: "income" | "expense", amount: number, dayOfMonth: number, notes: string | null): Promise<void> {
  await dbRun("UPDATE recurring_items SET name = ?, type = ?, amount = ?, day_of_month = ?, notes = ?, is_active = 1 WHERE id = ?", name, type, amount, dayOfMonth, notes, id);
}

export async function deleteRecurringItem(id: number): Promise<void> {
  await dbRun("DELETE FROM recurring_items WHERE id = ?", id);
}

// ============ Receivables (入金予定) ============

export interface Receivable {
  id: number;
  due_date: string;
  source: string;
  service_name: string | null;
  amount: number;
  status: "pending" | "received" | "overdue";
  received_date: string | null;
  notes: string | null;
  created_at: string;
}

export async function getReceivables(): Promise<Receivable[]> {
  return await dbAll("SELECT * FROM receivables ORDER BY due_date ASC") as unknown as Receivable[];
}

export async function getReceivablesByStatus(status: string): Promise<Receivable[]> {
  return await dbAll("SELECT * FROM receivables WHERE status = ? ORDER BY due_date ASC", status) as unknown as Receivable[];
}

export async function addReceivable(data: { due_date: string; source: string; service_name?: string; amount: number; notes?: string }): Promise<void> {
  await dbRun("INSERT INTO receivables (due_date, source, service_name, amount, notes) VALUES (?, ?, ?, ?, ?)",
    data.due_date, data.source, data.service_name || null, data.amount, data.notes || null
  );
}

export async function updateReceivableStatus(id: number, status: string, receivedDate?: string): Promise<void> {
  if (status === "received") {
    await dbRun("UPDATE receivables SET status = ?, received_date = ? WHERE id = ?", status, receivedDate || new Date().toISOString().split("T")[0], id);
  } else {
    await dbRun("UPDATE receivables SET status = ?, received_date = NULL WHERE id = ?", status, id);
  }
}

export async function deleteReceivable(id: number): Promise<void> {
  await dbRun("DELETE FROM receivables WHERE id = ?", id);
}

// Monthly receivables summary for funding table
export async function getReceivablesByMonth(): Promise<Array<{ month: string; pending: number; received: number }>> {
  return await dbAll(`
    SELECT substr(due_date, 1, 7) as month,
      SUM(CASE WHEN status = 'pending' OR status = 'overdue' THEN amount ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'received' THEN amount ELSE 0 END) as received
    FROM receivables GROUP BY month ORDER BY month ASC
  `) as unknown as Array<{ month: string; pending: number; received: number }>;
}

// Weekly funding forecast (資金繰り表)
export interface FundingWeek {
  weekStart: string;
  weekEnd: string;
  label: string;
  openBalance: number;
  inflows: number;
  outflows: number;
  closeBalance: number;
  isWarning: boolean;
  inflowDetails: Array<{ source: string; amount: number }>;
  outflowDetails: Array<{ name: string; amount: number }>;
}

export async function getWeeklyFunding(weeks: number = 8): Promise<FundingWeek[]> {
  const [snapshot, recurring, receivables, fixedCost] = await Promise.all([
    getLatestSnapshot(),
    getRecurringItems(),
    dbAll("SELECT * FROM receivables WHERE status = 'pending' ORDER BY due_date ASC") as unknown as Promise<Receivable[]>,
    getMonthlyFixedCostEstimate(),
  ]);
  if (!snapshot) return [];

  let balance = Number(snapshot.cash_balance) + Number(snapshot.bank_balance);
  const result: FundingWeek[] = [];

  // Start from the beginning of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const wsStr = weekStart.toISOString().split("T")[0];
    const weStr = weekEnd.toISOString().split("T")[0];

    // Inflows: receivables due this week
    const weekInflows: Array<{ source: string; amount: number }> = [];
    let totalInflow = 0;
    for (const r of receivables) {
      if (r.due_date >= wsStr && r.due_date <= weStr) {
        weekInflows.push({ source: `${r.source}${r.service_name ? ` (${r.service_name})` : ""}`, amount: Number(r.amount) });
        totalInflow += Number(r.amount);
      }
    }

    // Outflows: recurring expenses due this week (by day_of_month)
    const weekOutflows: Array<{ name: string; amount: number }> = [];
    let totalOutflow = 0;
    for (const r of recurring) {
      if (r.type !== "expense") continue;
      const daysInMonth = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0).getDate();
      const actualDay = Math.min(Number(r.day_of_month), daysInMonth);
      const expenseDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), actualDay);
      const edStr = expenseDate.toISOString().split("T")[0];

      if (edStr >= wsStr && edStr <= weStr) {
        weekOutflows.push({ name: String(r.name), amount: Number(r.amount) });
        totalOutflow += Number(r.amount);
      }

      // Also check if the week spans into next month
      if (weekEnd.getMonth() !== weekStart.getMonth()) {
        const nextMonthDays = new Date(weekEnd.getFullYear(), weekEnd.getMonth() + 1, 0).getDate();
        const nextActualDay = Math.min(Number(r.day_of_month), nextMonthDays);
        const nextExpenseDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), nextActualDay);
        const nedStr = nextExpenseDate.toISOString().split("T")[0];

        if (nedStr >= wsStr && nedStr <= weStr && nedStr !== edStr) {
          weekOutflows.push({ name: String(r.name), amount: Number(r.amount) });
          totalOutflow += Number(r.amount);
        }
      }
    }

    const openBalance = balance;
    balance = balance + totalInflow - totalOutflow;

    const m1 = weekStart.getMonth() + 1;
    const d1 = weekStart.getDate();
    const d2 = weekEnd.getDate();
    const label = weekEnd.getMonth() !== weekStart.getMonth()
      ? `${m1}/${d1}〜${weekEnd.getMonth() + 1}/${d2}`
      : `${m1}/${d1}〜${d2}`;

    result.push({
      weekStart: wsStr,
      weekEnd: weStr,
      label,
      openBalance,
      inflows: totalInflow,
      outflows: totalOutflow,
      closeBalance: balance,
      isWarning: balance < fixedCost,
      inflowDetails: weekInflows,
      outflowDetails: weekOutflows,
    });
  }

  return result;
}

// ============ Monthly Funding (資金繰り表) ============

export interface FundingItem {
  id: number;
  year_month: string;
  section: string;
  category: string;
  sub_category: string;
  amount: number;
  is_actual: number;
  planned_amount: number | null;
}

export interface FundingMonth {
  year_month: string;
  label: string;
  is_actual: boolean;
  opening_balance: number;
  operating_income: FundingItem[];
  operating_expense: FundingItem[];
  investing_income: FundingItem[];
  investing_expense: FundingItem[];
  financing_income: FundingItem[];
  financing_expense: FundingItem[];
  operating_income_total: number;
  operating_expense_total: number;
  operating_net: number;
  investing_net: number;
  financing_net: number;
  total_net: number;
  closing_balance: number;
  planned_income_total: number;
  planned_expense_total: number;
  planned_net: number;
}

// Section labels for display
export const SECTION_LABELS: Record<string, string> = {
  operating_income: "経常収入",
  operating_expense: "経常支出",
  investing_income: "投資収入",
  investing_expense: "投資支出",
  financing_income: "財務収入",
  financing_expense: "財務支出",
};

// Standard income categories (row order)
export const INCOME_CATEGORIES = [
  "入札支援サービス",
  "案件獲得パートナー報酬",
  "Opsデザイン",
  "UniPollクルー",
  "アウトリーチ",
  "コンシェルジュ",
  "研修サービス",
  "選管コンサル",
  "差異調整",
];

// Standard expense categories (row order)
export const EXPENSE_CATEGORIES = [
  "役員報酬",
  "給料賃金",
  "通勤手当",
  "賞与",
  "法定福利費",
  "広告宣伝費",
  "接待交際費",
  "旅費交通費",
  "通信費",
  "備品・消耗品費",
  "地代家賃",
  "支払手数料",
  "会議費",
  "福利厚生費",
  "租税公課",
  "支払報酬料",
];

export async function getFundingMonths(): Promise<FundingMonth[]> {
  // Fetch all items and balances in just 2 queries (instead of 2 per month)
  const [allItems, allBalances] = await Promise.all([
    dbAll("SELECT * FROM funding_items ORDER BY year_month ASC, section, category, id") as unknown as Promise<FundingItem[]>,
    dbAll("SELECT year_month, opening_balance FROM funding_balances") as unknown as Promise<Array<{ year_month: string; opening_balance: number }>>,
  ]);

  if (allItems.length === 0) return [];

  // Group items by year_month
  const itemsByMonth = new Map<string, FundingItem[]>();
  for (const item of allItems) {
    const ym = String(item.year_month);
    if (!itemsByMonth.has(ym)) itemsByMonth.set(ym, []);
    itemsByMonth.get(ym)!.push(item);
  }

  // Build balance lookup
  const balanceMap = new Map<string, number>();
  for (const b of allBalances) {
    balanceMap.set(String(b.year_month), Number(b.opening_balance));
  }

  const result: FundingMonth[] = [];

  for (const [year_month, items] of itemsByMonth) {
    const bySection = (section: string) => items.filter(i => i.section === section);
    const sectionTotal = (section: string) => bySection(section).reduce((s, i) => s + Number(i.amount), 0);

    const opIncome = sectionTotal("operating_income");
    const opExpense = sectionTotal("operating_expense");
    const invIncome = sectionTotal("investing_income");
    const invExpense = sectionTotal("investing_expense");
    const finIncome = sectionTotal("financing_income");
    const finExpense = sectionTotal("financing_expense");

    const opNet = opIncome - opExpense;
    const invNet = invIncome - invExpense;
    const finNet = finIncome - finExpense;
    const totalNet = opNet + invNet + finNet;

    const opening = balanceMap.get(year_month) ?? 0;
    const closing = opening + totalNet;

    const isActual = items.some(i => Number(i.is_actual) === 1);
    const [y, m] = year_month.split("-").map(Number);

    const plannedIncomeTotal = bySection("operating_income").reduce((s, i) => s + Number(i.planned_amount ?? i.amount), 0)
      + bySection("financing_income").reduce((s, i) => s + Number(i.planned_amount ?? i.amount), 0);
    const plannedExpenseTotal = bySection("operating_expense").reduce((s, i) => s + Number(i.planned_amount ?? i.amount), 0)
      + bySection("financing_expense").reduce((s, i) => s + Number(i.planned_amount ?? i.amount), 0);

    result.push({
      year_month,
      label: `${y}/${m}`,
      is_actual: isActual,
      opening_balance: opening,
      operating_income: bySection("operating_income"),
      operating_expense: bySection("operating_expense"),
      investing_income: bySection("investing_income"),
      investing_expense: bySection("investing_expense"),
      financing_income: bySection("financing_income"),
      financing_expense: bySection("financing_expense"),
      operating_income_total: opIncome,
      operating_expense_total: opExpense,
      operating_net: opNet,
      investing_net: invNet,
      financing_net: finNet,
      total_net: totalNet,
      closing_balance: closing,
      planned_income_total: plannedIncomeTotal,
      planned_expense_total: plannedExpenseTotal,
      planned_net: plannedIncomeTotal - plannedExpenseTotal,
    });
  }

  return result;
}

// ============ BS Snapshot ============

export interface BSSnapshot {
  year_month: string;
  total_assets: number;
  cash: number;
  receivables_total: number;
  payables: number;
  loan_balance: number;
  net_assets: number;
}

export async function getLatestBS(): Promise<BSSnapshot | null> {
  return await dbGet("SELECT * FROM bs_snapshots ORDER BY year_month DESC LIMIT 1") as BSSnapshot | null;
}

// ============ Monthly Budgets (予算策定) ============

export interface MonthlyBudget {
  id: number;
  year_month: string;
  revenue_budget: number;
  expense_budget: number;
  notes: string | null;
}

export async function getBudgets(): Promise<MonthlyBudget[]> {
  return await dbAll("SELECT * FROM monthly_budgets ORDER BY year_month ASC") as unknown as MonthlyBudget[];
}

export async function getBudget(yearMonth: string): Promise<MonthlyBudget | null> {
  return await dbGet("SELECT * FROM monthly_budgets WHERE year_month = ?", yearMonth) as MonthlyBudget | null;
}

export async function upsertBudget(yearMonth: string, revenueBudget: number, expenseBudget: number, notes: string | null): Promise<void> {
  await dbRun(`
    INSERT INTO monthly_budgets (year_month, revenue_budget, expense_budget, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(year_month) DO UPDATE SET revenue_budget = excluded.revenue_budget, expense_budget = excluded.expense_budget, notes = excluded.notes
  `, yearMonth, revenueBudget, expenseBudget, notes);
}

export async function deleteBudget(yearMonth: string): Promise<void> {
  await dbRun("DELETE FROM monthly_budgets WHERE year_month = ?", yearMonth);
}

// Cash flow forecast for dashboard chart
export async function getCashForecast(forecastMonths: number = 6): Promise<Array<{ month: string; balance: number; isActual: boolean }>> {
  const [fundingMonths, snapshot] = await Promise.all([
    getFundingMonths(),
    getLatestSnapshot(),
  ]);
  if (!snapshot) return [];

  const result: Array<{ month: string; balance: number; isActual: boolean }> = [];

  for (const fm of fundingMonths) {
    result.push({
      month: fm.year_month.replace(/^\d{4}-0?/, "") + "月",
      balance: fm.closing_balance,
      isActual: fm.is_actual,
    });
  }

  if (result.length === 0) {
    const cashTotal = Number(snapshot.cash_balance) + Number(snapshot.bank_balance);
    const monthlyBurn = await getMonthlyFixedCostEstimate();
    const now = new Date();

    for (let i = 0; i < forecastMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = `${d.getMonth() + 1}月`;
      const balance = cashTotal - monthlyBurn * i;
      result.push({ month: label, balance, isActual: i === 0 });
    }
  }

  return result;
}

// 資金繰りアラート: closing_balance < fixedCost × N ヶ月の月を返す
export async function getFundingDangerMonths(thresholdMultiplier: number = 2): Promise<Array<{ year_month: string; closing_balance: number }>> {
  const months = await getFundingMonths();
  const fixedCost = await getMonthlyFixedCostEstimate();
  const dangerLine = fixedCost * thresholdMultiplier;
  return months
    .filter(m => m.closing_balance < dangerLine)
    .map(m => ({ year_month: m.year_month, closing_balance: m.closing_balance }));
}
