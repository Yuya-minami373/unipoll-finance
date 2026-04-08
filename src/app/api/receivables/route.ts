import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getReceivables, addReceivable, updateReceivableStatus, deleteReceivable } from "@/lib/finance";

export const dynamic = "force-dynamic"; // API routes must stay dynamic

// GET /api/receivables — returns pending/overdue only (received are hidden)
export async function GET() {
  const all = await getReceivables();
  const data = all.filter(r => r.status !== "received");
  return NextResponse.json(data);
}

// POST /api/receivables — create or update status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Update status (mark as received, etc.)
    if (body.action === "update_status") {
      await updateReceivableStatus(body.id, body.status, body.received_date);
      revalidatePath("/");
      revalidatePath("/receivables");
      return NextResponse.json({ ok: true });
    }

    // Create new
    if (!body.due_date || !body.source || !body.amount) {
      return NextResponse.json({ ok: false, error: "due_date, source, amount are required" }, { status: 400 });
    }
    await addReceivable({
      due_date: body.due_date,
      source: body.source,
      service_name: body.service_name,
      amount: body.amount,
      notes: body.notes,
    });
    revalidatePath("/");
    revalidatePath("/receivables");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// DELETE /api/receivables?id=123
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  await deleteReceivable(parseInt(id, 10));
  revalidatePath("/");
  revalidatePath("/receivables");
  return NextResponse.json({ ok: true });
}
