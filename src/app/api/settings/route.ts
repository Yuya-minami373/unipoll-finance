import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/finance";

export async function GET() {
  try {
    const monthlyFixedCost = await getSetting("monthly_fixed_cost_estimate") || "542000";
    return NextResponse.json({ monthly_fixed_cost_estimate: parseInt(monthlyFixedCost, 10) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/settings error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.monthly_fixed_cost_estimate !== undefined) {
      await setSetting("monthly_fixed_cost_estimate", String(Math.round(body.monthly_fixed_cost_estimate)));
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
