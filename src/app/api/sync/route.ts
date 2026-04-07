import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/sync - Update financial data
// Called by ケイ agent with freee data payload
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    // Upsert monthly snapshot
    if (body.snapshot) {
      const s = body.snapshot;
      db.prepare(`
        INSERT INTO monthly_snapshots (year_month, cash_balance, bank_balance, accounts_receivable, total_revenue, total_expense, net_income)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(year_month) DO UPDATE SET
          cash_balance = excluded.cash_balance,
          bank_balance = excluded.bank_balance,
          accounts_receivable = excluded.accounts_receivable,
          total_revenue = excluded.total_revenue,
          total_expense = excluded.total_expense,
          net_income = excluded.net_income,
          synced_at = datetime('now', 'localtime')
      `).run(s.year_month, s.cash_balance, s.bank_balance, s.accounts_receivable, s.total_revenue, s.total_expense, s.net_income);
    }

    // Upsert service P/L
    if (body.service_pl && Array.isArray(body.service_pl)) {
      const stmt = db.prepare(`
        INSERT INTO service_pl (year_month, service_name, revenue, cost, gross_profit)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(year_month, service_name) DO UPDATE SET
          revenue = excluded.revenue,
          cost = excluded.cost,
          gross_profit = excluded.gross_profit
      `);
      for (const pl of body.service_pl) {
        stmt.run(pl.year_month, pl.service_name, pl.revenue, pl.cost, pl.gross_profit);
      }
    }

    // Upsert expense breakdown (with optional sub_category)
    if (body.expenses && Array.isArray(body.expenses)) {
      const stmt = db.prepare(`
        INSERT INTO expense_breakdown (year_month, category, sub_category, amount, is_fixed)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(year_month, category, sub_category) DO UPDATE SET
          amount = excluded.amount,
          is_fixed = excluded.is_fixed
      `);
      for (const e of body.expenses) {
        stmt.run(e.year_month, e.category, e.sub_category || "", e.amount, e.is_fixed ? 1 : 0);
      }
    }

    // Upsert project profitability (auto-aggregated from freee tags × sections)
    if (body.project_pl && Array.isArray(body.project_pl)) {
      const stmt = db.prepare(`
        INSERT INTO project_profitability (year_month, municipality, service_name, revenue, cost, gross_profit, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(year_month, municipality, service_name) DO UPDATE SET
          revenue = excluded.revenue,
          cost = excluded.cost,
          gross_profit = excluded.gross_profit,
          notes = excluded.notes
      `);
      for (const p of body.project_pl) {
        const grossProfit = (p.revenue || 0) - (p.cost || 0);
        stmt.run(p.year_month, p.municipality, p.service_name, p.revenue || 0, p.cost || 0, grossProfit, p.notes || null);
      }
    }

    // Upsert funding items (資金繰り表)
    if (body.funding_items && Array.isArray(body.funding_items)) {
      const stmt = db.prepare(`
        INSERT INTO funding_items (year_month, section, category, sub_category, amount, is_actual, planned_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(year_month, section, category, sub_category) DO UPDATE SET
          amount = excluded.amount,
          is_actual = excluded.is_actual,
          planned_amount = excluded.planned_amount
      `);
      for (const f of body.funding_items) {
        stmt.run(f.year_month, f.section, f.category, f.sub_category || "", f.amount, f.is_actual ? 1 : 0, f.planned_amount ?? null);
      }
    }

    // Upsert funding balances (月初残高)
    if (body.funding_balances && Array.isArray(body.funding_balances)) {
      const stmt = db.prepare(`
        INSERT INTO funding_balances (year_month, opening_balance)
        VALUES (?, ?)
        ON CONFLICT(year_month) DO UPDATE SET opening_balance = excluded.opening_balance
      `);
      for (const b of body.funding_balances) {
        stmt.run(b.year_month, b.opening_balance);
      }
    }

    // Upsert receivables (入金予定) — due_date + source で重複判定
    if (body.receivables && Array.isArray(body.receivables)) {
      const stmt = db.prepare(`
        INSERT INTO receivables (due_date, source, service_name, amount, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(due_date, source) DO UPDATE SET
          service_name = excluded.service_name,
          amount = excluded.amount,
          notes = excluded.notes
      `);
      for (const r of body.receivables) {
        stmt.run(r.due_date, r.source, r.service_name || null, r.amount, r.status || "pending", r.notes || null);
      }
    }

    // Upsert BS snapshot
    if (body.bs) {
      const b = body.bs;
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
      `).run(b.year_month, b.total_assets, b.cash, b.receivables_total, b.payables, b.loan_balance, b.net_assets);
    }

    // Log sync
    const parts = [];
    if (body.snapshot) parts.push(`snapshot:${body.snapshot.year_month}`);
    if (body.service_pl) parts.push(`service_pl:${body.service_pl.length}`);
    if (body.expenses) parts.push(`expenses:${body.expenses.length}`);
    if (body.project_pl) parts.push(`project_pl:${body.project_pl.length}`);
    if (body.funding_items) parts.push(`funding_items:${body.funding_items.length}`);
    if (body.funding_balances) parts.push(`funding_balances:${body.funding_balances.length}`);
    if (body.receivables) parts.push(`receivables:${body.receivables.length}`);
    if (body.bs) parts.push(`bs:${body.bs.year_month}`);
    db.prepare("INSERT INTO sync_log (source, details) VALUES ('freee', ?)").run(
      `Synced: ${parts.join(', ') || 'no data'}`
    );

    return NextResponse.json({ ok: true, message: "Synced successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
