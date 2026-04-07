import { NextRequest, NextResponse } from "next/server";
import { getBudgets, upsertBudget, deleteBudget } from "@/lib/finance";

export async function GET() {
  return NextResponse.json(getBudgets());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { year_month, revenue_budget, expense_budget, notes } = body;
  if (!year_month) {
    return NextResponse.json({ error: "year_month required" }, { status: 400 });
  }
  upsertBudget(year_month, revenue_budget || 0, expense_budget || 0, notes || null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ym = req.nextUrl.searchParams.get("year_month");
  if (!ym) return NextResponse.json({ error: "year_month required" }, { status: 400 });
  deleteBudget(ym);
  return NextResponse.json({ ok: true });
}
