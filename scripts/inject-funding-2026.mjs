/**
 * Inject 2026 funding data (freee actual Jan-Mar + forecast Apr-Dec)
 * Clears old data first, then inserts fresh data with cascading balances.
 */
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "finance.db");
const db = new Database(DB_PATH);

// ============ Clear existing funding data ============
console.log("Clearing existing funding data...");
db.exec("DELETE FROM funding_items");
db.exec("DELETE FROM funding_balances");
console.log("Done.");

// ============ Monthly data ============

const months = [];

// --- Plan template for Jan-Mar (used as planned_amount for actual months) ---
const JAN_PLAN = {
  income: [{ category: "入札支援サービス", amount: 700000 }],
  expense: [
    { category: "給料賃金", amount: 435000 },
    { category: "法定福利費", amount: 100000 },
    { category: "通信費", amount: 15000 },
    { category: "地代家賃", amount: 15400 },
    { category: "支払手数料", amount: 5000 },
    { category: "支払報酬料", amount: 35000 },
  ],
};
const FEB_PLAN = {
  income: [{ category: "入札支援サービス", amount: 700000 }],
  expense: [...JAN_PLAN.expense],
  financing_income: [{ category: "アイメスト融資", amount: 5000000 }],
};
const MAR_PLAN = {
  income: [
    { category: "入札支援サービス", amount: 700000 },
    { category: "UniPollクルー", amount: 1000000 },
  ],
  expense: [...JAN_PLAN.expense],
};

// --- Jan 2026 (actual) ---
months.push({
  year_month: "2026-01",
  is_actual: true,
  income: [
    { category: "入札支援サービス", amount: 770000 },
  ],
  planned_income: JAN_PLAN.income,
  expense: [
    { category: "役員報酬", amount: 600000 },
    { category: "給料賃金", amount: 367720 },
    { category: "法定福利費", amount: 268652 },
    { category: "接待交際費", amount: 18306 },
    { category: "会議費", amount: 1200 },
    { category: "旅費交通費", amount: 144911 },
    { category: "通信費", amount: 11491 },
    { category: "支払手数料", amount: 550 },
    { category: "地代家賃", amount: 15400 },
    { category: "租税公課", amount: 31200 },
    { category: "支払報酬料", amount: 57200 },
  ],
  planned_expense: JAN_PLAN.expense,
  financing_income: [],
  planned_financing_income: [],
  financing_expense: [],
});

// --- Feb 2026 (actual) ---
months.push({
  year_month: "2026-02",
  is_actual: true,
  income: [
    { category: "入札支援サービス", amount: 862409 },
  ],
  planned_income: FEB_PLAN.income,
  expense: [
    { category: "役員報酬", amount: 600000 },
    { category: "給料賃金", amount: 432188 },
    { category: "法定福利費", amount: 268652 },
    { category: "福利厚生費", amount: 13846 },
    { category: "広告宣伝費", amount: 1626 },
    { category: "接待交際費", amount: 60007 },
    { category: "会議費", amount: 23255 },
    { category: "旅費交通費", amount: 29057 },
    { category: "通信費", amount: 13091 },
    { category: "備品・消耗品費", amount: 13497 },
    { category: "支払手数料", amount: 131850 },
    { category: "地代家賃", amount: 15400 },
    { category: "支払報酬料", amount: 201060 },
  ],
  planned_expense: FEB_PLAN.expense,
  financing_income: [
    { category: "アイメスト融資", amount: 5000000 },
  ],
  planned_financing_income: FEB_PLAN.financing_income,
  financing_expense: [],
});

// --- Mar 2026 (actual) ---
months.push({
  year_month: "2026-03",
  is_actual: true,
  income: [
    { category: "UniPollクルー", amount: 1045000 },
  ],
  planned_income: MAR_PLAN.income,
  expense: [
    { category: "役員報酬", amount: 600000 },
    { category: "給料賃金", amount: 435064 },
    { category: "法定福利費", amount: 268652 },
    { category: "福利厚生費", amount: 29190 },
    { category: "接待交際費", amount: 38221 },
    { category: "会議費", amount: 7010 },
    { category: "旅費交通費", amount: 19090 },
    { category: "通信費", amount: 42872 },
    { category: "支払手数料", amount: 129553 },
    { category: "支払報酬料", amount: 35200 },
  ],
  planned_expense: MAR_PLAN.expense,
  financing_income: [],
  planned_financing_income: [],
  financing_expense: [],
});

// --- Apr 2026 (forecast: 入札支援のみ、パートナー事業は5月入金) ---
months.push({
  year_month: "2026-04",
  is_actual: false,
  income: [
    { category: "入札支援サービス", amount: 700000 },
  ],
  expense: [
    { category: "給料賃金", amount: 435000 },
    { category: "法定福利費", amount: 100000 },
    { category: "通信費", amount: 15000 },
    { category: "地代家賃", amount: 15400 },
    { category: "支払手数料", amount: 5000 },
    { category: "支払報酬料", amount: 35000 },
  ],
  financing_income: [],
  financing_expense: [],
});

