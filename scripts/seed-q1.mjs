#!/usr/bin/env node
/**
 * Q1 (2026-01〜03) データ投入スクリプト
 * sync APIにPOSTしてQ1実績データを投入する
 *
 * Usage: node scripts/seed-q1.mjs [BASE_URL]
 *   BASE_URL defaults to https://unipoll-finance.vercel.app
 */

const BASE_URL = process.argv[2] || "https://unipoll-finance.vercel.app";
const API_TOKEN = process.env.API_SYNC_TOKEN || "";
const BASIC_USER = process.env.BASIC_AUTH_USER || "yuya";
const BASIC_PASS = process.env.BASIC_AUTH_PASS || "unipoll2026";

async function syncMonth(payload) {
  const basicAuth = Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");
  const res = await fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
      ...(API_TOKEN ? { "x-api-token": API_TOKEN } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Sync failed: ${JSON.stringify(json)}`);
  return json;
}

// ── 1-1. Monthly Snapshots ──────────────────────────
const snapshots = [
  {
    year_month: "2026-01",
    cash_balance: 0,
    bank_balance: 0,
    accounts_receivable: 0,
    total_revenue: 770000,
    total_expense: 1516630,
    net_income: -745271,
  },
  {
    year_month: "2026-02",
    cash_balance: 0,
    bank_balance: 0,
    accounts_receivable: 0,
    total_revenue: 1907409,
    total_expense: 1803529,
    net_income: 105653,
  },
  {
    year_month: "2026-03",
    cash_balance: 156284,
    bank_balance: 4598132,
    accounts_receivable: 770000,
    total_revenue: 770000,
    total_expense: 1977042,
    net_income: -1204039,
  },
];

// ── 1-2. Service P/L ────────────────────────────────
const servicePL = [
  { year_month: "2026-01", service_name: "入札支援", revenue: 770000, cost: 0, gross_profit: 770000 },
  { year_month: "2026-01", service_name: "クルー", revenue: 0, cost: 0, gross_profit: 0 },
  { year_month: "2026-02", service_name: "入札支援", revenue: 829044, cost: 0, gross_profit: 829044 },
  { year_month: "2026-02", service_name: "クルー", revenue: 950000, cost: 396388, gross_profit: 553612 },
  { year_month: "2026-03", service_name: "入札支援", revenue: 770000, cost: 0, gross_profit: 770000 },
  { year_month: "2026-03", service_name: "クルー", revenue: 0, cost: 0, gross_profit: 0 },
];

// ── 1-3. Expense Breakdown ──────────────────────────
const expenses = [
  // January
  { year_month: "2026-01", category: "役員報酬", amount: 600000, is_fixed: true },
  { year_month: "2026-01", category: "給料手当", amount: 367720, is_fixed: true },
  { year_month: "2026-01", category: "法定福利費", amount: 268652, is_fixed: true },
  { year_month: "2026-01", category: "旅費交通費", amount: 144911, is_fixed: false },
  { year_month: "2026-01", category: "交際費", amount: 18306, is_fixed: false },
  { year_month: "2026-01", category: "支払報酬料", amount: 57200, is_fixed: true },
  { year_month: "2026-01", category: "地代家賃", amount: 15400, is_fixed: true },
  { year_month: "2026-01", category: "通信費", amount: 11491, is_fixed: true },
  { year_month: "2026-01", category: "租税公課", amount: 31200, is_fixed: false },
  { year_month: "2026-01", category: "支払手数料", amount: 550, is_fixed: true },
  { year_month: "2026-01", category: "会議費", amount: 1200, is_fixed: false },
  // February
  { year_month: "2026-02", category: "役員報酬", amount: 600000, is_fixed: true },
  { year_month: "2026-02", category: "給料手当", amount: 432188, is_fixed: true },
  { year_month: "2026-02", category: "法定福利費", amount: 268652, is_fixed: true },
  { year_month: "2026-02", category: "旅費交通費", amount: 29057, is_fixed: false },
  { year_month: "2026-02", category: "交際費", amount: 60007, is_fixed: false },
  { year_month: "2026-02", category: "支払報酬料", amount: 201060, is_fixed: true },
  { year_month: "2026-02", category: "地代家賃", amount: 15400, is_fixed: true },
  { year_month: "2026-02", category: "通信費", amount: 50891, is_fixed: true },
  { year_month: "2026-02", category: "支払手数料", amount: 94050, is_fixed: true },
  { year_month: "2026-02", category: "会議費", amount: 23255, is_fixed: false },
  { year_month: "2026-02", category: "消耗品費", amount: 13497, is_fixed: false },
  { year_month: "2026-02", category: "広告宣伝費", amount: 1626, is_fixed: false },
  { year_month: "2026-02", category: "福利厚生費", amount: 13846, is_fixed: false },
  // March
  { year_month: "2026-03", category: "役員報酬", amount: 600000, is_fixed: true },
  { year_month: "2026-03", category: "給料手当", amount: 435064, is_fixed: true },
  { year_month: "2026-03", category: "法定福利費", amount: 537304, is_fixed: true },
  { year_month: "2026-03", category: "旅費交通費", amount: 19090, is_fixed: false },
  { year_month: "2026-03", category: "交際費", amount: 38221, is_fixed: false },
  { year_month: "2026-03", category: "支払報酬料", amount: 35200, is_fixed: true },
  { year_month: "2026-03", category: "地代家賃", amount: 15400, is_fixed: true },
  { year_month: "2026-03", category: "通信費", amount: 116843, is_fixed: true },
  { year_month: "2026-03", category: "支払手数料", amount: 93720, is_fixed: true },
  { year_month: "2026-03", category: "会議費", amount: 7010, is_fixed: false },
  { year_month: "2026-03", category: "消耗品費", amount: 50000, is_fixed: false },
  { year_month: "2026-03", category: "福利厚生費", amount: 29190, is_fixed: false },
];

// ── 1-4. BS Snapshot ────────────────────────────────
const bs = {
  year_month: "2026-03",
  total_assets: 6551515,
  cash: 4754416,
  receivables_total: 770000,
  payables: 205933,
  loan_balance: 5000000,
  net_assets: 645914,
};

// ── 1-5. Project P/L ────────────────────────────────
const projectPL = [
  { year_month: "2026-01", municipality: "Green Plus", service_name: "入札支援", revenue: 550000, cost: 0 },
  { year_month: "2026-01", municipality: "リベラック", service_name: "入札支援", revenue: 110000, cost: 0 },
  { year_month: "2026-01", municipality: "Gopal", service_name: "入札支援", revenue: 110000, cost: 0 },
  { year_month: "2026-02", municipality: "Green Plus", service_name: "入札支援", revenue: 609044, cost: 0 },
  { year_month: "2026-02", municipality: "リベラック", service_name: "入札支援", revenue: 110000, cost: 0 },
  { year_month: "2026-02", municipality: "Gopal", service_name: "入札支援", revenue: 110000, cost: 0 },
  { year_month: "2026-02", municipality: "深谷市", service_name: "クルー", revenue: 950000, cost: 396388 },
  { year_month: "2026-03", municipality: "Green Plus", service_name: "入札支援", revenue: 550000, cost: 0 },
  { year_month: "2026-03", municipality: "リベラック", service_name: "入札支援", revenue: 110000, cost: 0 },
  { year_month: "2026-03", municipality: "Gopal", service_name: "入札支援", revenue: 110000, cost: 0 },
];

// ── 1-6. Receivables ────────────────────────────────
const receivables = [
  { due_date: "2026-04-30", source: "Green Plus", service_name: "入札支援", amount: 550000, status: "pending", notes: "3月分" },
  { due_date: "2026-04-30", source: "リベラック", service_name: "入札支援", amount: 110000, status: "pending", notes: "3月分" },
  { due_date: "2026-04-30", source: "Gopal", service_name: "入札支援", amount: 110000, status: "pending", notes: "3月分" },
];

// ── Execute ─────────────────────────────────────────
async function main() {
  console.log(`Syncing Q1 data to ${BASE_URL} ...`);

  // Send each month's snapshot individually (sync API takes one snapshot at a time)
  for (const snap of snapshots) {
    const monthExpenses = expenses.filter((e) => e.year_month === snap.year_month);
    const monthServicePL = servicePL.filter((s) => s.year_month === snap.year_month);
    const monthProjectPL = projectPL.filter((p) => p.year_month === snap.year_month);

    const payload = {
      snapshot: snap,
      service_pl: monthServicePL,
      expenses: monthExpenses,
      project_pl: monthProjectPL,
    };

    // Add BS + receivables only for March
    if (snap.year_month === "2026-03") {
      payload.bs = bs;
      payload.receivables = receivables;
    }

    const result = await syncMonth(payload);
    console.log(`  ✅ ${snap.year_month}: ${result.message}`);
  }

  console.log("Done! Q1 data synced successfully.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
