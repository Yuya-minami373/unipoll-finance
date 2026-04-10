import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllCustomerLTVs, addCustomerLTV, deleteCustomerLTV } from "@/lib/finance";

export async function GET() {
  const data = await getAllCustomerLTVs();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
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
