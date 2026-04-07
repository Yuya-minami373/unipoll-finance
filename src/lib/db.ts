import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "finance.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  // Monthly financial snapshots (synced from freee)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      cash_balance INTEGER NOT NULL DEFAULT 0,
      bank_balance INTEGER NOT NULL DEFAULT 0,
      accounts_receivable INTEGER NOT NULL DEFAULT 0,
      total_revenue INTEGER NOT NULL DEFAULT 0,
      total_expense INTEGER NOT NULL DEFAULT 0,
      net_income INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Service-level P/L (by section/item in freee)
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_pl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      service_name TEXT NOT NULL,
      revenue INTEGER NOT NULL DEFAULT 0,
      cost INTEGER NOT NULL DEFAULT 0,
      gross_profit INTEGER NOT NULL DEFAULT 0,
      UNIQUE(year_month, service_name)
    );
  `);

  // Expense breakdown by category (with optional sub-category)
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_breakdown (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL DEFAULT 0,
      is_fixed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(year_month, category, sub_category)
    );
  `);

  // Recurring items for cash flow forecast
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount INTEGER NOT NULL,
      day_of_month INTEGER NOT NULL DEFAULT 25,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT
    );
  `);

  // App settings (key-value store)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Seed default settings
  db.exec(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('monthly_fixed_cost_estimate', '542000');
  `);

  // Project-level profitability
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_profitability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      municipality TEXT NOT NULL,
      service_name TEXT NOT NULL,
      revenue INTEGER NOT NULL DEFAULT 0,
      cost INTEGER NOT NULL DEFAULT 0,
      gross_profit INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE(year_month, municipality, service_name)
    );
  `);

  // Receivables (入金予定)
  db.exec(`
    CREATE TABLE IF NOT EXISTS receivables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      due_date TEXT NOT NULL,
      source TEXT NOT NULL,
      service_name TEXT,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'received', 'overdue')),
      received_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(due_date, source)
    );
  `);

  // Monthly funding items (資金繰り表の明細行)
  db.exec(`
    CREATE TABLE IF NOT EXISTS funding_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      section TEXT NOT NULL CHECK(section IN ('operating_income', 'operating_expense', 'investing_income', 'investing_expense', 'financing_income', 'financing_expense')),
      category TEXT NOT NULL,
      sub_category TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL DEFAULT 0,
      is_actual INTEGER NOT NULL DEFAULT 0,
      planned_amount INTEGER DEFAULT NULL,
      UNIQUE(year_month, section, category, sub_category)
    );
  `);
  // Migration: add sub_category column if it doesn't exist
  try {
    db.exec("ALTER TABLE funding_items ADD COLUMN sub_category TEXT NOT NULL DEFAULT ''");
    // Rebuild unique index after adding the column
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS funding_items_new_uq ON funding_items(year_month, section, category, sub_category)");
  } catch { /* column already exists */ }

  // Opening balance for funding table
  db.exec(`
    CREATE TABLE IF NOT EXISTS funding_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      opening_balance INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Balance sheet snapshot (BS概要)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bs_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      total_assets INTEGER NOT NULL DEFAULT 0,
      cash INTEGER NOT NULL DEFAULT 0,
      receivables_total INTEGER NOT NULL DEFAULT 0,
      payables INTEGER NOT NULL DEFAULT 0,
      loan_balance INTEGER NOT NULL DEFAULT 0,
      net_assets INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Monthly budgets (予算策定)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      revenue_budget INTEGER NOT NULL DEFAULT 0,
      expense_budget INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE(year_month)
    );
  `);

  // Sync log
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      source TEXT NOT NULL DEFAULT 'freee',
      status TEXT NOT NULL DEFAULT 'success',
      details TEXT
    );
  `);

  // Seed initial data if empty
  seedData(db);
}

