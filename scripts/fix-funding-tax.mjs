#!/usr/bin/env node
/**
 * 資金繰り表の4月以降の入札支援を税込に修正
 * funding_items の入札支援サービス: 700,000 → 770,000
 */

const BASE_URL = process.argv[2] || "https://unipoll-finance.vercel.app";
const BASIC_USER = "yuya";
const BASIC_PASS = "unipoll2026";

// 4月〜12月の入札支援を税込で再投入
const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];

async function main() {
  const basicAuth = Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");
  console.log("Fixing funding_items 入札支援 to tax-inclusive...");

  for (const ym of months) {
    const payload = {
      funding_items: [
        {
          year_month: ym,
          section: "operating_income",
          category: "入札支援サービス",
          sub_category: "",
          amount: 770000,
          is_actual: false,
          planned_amount: 770000,
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(`Failed for ${ym}: ${JSON.stringify(json)}`);
    console.log(`  ✅ ${ym}: 入札支援 → ¥770,000`);
  }
  console.log("Done!");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
