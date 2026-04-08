import { NextRequest, NextResponse } from "next/server";
import { addRecurringItem, updateRecurringItem, deleteRecurringItem } from "@/lib/finance";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, amount, day_of_month, notes } = body;
    if (!name || !type || !amount) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }
    await addRecurringItem(name, type, amount, day_of_month || 25, notes || null);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, type, amount, day_of_month, notes } = body;
    if (!id || !name || !type || !amount) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }
    await updateRecurringItem(id, name, type, amount, day_of_month || 25, notes || null);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    await deleteRecurringItem(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
