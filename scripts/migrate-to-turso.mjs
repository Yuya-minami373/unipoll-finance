/**
 * Migrate local SQLite data to Turso cloud database
 * Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate-to-turso.mjs
 *
 * Requires better-sqlite3 for reading local DB:
 *   npm install better-sqlite3 (temporary, for migration only)
 */
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "finance.db");

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars");
  process.exit(1);
}

const local = new Database(DB_PATH, { readonly: true });
const remote = createClient({ url: tursoUrl, authToken: tursoToken });

// Create tables (same as db.ts initDb)
await remote.batch(
  [
    { sql: `CREATE TABLE IF NOT EXISTS monthly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      cash_balance INTEGER NOT NULL DEFAULT 0,
      bank_balance INTEGER NOT NULL DEFAULT 0,
      accounts_receivable INTEGER NOT NULL DEFAULT 0,
      total_revenue INTEGER NOT NULL DEFAULT 0,
      total_expense INTEGER NOT NULL DEFAULT 0,
      net_income INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS service_pl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      service_name TEXT NOT NULL,
      revenue INTEGER NOT NULL DEFAULT 0,
      cost INTEGER NOT NULL DEFAULT 0,
      gross_profit INTEGER NOT NULL DEFAULT 0,
      UNIQUE(year_month, service_name)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS expense_breakdown (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL DEFAULT 0,
      is_fixed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(year_month, category, sub_category)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS recurring_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount INTEGER NOT NULL,
      day_of_month INTEGER NOT NULL DEFAULT 25,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS project_profitability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      municipality TEXT NOT NULL,
      service_name TEXT NOT NULL,
      revenue INTEGER NOT NULL DEFAULT 0,
      cost INTEGER NOT NULL DEFAULT 0,
      gross_profit INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE(year_month, municipality, service_name)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS receivables (
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
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS funding_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      section TEXT NOT NULL CHECK(section IN ('operating_income', 'operating_expense', 'investing_income', 'investing_expense', 'financing_income', 'financing_expense')),
      category TEXT NOT NULL,
      sub_category TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL DEFAULT 0,
      is_actual INTEGER NOT NULL DEFAULT 0,
      planned_amount INTEGER DEFAULT NULL,
      UNIQUE(year_month, section, category, sub_category)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS funding_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      opening_balance INTEGER NOT NULL DEFAULT 0
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS bs_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      total_assets INTEGER NOT NULL DEFAULT 0,
      cash INTEGER NOT NULL DEFAULT 0,
      receivables_total INTEGER NOT NULL DEFAULT 0,
      payables INTEGER NOT NULL DEFAULT 0,
      loan_balance INTEGER NOT NULL DEFAULT 0,
      net_assets INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS monthly_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL,
      revenue_budget INTEGER NOT NULL DEFAULT 0,
      expense_budget INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE(year_month)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      source TEXT NOT NULL DEFAULT 'freee',
      status TEXT NOT NULL DEFAULT 'success',
      details TEXT
    )`, args: [] },
  ],
  "write"
);
console.log("✅ Tables created");

const CHUNK = 20;

async function migrateTable(tableName, columns) {
  let rows;
  try {
    rows = local.prepare(`SELECT * FROM ${tableName}`).all();
  } catch {
    console.log(`⏭ ${tableName}: table not found locally, skipping`);
    return;
  }
  if (rows.length === 0) {
    console.log(`⏭ ${tableName}: empty, skipping`);
    return;
  }
  console.log(`📤 ${tableName}: ${rows.length} rows...`);

  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await remote.batch(
      chunk.map((row) => ({
        sql,
        args: columns.map((col) => row[col] ?? null),
      })),
      "write"
    );
    console.log(`  ${Math.min(i + CHUNK, rows.length)} / ${rows.length}`);
  }
}

// Migrate all 12 tables
await migrateTable("monthly_snapshots", [
  "id", "year_month", "cash_balance", "bank_balance", "accounts_receivable",
  "total_revenue", "total_expense", "net_income", "synced_at"
]);

await migrateTable("service_pl", [
  "id", "year_month", "service_name", "revenue", "cost", "gross_profit"
]);

await migrateTable("expense_breakdown", [
  "id", "year_month", "category", "sub_category", "amount", "is_fixed"
]);

await migrateTable("recurring_items", [
  "id", "name", "type", "amount", "day_of_month", "is_active", "notes"
]);

await migrateTable("app_settings", ["key", "value", "updated_at"]);

await migrateTable("project_profitability", [
  "id", "year_month", "municipality", "service_name", "revenue", "cost", "gross_profit", "notes"
]);

await migrateTable("receivables", [
  "id", "due_date", "source", "service_name", "amount", "status", "received_date", "notes", "created_at"
]);

await migrateTable("funding_items", [
  "id", "year_month", "section", "category", "sub_category", "amount", "is_actual", "planned_amount"
]);

await migrateTable("funding_balances", ["id", "year_month", "opening_balance"]);

await migrateTable("bs_snapshots", [
  "id", "year_month", "total_assets", "cash", "receivables_total", "payables", "loan_balance", "net_assets", "synced_at"
]);

await migrateTable("monthly_budgets", [
  "id", "year_month", "revenue_budget", "expense_budget", "notes"
]);

await migrateTable("sync_log", ["id", "synced_at", "source", "status", "details"]);

// Verify
const snapshotCount = await remote.execute("SELECT COUNT(*) as c FROM monthly_snapshots");
const recurringCount = await remote.execute("SELECT COUNT(*) as c FROM recurring_items");
console.log(`\n✅ Migration complete!`);
console.log(`  monthly_snapshots: ${snapshotCount.rows[0].c}`);
console.log(`  recurring_items: ${recurringCount.rows[0].c}`);

local.close();
