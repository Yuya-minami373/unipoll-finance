import {
  getFundingMonths,
  getWeeklyFunding,
  getMonthlyFixedCostEstimate,
  getExpenseBreakdown,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "@/lib/finance";
import FundingView from "./FundingView";

export const dynamic = "force-dynamic";

export default async function FundingPage() {
  const [fundingMonths, weeks, fixedCost] = await Promise.all([
    getFundingMonths(),
    getWeeklyFunding(8),
    getMonthlyFixedCostEstimate(),
  ]);

  // Build expense sub-category map: { "2026-01": { "通信費": [{ sub_category, amount }] } }
  const expenseSubCategories: Record<string, Record<string, Array<{ sub_category: string; amount: number }>>> = {};
  for (const m of fundingMonths) {
    const breakdown = await getExpenseBreakdown(m.year_month);
    const byCat: Record<string, Array<{ sub_category: string; amount: number }>> = {};
    for (const e of breakdown) {
      if (!e.sub_category) continue;
      if (!byCat[e.category]) byCat[e.category] = [];
      byCat[e.category].push({ sub_category: String(e.sub_category), amount: Number(e.amount) });
    }
    if (Object.keys(byCat).length > 0) {
      expenseSubCategories[m.year_month] = byCat;
    }
  }

  return (
    <FundingView
      fundingMonths={fundingMonths}
      weeks={weeks}
      fixedCost={fixedCost}
      incomeCategories={INCOME_CATEGORIES}
      expenseCategories={EXPENSE_CATEGORIES}
      expenseSubCategories={expenseSubCategories}
    />
  );
}
