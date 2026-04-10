#!/usr/bin/env node
/**
 * LTV初期データ投入スクリプト
 * Usage: node scripts/seed-ltv.mjs [BASE_URL]
 */

const BASE_URL = process.argv[2] || "https://unipoll-finance.vercel.app";
const BASIC_USER = process.env.BASIC_AUTH_USER || "yuya";
const BASIC_PASS = process.env.BASIC_AUTH_PASS || "unipoll2026";

const customers = [
  {
    customer_name: "Green Plus",
    service_name: "入札支援",
    contract_type: "recurring",
    monthly_amount: 500000,
    annual_amount: 6000000,
    start_date: "2025-10-01",
    ltv_3y: 18000000,
    ltv_5y: 30000000,
    is_active: 1,
    notes: null,
  },
  {
    customer_name: "Green Plus",
    service_name: "車庫証明パートナー",
    contract_type: "variable",
    monthly_amount: 500000,
    annual_amount: 6000000,
    start_date: "2026-05-01",
    ltv_3y: 18000000,
    ltv_5y: 30000000,
    is_active: 1,
    notes: "月35〜100万で変動。中央値50万で計算",
  },
  {
    customer_name: "リベラック",
    service_name: "入札支援",
    contract_type: "recurring",
    monthly_amount: 100000,
    annual_amount: 1200000,
    start_date: "2025-10-01",
    ltv_3y: 3600000,
    ltv_5y: 6000000,
    is_active: 1,
    notes: null,
  },
  {
    customer_name: "Gopal",
    service_name: "入札支援",
    contract_type: "recurring",
    monthly_amount: 100000,
    annual_amount: 1200000,
    start_date: "2025-10-01",
    ltv_3y: 3600000,
    ltv_5y: 6000000,
    is_active: 1,
    notes: null,
  },
  {
    customer_name: "グラファー",
    service_name: "リクロス営業代行",
    contract_type: "recurring",
    monthly_amount: 105000,
    annual_amount: 1260000,
    start_date: "2026-02-01",
    ltv_3y: 0,
    ltv_5y: 0,
    is_active: 1,
    notes: "1ヶ月更新。LTVは継続不確実のため0",
  },
];

async function main() {
  const basicAuth = Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");
  console.log(`Seeding LTV data to ${BASE_URL} ...`);

  for (const c of customers) {
    const res = await fetch(`${BASE_URL}/api/ltv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(c),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(`Failed for ${c.customer_name}: ${JSON.stringify(json)}`);
    console.log(`  ✅ ${c.customer_name} / ${c.service_name}`);
  }
  console.log("Done!");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