function seedData(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM monthly_snapshots").get() as { c: number }).c;
  if (count > 0) return;

  // Monthly snapshots from freee trial data (Jan-Mar 2026)
  const insertSnapshot = db.prepare(`
    INSERT INTO monthly_snapshots (year_month, cash_balance, bank_balance, accounts_receivable, total_revenue, total_expense, net_income)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Jan 2026 — revenue: 入札支援 770,000 only
  insertSnapshot.run("2026-01", 156284, 2300000, 770000, 770000, 1516630, -745271);
  // Feb 2026 — revenue: 入札支援 ~800,000 + 深谷市クルー 1,045,000 = 1,845,000 (実態ベース)
  insertSnapshot.run("2026-02", 156284, 2700000, 1845000, 1845000, 1803529, 41471);
  // Mar 2026 — revenue: 0 (no new sales)
  insertSnapshot.run("2026-03", 156284, 3001818, 1907409, 0, 1603086, -1600083);

  // Service P/L from freee item breakdown (品目別)
  const insertPL = db.prepare(`
    INSERT INTO service_pl (year_month, service_name, revenue, cost, gross_profit)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Jan 2026
  insertPL.run("2026-01", "入札支援", 770000, 0, 770000);
  insertPL.run("2026-01", "Opsデザイン", 0, 0, 0);
  insertPL.run("2026-01", "クルー", 0, 0, 0);
  insertPL.run("2026-01", "アウトリーチ", 0, 0, 0);

  // Feb 2026
  insertPL.run("2026-02", "入札支援", 800000, 0, 800000);
  insertPL.run("2026-02", "Opsデザイン", 0, 0, 0);
  insertPL.run("2026-02", "クルー", 1045000, 0, 1045000);
  insertPL.run("2026-02", "アウトリーチ", 0, 0, 0);

  // Mar 2026
  insertPL.run("2026-03", "入札支援", 0, 0, 0);
  insertPL.run("2026-03", "Opsデザイン", 0, 0, 0);
  insertPL.run("2026-03", "クルー", 0, 0, 0);
  insertPL.run("2026-03", "アウトリーチ", 0, 0, 0);

  // Expense breakdown from freee (all 3 months)
  const insertExp = db.prepare(`
    INSERT INTO expense_breakdown (year_month, category, amount, is_fixed)
    VALUES (?, ?, ?, ?)
  `);

  // Helper for inserting expenses with optional sub_category
  const insertExpSub = db.prepare(`
    INSERT INTO expense_breakdown (year_month, category, sub_category, amount, is_fixed)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Jan 2026 (total: 1,516,630)
  insertExp.run("2026-01", "役員報酬", 600000, 1);
  insertExp.run("2026-01", "給料手当", 367720, 1);
  insertExp.run("2026-01", "法定福利費", 268652, 1);
  insertExp.run("2026-01", "支払報酬料", 57200, 1);
  insertExp.run("2026-01", "通信費", 11491, 1);
  insertExp.run("2026-01", "地代家賃", 15400, 1);
  insertExp.run("2026-01", "旅費交通費", 144911, 0);
  insertExp.run("2026-01", "交際費", 18306, 0);
  insertExp.run("2026-01", "会議費", 1200, 0);
  insertExp.run("2026-01", "支払手数料", 550, 0);
  insertExp.run("2026-01", "租税公課", 31200, 0);

  // Feb 2026 (total: 1,803,529)
  insertExp.run("2026-02", "役員報酬", 600000, 1);
  insertExp.run("2026-02", "給料手当", 432188, 1);
  insertExp.run("2026-02", "法定福利費", 268652, 1);
  insertExp.run("2026-02", "支払報酬料", 201060, 1);
  insertExp.run("2026-02", "通信費", 13091, 1);
  insertExp.run("2026-02", "地代家賃", 15400, 1);
  insertExp.run("2026-02", "旅費交通費", 29057, 0);
  insertExp.run("2026-02", "交際費", 60007, 0);
  insertExp.run("2026-02", "会議費", 23255, 0);
  insertExp.run("2026-02", "支払手数料", 131850, 0);
  insertExp.run("2026-02", "消耗品費", 13497, 0);
  insertExp.run("2026-02", "広告宣伝費", 1626, 0);
  insertExp.run("2026-02", "福利厚生費", 13846, 0);

  // Mar 2026 (total: 1,603,086) — 通信費はサブカテゴリ付きで明細表示
  insertExp.run("2026-03", "役員報酬", 600000, 1);
  insertExp.run("2026-03", "給料手当", 435064, 1);
  insertExp.run("2026-03", "法定福利費", 268652, 1);
  insertExp.run("2026-03", "支払報酬料", 35200, 1);
  // 通信費: sub_category付き（合計 ¥41,106）
  insertExpSub.run("2026-03", "通信費", "ソフトバンク（携帯）", 10000, 1);
  insertExpSub.run("2026-03", "通信費", "Labid", 11000, 1);
  insertExpSub.run("2026-03", "通信費", "Claude Max", 15320, 1);
  insertExpSub.run("2026-03", "通信費", "Notion", 2486, 1);
  insertExpSub.run("2026-03", "通信費", "ChatGPT", 2300, 1);
  insertExp.run("2026-03", "支払手数料", 129553, 0);
  insertExp.run("2026-03", "旅費交通費", 19090, 0);
  insertExp.run("2026-03", "交際費", 38221, 0);
  insertExp.run("2026-03", "会議費", 7010, 0);
  insertExp.run("2026-03", "福利厚生費", 29190, 0);

  // Recurring items for forecast
  const insertRecurring = db.prepare(`
    INSERT INTO recurring_items (name, type, amount, day_of_month, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Income
  insertRecurring.run("Green Plus 入札支援", "income", 550000, 31, "税込。金額は月により変動");
  insertRecurring.run("Gopal 入札支援", "income", 110000, 31, "税込固定");
  insertRecurring.run("リベラック 入札支援", "income", 110000, 31, "税込固定");

  // Fixed expenses
  insertRecurring.run("給与（山本）", "expense", 411657, 25, "4月以降唯一の給与");
  insertRecurring.run("社会保険料", "expense", 268652, 28, "会社+本人負担");
  insertRecurring.run("社労士報酬", "expense", 33000, 28, "あい事務所");
  insertRecurring.run("税理士報酬", "expense", 64820, 28, "横浜中央経理");
  insertRecurring.run("ソフトバンク", "expense", 10000, 26, "携帯");
  insertRecurring.run("駐車場", "expense", 10267, 28, "ケーユーシー");
  insertRecurring.run("Labid", "expense", 11000, 20, "入札情報");
  insertRecurring.run("オリコ（車ローン）", "expense", 43725, 27, "社用車");
  insertRecurring.run("SaaS（Claude/ChatGPT等）", "expense", 40000, 15, "AI・Notion・M365等");

  // Seed project profitability — 深谷市実績（採算モデルより）
  const insertProject = db.prepare(`
    INSERT INTO project_profitability (year_month, municipality, service_name, revenue, cost, gross_profit, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertProject.run("2025-10", "深谷市", "Opsデザイン", 250000, 84104, 165896, "市長選（値引き受注）");
  insertProject.run("2025-10", "深谷市", "クルー", 700000, 312284, 387716, "衆院選（値引き受注）");

  // Log the seed
  db.prepare("INSERT INTO sync_log (source, details) VALUES ('seed', 'Initial data seeded from freee trial data (2026-01 to 2026-03)')").run();
}
