#!/usr/bin/env node
/**
 * 3月の法定福利費を537,304に修正（268,652 → 537,304）
 * 3/2 + 3/31 の2回引き落とし分
 */
const BASE_URL = process.argv[2] || "https://unipoll-finance.vercel.app";
const basicAuth = Buffer.from("yuya:unipoll2026").toString("base64");

async function main() {
  const res = await fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      funding_items: [
        {
          year_month: "2026-03",
          section: "operating_expense",
          category: "法定福利費",
          sub_category: "",
          amount: 537304,
          is_actual: true,
          planned_amount: null,
        },
      ],
    }),
  });
  const json = await res.json();
  console.log(json.ok ? "✅ 3月 法定福利費 → ¥537,304 に修正" : `❌ ${JSON.stringify(json)}`);
}

main().catch(console.error);
