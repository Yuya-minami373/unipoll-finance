#!/usr/bin/env node
/**
 * Q1 funding_items の現在のデータを取得して表示
 * debug-funding APIを使用
 */
const BASE_URL = process.argv[2] || "https://unipoll-finance.vercel.app";
const basicAuth = Buffer.from("yuya:unipoll2026").toString("base64");

async function main() {
  const res = await fetch(`${BASE_URL}/api/debug-funding`, {
    headers: { Authorization: `Basic ${basicAuth}` },
  });
  if (!res.ok) {
    console.log("Status:", res.status);
    const text = await res.text();
    console.log(text.substring(0, 200));
    return;
  }
  const data = await res.json();

  console.log("=== Balances ===");
  for (const b of data.balances) {
    console.log(`  ${b.year_month}: ¥${Number(b.opening_balance).toLocaleString()}`);
  }

  console.log("\n=== Funding Items (Q1) ===");
  let currentYM = "";
  for (const item of data.items) {
    if (item.year_month !== currentYM) {
      currentYM = item.year_month;
      console.log(`\n--- ${currentYM} ---`);
    }
    const actual = item.is_actual ? "[実績]" : "[計画]";
    const planned = item.planned_amount != null ? ` (計画: ¥${Number(item.planned_amount).toLocaleString()})` : "";
    console.log(`  ${actual} ${item.section} / ${item.category}${item.sub_category ? ` / ${item.sub_category}` : ""}: ¥${Number(item.amount).toLocaleString()}${planned}`);
  }
}

main().catch(console.error);
