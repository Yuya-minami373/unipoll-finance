import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllCustomerLTVs, addCustomerLTV, deleteCustomerLTV } from "@/lib/finance";
import { dbRun } from "@/lib/db";

// Ensure table exists (handles case where initDb skipped it)
async function ensureTable() {
  await dbRun(`CREATE TABLE IF NOT EXISTS customer_ltv (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    contract_type TEXT NOT NULL CHECK(contract_type IN ('recurring', 'one_time', 'variable')),
    monthly_amount INTEGER NOT NULL DEFAULT 0,
    annual_amount INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    ltv_3y INTEGER NOT NULL DEFAULT 0,
    ltv_5y INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    UNIQUE(customer_name, service_name)
  )`);
}

export async function GET() {
  await ensureTable();
  const data = await getAllCustomerLTVs();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    await addCustomerLTV(body);
    revalidatePath("/ltv");
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteCustomerLTV(id);
    revalidatePath("/ltv");
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