// --- May 2026 (forecast: パートナー事業 初月入金 + パートナー報酬開始) ---
months.push({
  year_month: "2026-05",
  is_actual: false,
  income: [
    { category: "入札支援サービス", amount: 700000 },
    { category: "案件獲得パートナー報酬", amount: 600000 },
    { category: "パートナー事業", amount: 105000 },
  ],
  expense: [
    { category: "給料賃金", amount: 435000 },
    { category: "法定福利費", amount: 100000 },
    { category: "通信費", amount: 15000 },
    { category: "地代家賃", amount: 15400 },
    { category: "支払手数料", amount: 5000 },
    { category: "支払報酬料", amount: 35000 },
  ],
  financing_income: [],
  financing_expense: [],
});

// --- Jun-Dec 2026 (forecast: パートナー報酬継続、パートナー事業は5月のみ) ---
for (let m = 6; m <= 12; m++) {
  const ym = `2026-${String(m).padStart(2, "0")}`;
  months.push({
    year_month: ym,
    is_actual: false,
    income: [
      { category: "入札支援サービス", amount: 700000 },
      { category: "案件獲得パートナー報酬", amount: 600000 },
    ],
    expense: [
      { category: "給料賃金", amount: 435000 },
      { category: "法定福利費", amount: 100000 },
      { category: "通信費", amount: 15000 },
      { category: "地代家賃", amount: 15400 },
      { category: "支払手数料", amount: 5000 },
      { category: "支払報酬料", amount: 35000 },
    ],
    financing_income: [],
    financing_expense: [],
  });
}

// ============ Insert funding items ============
const insertItem = db.prepare(
  "INSERT INTO funding_items (year_month, section, category, amount, is_actual, planned_amount) VALUES (?, ?, ?, ?, ?, ?)"
);
const insertBalance = db.prepare(
  "INSERT INTO funding_balances (year_month, opening_balance) VALUES (?, ?)"
);

// Opening balance for Jan 2026 from freee BS: 現金¥256 + GMO¥2,139,825
const JAN_OPENING = 2140081;

let runningBalance = JAN_OPENING;

// Helper: find planned amount for a category from planned array
function findPlanned(planned, category) {
  if (!planned) return null;
  const item = planned.find(p => p.category === category);
  return item ? item.amount : null;
}

const insertAll = db.transaction(() => {
  for (const m of months) {
    // Insert opening balance
    insertBalance.run(m.year_month, runningBalance);

    let totalIncome = 0;
    let totalExpense = 0;

    // Operating income
    for (const item of m.income) {
      const planned = findPlanned(m.planned_income, item.category);
      insertItem.run(m.year_month, "operating_income", item.category, item.amount, m.is_actual ? 1 : 0, planned);
      totalIncome += item.amount;
    }
    // Insert planned-only income items (categories that exist in plan but not in actuals)
    if (m.is_actual && m.planned_income) {
      for (const p of m.planned_income) {
        if (!m.income.some(i => i.category === p.category)) {
          insertItem.run(m.year_month, "operating_income", p.category, 0, 1, p.amount);
        }
      }
    }

    // Operating expense
    for (const item of m.expense) {
      const planned = findPlanned(m.planned_expense, item.category);
      insertItem.run(m.year_month, "operating_expense", item.category, item.amount, m.is_actual ? 1 : 0, planned);
      totalExpense += item.amount;
    }
    // Insert planned-only expense items
    if (m.is_actual && m.planned_expense) {
      for (const p of m.planned_expense) {
        if (!m.expense.some(i => i.category === p.category)) {
          insertItem.run(m.year_month, "operating_expense", p.category, 0, 1, p.amount);
        }
      }
    }

    // Financing income
    for (const item of m.financing_income) {
      const planned = findPlanned(m.planned_financing_income, item.category);
      insertItem.run(m.year_month, "financing_income", item.category, item.amount, m.is_actual ? 1 : 0, planned);
      totalIncome += item.amount;
    }

    // Financing expense
    for (const item of (m.financing_expense || [])) {
      insertItem.run(m.year_month, "financing_expense", item.category, item.amount, m.is_actual ? 1 : 0, null);
      totalExpense += item.amount;
    }

    const net = totalIncome - totalExpense;
    runningBalance += net;

    console.log(`${m.year_month} ${m.is_actual ? "実績" : "計画"}: income=${totalIncome}, expense=${totalExpense}, net=${net}, closing=${runningBalance}`);
  }
});

insertAll();

// ============ Insert BS snapshot ============
console.log("\nInserting BS snapshot (2026-03)...");
db.prepare(`
  INSERT INTO bs_snapshots (year_month, total_assets, cash, receivables_total, payables, loan_balance, net_assets)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(year_month) DO UPDATE SET
    total_assets = excluded.total_assets,
    cash = excluded.cash,
    receivables_total = excluded.receivables_total,
    payables = excluded.payables,
    loan_balance = excluded.loan_balance,
    net_assets = excluded.net_assets,
    synced_at = datetime('now', 'localtime')
`).run("2026-03", 7227167, 3895568, 2304500, 829563, 5000000, 1397604);
console.log("BS snapshot inserted.");

db.close();
console.log("\nDone! All 2026 funding data injected.");
