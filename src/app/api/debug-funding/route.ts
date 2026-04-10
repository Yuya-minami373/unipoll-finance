import { NextResponse } from "next/server";
import { dbAll } from "@/lib/db";

export async function GET() {
  const items = await dbAll(
    "SELECT year_month, section, category, sub_category, amount, is_actual, planned_amount FROM funding_items WHERE year_month IN ('2026-01','2026-02','2026-03') ORDER BY year_month, section, category"
  );
  const balances = await dbAll(
    "SELECT year_month, opening_balance FROM funding_balances WHERE year_month IN ('2026-01','2026-02','2026-03') ORDER BY year_month"
  );
  return NextResponse.json({ items, balances });
}
