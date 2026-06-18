import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    let touched = false;
    if (body.monthly_fixed_cost_estimate !== undefined) {
      await setSetting("monthly_fixed_cost_estimate", String(Math.round(body.monthly_fixed_cost_estimate)));
      touched = true;
    }
    // 社保（法定福利費）発生主義補正の設定
    if (body.shaho_accrual_monthly !== undefined) {
      // 0〜上限（社保月額が9,999,999円を超えることは実務上ない）にクランプ
      const monthly = Math.min(9999999, Math.max(0, Math.round(Number(body.shaho_accrual_monthly) || 0)));
      await setSetting("shaho_accrual_monthly", String(monthly));
      touched = true;
    }
    // YYYY-MM（月は01〜12のみ）
    if (body.shaho_accrual_start !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(String(body.shaho_accrual_start))) {
      await setSetting("shaho_accrual_start", String(body.shaho_accrual_start));
      touched = true;
    }
    if (touched) {
      revalidatePath("/");
      revalidatePath("/monthly-pl");
      revalidatePath("/settings");
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
