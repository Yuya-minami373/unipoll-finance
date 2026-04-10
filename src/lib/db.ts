import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let initialized = false;

// Add columns to existing tables (safe to run multiple times)
async function runMigrations(c: Client) {
  try {
    await c.execute("SELECT scenario FROM recurring_items LIMIT 0");
  } catch {
    await c.execute("ALTER TABLE recurring_items ADD COLUMN scenario TEXT NOT NULL DEFAULT 'base'");
  }
}

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

async function initDb() {
  if (initialized) return;
  const c = getClient();

  // Quick check: if all tables exist, skip DDL but run migrations
  try {
    await c.execute("SELECT 1 FROM monthly_snapshots LIMIT 0");
    await c.execute("SELECT 1 FROM customer_ltv LIMIT 0");
    // Run column migrations for existing DBs
    await runMigrations(c);
    initialized = true;
    return;
  } catch {
    // Some table doesn't exist yet, run full DDL below
  }

  await c.batch(
    [
      // Monthly financial snapshots (synced from freee)
      {
        sql: `CREATE TABLE IF NOT EXISTS monthly_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL UNIQUE,
          cash_balance INTEGER NOT NULL DEFAULT 0,
          bank_balance INTEGER NOT NULL DEFAULT 0,
          accounts_receivable INTEGER NOT NULL DEFAULT 0,
          total_revenue INTEGER NOT NULL DEFAULT 0,
          total_expense INTEGER NOT NULL DEFAULT 0,
          net_income INTEGER NOT NULL DEFAULT 0,
          synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        args: [],
      },
      // Service-level P/L
      {
        sql: `CREATE TABLE IF NOT EXISTS service_pl (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL,
          service_name TEXT NOT NULL,
          revenue INTEGER NOT NULL DEFAULT 0,
          cost INTEGER NOT NULL DEFAULT 0,
          gross_profit INTEGER NOT NULL DEFAULT 0,
          UNIQUE(year_month, service_name)
        )`,
        args: [],
      },
      // Expense breakdown by category
      {
        sql: `CREATE TABLE IF NOT EXISTS expense_breakdown (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL,
          category TEXT NOT NULL,
          sub_category TEXT NOT NULL DEFAULT '',
          amount INTEGER NOT NULL DEFAULT 0,
          is_fixed INTEGER NOT NULL DEFAULT 0,
          UNIQUE(year_month, category, sub_category)
        )`,
        args: [],
      },
      // Recurring items for cash flow forecast
      {
        sql: `CREATE TABLE IF NOT EXISTS recurring_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          amount INTEGER NOT NULL,
          day_of_month INTEGER NOT NULL DEFAULT 25,
          is_active INTEGER NOT NULL DEFAULT 1,
          notes TEXT,
          scenario TEXT NOT NULL DEFAULT 'base'
        )`,
        args: [],
      },
      // App settings (key-value store)
      {
        sql: `CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        args: [],
      },
      // Seed default settings
      {
        sql: `INSERT OR IGNORE INTO app_settings (key, value) VALUES ('monthly_fixed_cost_estimate', '542000')`,
        args: [],
      },
      // Project-level profitability
      {
        sql: `CREATE TABLE IF NOT EXISTS project_profitability (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL,
          municipality TEXT NOT NULL,
          service_name TEXT NOT NULL,
          revenue INTEGER NOT NULL DEFAULT 0,
          cost INTEGER NOT NULL DEFAULT 0,
          gross_profit INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          UNIQUE(year_month, municipality, service_name)
        )`,
        args: [],
      },
      // Receivables (入金予定)
      {
        sql: `CREATE TABLE IF NOT EXISTS receivables (
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
        )`,
        args: [],
      },
      // Monthly funding items (資金繰り表の明細行)
      {
        sql: `CREATE TABLE IF NOT EXISTS funding_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL,
          section TEXT NOT NULL CHECK(section IN ('operating_income', 'operating_expense', 'investing_income', 'investing_expense', 'financing_income', 'financing_expense')),
          category TEXT NOT NULL,
          sub_category TEXT NOT NULL DEFAULT '',
          amount INTEGER NOT NULL DEFAULT 0,
          is_actual INTEGER NOT NULL DEFAULT 0,
          planned_amount INTEGER DEFAULT NULL,
          UNIQUE(year_month, section, category, sub_category)
        )`,
        args: [],
      },
      // Opening balance for funding table
      {
        sql: `CREATE TABLE IF NOT EXISTS funding_balances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL UNIQUE,
          opening_balance INTEGER NOT NULL DEFAULT 0
        )`,
        args: [],
      },
      // Balance sheet snapshot
      {
        sql: `CREATE TABLE IF NOT EXISTS bs_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL UNIQUE,
          total_assets INTEGER NOT NULL DEFAULT 0,
          cash INTEGER NOT NULL DEFAULT 0,
          receivables_total INTEGER NOT NULL DEFAULT 0,
          payables INTEGER NOT NULL DEFAULT 0,
          loan_balance INTEGER NOT NULL DEFAULT 0,
          net_assets INTEGER NOT NULL DEFAULT 0,
          synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        args: [],
      },
      // Monthly budgets
      {
        sql: `CREATE TABLE IF NOT EXISTS monthly_budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year_month TEXT NOT NULL,
          revenue_budget INTEGER NOT NULL DEFAULT 0,
          expense_budget INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          UNIQUE(year_month)
        )`,
        args: [],
      },
      // Sync log
      {
        sql: `CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          synced_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          source TEXT NOT NULL DEFAULT 'freee',
          status TEXT NOT NULL DEFAULT 'success',
          details TEXT
        )`,
        args: [],
      },
      // Customer LTV
      {
        sql: `CREATE TABLE IF NOT EXISTS customer_ltv (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          service_name TEXT NOT NULL,
          contract_type TEXT NOT NULL CHECK(contract_type IN ('recurring', 'one_time', 'variable')),
          monthly_amount INTEGER NOT NULL DEFAULT 0,
          annual_amount INTEGER NOT NULL DEFAULT 0,
          start_date TEXT,
          ltv_3y INTEGER NOT NULL DEFAULT 0,
          ltv_5y INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          notes TEXT,
          UNIQUE(customer_name, service_name)
        )`,
        args: [],
      },
    ],
    "write"
  );
  initialized = true;
}

export async function dbAll(sql: string, ...args: unknown[]) {
  await initDb();
  const result = await getClient().execute({ sql, args });
  return result.rows;
}

export async function dbGet(sql: string, ...args: unknown[]) {
  await initDb();
  const result = await getClient().execute({ sql, args });
  return result.rows[0] || null;
}

export async function dbRun(sql: string, ...args: unknown[]) {
  await initDb();
  const result = await getClient().execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid,
    changes: result.rowsAffected,
  };
}

export async function dbBatch(
  statements: Array<{ sql: string; args: unknown[] }>
) {
  await initDb();
  const results = await getClient().batch(
    statements.map((s) => ({ sql: s.sql, args: s.args })),
    "read"
  );
  return results.map((r) => r.rows);
}

export async function dbTransaction(
  fn: (tx: {
    execute: (sql: string, ...args: unknown[]) => Promise<{ rows: unknown[]; lastInsertRowid: bigint | undefined; changes: number }>;
  }) => Promise<void>
) {
  await initDb();
  const tx = await getClient().transaction("write");
  try {
    await fn({
      execute: async (sql: string, ...args: unknown[]) => {
        const result = await tx.execute({ sql, args });
        return {
          rows: result.rows as unknown[],
          lastInsertRowid: result.lastInsertRowid,
          changes: result.rowsAffected,
        };
      },
    });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
