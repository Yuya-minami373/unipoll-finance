import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";

export async function GET() {
  const rows = await dbAll("SELECT * FROM project_profitability ORDER BY year_month DESC, municipality ASC");
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year_month, municipality, service_name, revenue, cost, notes } = body;
    const gross_profit = (revenue || 0) - (cost || 0);

    await dbRun(`
      INSERT INTO project_profitability (year_month, municipality, service_name, revenue, cost, gross_profit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(year_month, municipality, service_name) DO UPDATE SET
        revenue = excluded.revenue,
        cost = excluded.cost,
        gross_profit = excluded.gross_profit,
        notes = excluded.notes
    `, year_month, municipality, service_name, revenue || 0, cost || 0, gross_profit, notes || null);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await dbRun("DELETE FROM project_profitability WHERE id = ?", id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
