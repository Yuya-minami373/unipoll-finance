"use client";

import { useState } from "react";
import { yen } from "@/lib/format";
import type { FundingMonth, FundingItem, FundingWeek } from "@/lib/finance";

function getAmount(items: FundingItem[], category: string): number {
  const subs = items.filter((i) => i.category === category && i.sub_category !== "");
  if (subs.length > 0) return subs.reduce((s, i) => s + i.amount, 0);
  return items.filter((i) => i.category === category && i.sub_category === "").reduce((s, i) => s + i.amount, 0);
}

function getPlanned(items: FundingItem[], category: string): number | null {
  const roots = items.filter((i) => i.category === category && i.sub_category === "");
  if (roots.length > 0) return roots[0].planned_amount ?? null;
  return null;
}

function getSubs(items: FundingItem[], category: string): FundingItem[] {
  return items.filter((i) => i.category === category && i.sub_category !== "");
}

function AmountCell({ amount, type, bold, planned }: { amount: number; type: "income" | "expense" | "neutral"; bold?: boolean; planned?: number | null }) {
  if (amount === 0 && (planned === null || planned === undefined))
    return <td className="px-1 py-1 text-right text-slate-300 text-xs whitespace-nowrap">&mdash;</td>;
  const color = type === "income" ? "text-emerald-600" : type === "expense" ? "text-red-500" : "text-slate-800";
  const diff = planned != null ? amount - planned : null;
  const hasDiff = diff != null && diff !== 0;
  return (
    <td className={`px-1 py-1 text-right text-xs whitespace-nowrap ${bold ? "font-bold" : "font-medium"} ${color}`}
      title={hasDiff ? `計画: ${yen(planned!)} / 差異: ${diff! > 0 ? "+" : ""}${yen(diff!)}` : undefined}
    >
      {amount === 0 ? "\u2014" : yen(amount)}
      {hasDiff && (
        <span className={`block text-[9px] font-normal ${
          // For income: positive diff = good, for expense: negative diff = good
          type === "income" ? (diff! > 0 ? "text-emerald-500" : "text-red-400") :
          type === "expense" ? (diff! < 0 ? "text-emerald-500" : "text-red-400") :
          (diff! > 0 ? "text-emerald-500" : "text-red-400")
        }`}>
          {diff! > 0 ? "+" : ""}{yen(diff!)}
        </span>
      )}
    </td>
  );
}

function SubtotalRow({
  label,
  months,
  getValue,
  type,
}: {
  label: string;
  months: FundingMonth[];
  getValue: (m: FundingMonth) => number;
  type: "income" | "expense" | "neutral";
}) {
  const total = months.reduce((s, m) => s + getValue(m), 0);
  return (
    <tr className="bg-slate-50/80 border-t border-slate-200">
      <td className="px-2 py-1 text-xs font-semibold text-slate-600 whitespace-nowrap sticky left-0 bg-slate-50/80 z-10">
        {label}
      </td>
      {months.map((m) => {
        const val = getValue(m);
        const color =
          type === "income" ? "text-emerald-700" : type === "expense" ? "text-red-600" : val >= 0 ? "text-emerald-700" : "text-red-600";
        return (
          <td key={m.year_month} className={`px-1 py-1 text-right text-xs font-bold whitespace-nowrap ${color}`}>
            {yen(val)}
          </td>
        );
      })}
      <td className={`px-1 py-1 text-right text-xs font-bold whitespace-nowrap border-l border-slate-300 bg-slate-100 ${
        type === "income" ? "text-emerald-700" : type === "expense" ? "text-red-600" : total >= 0 ? "text-emerald-700" : "text-red-600"
      }`}>
        {yen(total)}
      </td>
    </tr>
  );
}

const DANGER_MONTHS = 2; // closing_balance < fixedCost × N ヶ月で警告

// Sub-category data from expense_breakdown: { "2026-01": { "通信費": [{ sub_category, amount }] } }
type ExpenseSubMap = Record<string, Record<string, Array<{ sub_category: string; amount: number }>>>;

export default function FundingView({
  fundingMonths,
  weeks,
  fixedCost,
  incomeCategories,
  expenseCategories,
  expenseSubCategories = {},
}: {
  fundingMonths: FundingMonth[];
  weeks: FundingWeek[];
  fixedCost: number;
  incomeCategories: string[];
  expenseCategories: string[];
  expenseSubCategories?: ExpenseSubMap;
}) {
  const [fy25Open, setFy25Open] = useState(false);
  const hasWeeklyWarning = weeks.some((w) => w.isWarning);

  // Collect extra categories
  const extraIncome = new Set<string>();
  const extraExpense = new Set<string>();
  for (const m of fundingMonths) {
    for (const item of m.operating_income) {
      if (!incomeCategories.includes(item.category)) extraIncome.add(item.category);
    }
    for (const item of m.operating_expense) {
      if (!expenseCategories.includes(item.category)) extraExpense.add(item.category);
    }
  }
  const allIncome = [...incomeCategories, ...extraIncome];
  const allExpense = [...expenseCategories, ...extraExpense];

  // Split by calendar year: 2026年度 = 2026-01〜2026-12, 2025年度 = 2025-04〜2025-12
  const fy2026Months = fundingMonths.filter((m) => m.year_month.startsWith("2026"));
  const fy2025Months = fundingMonths.filter((m) => m.year_month.startsWith("2025"));

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-black">資金繰り表</h1>
        <p className="text-sm text-slate-500 mt-0.5">月次の資金繰り実績・予定</p>
      </div>

      {fundingMonths.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">
          <p>資金繰りデータがありません。</p>
          <p className="mt-1 text-xs">sync API でデータを投入してください。</p>
        </div>
      ) : (
        <>
          {/* 2026年度 — main (Jan-Dec) */}
          <div>
            <h2 className="text-sm font-semibold text-slate-600 mb-2">2026年度（2026/1〜2026/12）</h2>
            {/* Desktop table */}
            <div className="card overflow-auto hidden md:block" style={{ maxHeight: "calc(100vh - 120px)" }}>
              <FundingTable months={fy2026Months} allIncome={allIncome} allExpense={allExpense} fixedCost={fixedCost} subMap={expenseSubCategories} />
            </div>
            {/* Mobile summary */}
            <div className="md:hidden space-y-3">
              {fy2026Months.map((m) => (
                <MobileCard key={m.year_month} m={m} fixedCost={fixedCost} />
              ))}
            </div>
          </div>

          {/* 2025年度 — collapsed reference (Jan-Mar) */}
          {fy2025Months.length > 0 && (
            <div>
              <button
                onClick={() => setFy25Open(!fy25Open)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-2"
              >
                <span className={`inline-block transition-transform ${fy25Open ? "rotate-90" : ""}`}>&#9654;</span>
                第1期（2025/4〜2025/12）
              </button>
              {fy25Open && (
                <>
                  <div className="card overflow-auto hidden md:block" style={{ maxHeight: "calc(100vh - 120px)" }}>
                    <FundingTable months={fy2025Months} allIncome={allIncome} allExpense={allExpense} fixedCost={fixedCost} subMap={expenseSubCategories} />
                  </div>
                  <div className="md:hidden space-y-3">
                    {fy2025Months.map((m) => (
                      <MobileCard key={m.year_month} m={m} fixedCost={fixedCost} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Weekly outlook */}
      {weeks.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">週次残高推移（8週間先）</h2>
            {hasWeeklyWarning && (
              <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                固定費1ヶ月分（{yen(fixedCost)}）を下回る週あり
              </span>
            )}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap min-w-[90px]">週</th>
                  <th className="px-2 py-2 text-right text-slate-500 font-medium whitespace-nowrap min-w-[80px]">期首</th>
                  <th className="px-2 py-2 text-right text-slate-500 font-medium whitespace-nowrap min-w-[80px]">入金</th>
                  <th className="px-2 py-2 text-right text-slate-500 font-medium whitespace-nowrap min-w-[80px]">支出</th>
                  <th className="px-2 py-2 text-right text-slate-500 font-medium whitespace-nowrap min-w-[80px]">期末</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${w.isWarning ? "bg-red-50/50" : ""}`}>
                    <td className="px-3 py-1.5 font-medium text-slate-800 whitespace-nowrap">
                      {w.label} {w.isWarning && <span className="text-red-500">!</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600 whitespace-nowrap">{yen(w.openBalance)}</td>
                    <td className="px-2 py-1.5 text-right text-emerald-600 font-medium whitespace-nowrap">
                      {w.inflows > 0 ? yen(w.inflows) : "\u2014"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-red-500 font-medium whitespace-nowrap">
                      {w.outflows > 0 ? yen(w.outflows) : "\u2014"}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold whitespace-nowrap ${w.isWarning ? "text-red-600" : "text-black"}`}>
                      {yen(w.closeBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Mobile month card */
function MobileCard({ m, fixedCost }: { m: FundingMonth; fixedCost: number }) {
  const isDanger = m.closing_balance < fixedCost * DANGER_MONTHS;
  return (
    <div className={`card p-3 ${isDanger ? "ring-2 ring-red-300" : ""}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800">{m.label}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              m.is_actual ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-600"
            }`}
          >
            {m.is_actual ? "実績" : "計画"}
          </span>
          {isDanger && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">⚠ 要注意</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">月初残高</span>
          <p className="font-medium text-blue-700">{yen(m.opening_balance)}</p>
        </div>
        <div>
          <span className="text-slate-500">次月繰越</span>
          <p className={`font-bold ${isDanger ? "text-red-600" : m.closing_balance >= 0 ? "text-blue-700" : "text-red-600"}`}>
            {yen(m.closing_balance)}
          </p>
        </div>
        <div>
          <span className="text-slate-500">経常収入</span>
          <p className="font-medium text-emerald-600">{yen(m.operating_income_total)}</p>
        </div>
        <div>
          <span className="text-slate-500">経常支出</span>
          <p className="font-medium text-red-500">{yen(m.operating_expense_total)}</p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs">
        <span className="text-slate-500">合計収支</span>
        <span className={`font-bold ${m.total_net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {yen(m.total_net)}
        </span>
      </div>
    </div>
  );
}

/** Expandable income row with sub-category drill-down */
function IncomeRow({
  cat, months, total, totalCol, hasSubs,
}: { cat: string; months: FundingMonth[]; total: number; totalCol: string; hasSubs: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const allSubsSet = new Set<string>();
  if (hasSubs) {
    for (const m of months) getSubs(m.operating_income, cat).forEach((s) => allSubsSet.add(s.sub_category));
  }
  // 金額昇順でソート（同額の場合はDBの挿入順を維持）
  const allSubs = [...allSubsSet].sort((a, b) => {
    const totalA = months.reduce((s, m) => s + (getSubs(m.operating_income, cat).find((i) => i.sub_category === a)?.amount ?? 0), 0);
    const totalB = months.reduce((s, m) => s + (getSubs(m.operating_income, cat).find((i) => i.sub_category === b)?.amount ?? 0), 0);
    return totalA - totalB;
  });

  return (
    <>
      <tr
        className={`border-b border-slate-100 ${hasSubs ? "cursor-pointer hover:bg-emerald-50/30" : "hover:bg-slate-50/50"}`}
        onClick={hasSubs ? () => setExpanded(!expanded) : undefined}
      >
        <td className="pl-3 pr-1 py-1 text-black font-medium whitespace-nowrap sticky left-0 bg-white z-10">
          <span className={`inline-block w-3 text-[9px] text-slate-400 transition-transform ${hasSubs ? (expanded ? "rotate-90" : "") : "invisible"}`}>&#9654;</span>
          {cat}
        </td>
        {months.map((m) => (
          <AmountCell key={m.year_month} amount={getAmount(m.operating_income, cat)} type="income" planned={m.is_actual ? getPlanned(m.operating_income, cat) : undefined} />
        ))}
        <td className={`px-1 py-1 text-right font-bold text-emerald-600 whitespace-nowrap ${totalCol}`}>{yen(total)}</td>
      </tr>
      {expanded && [...allSubs].map((sub) => {
        const subTotal = months.reduce((s, m) => s + (getSubs(m.operating_income, cat).find((i) => i.sub_category === sub)?.amount ?? 0), 0);
        return (
          <tr key={`${cat}-${sub}`} className="border-b border-slate-50 bg-slate-50/30">
            <td className="pl-7 pr-1 py-0.5 text-[11px] text-black font-medium whitespace-nowrap sticky left-0 bg-slate-50/30 z-10">{sub}</td>
            {months.map((m) => {
              const amt = getSubs(m.operating_income, cat).find((i) => i.sub_category === sub)?.amount ?? 0;
              return <td key={m.year_month} className="px-1 py-0.5 text-right text-[11px] text-black whitespace-nowrap">{amt === 0 ? "\u2014" : yen(amt)}</td>;
            })}
            <td className={`px-1 py-0.5 text-right text-[11px] font-medium text-black whitespace-nowrap ${totalCol}`}>{subTotal === 0 ? "\u2014" : yen(subTotal)}</td>
          </tr>
        );
      })}
    </>
  );
}

/** Expandable expense row with sub-category drill-down */
function ExpenseRow({
  cat,
  months,
  total,
  totalCol,
  hasSubs,
  subMap,
}: {
  cat: string;
  months: FundingMonth[];
  total: number;
  totalCol: string;
  hasSubs: boolean;
  subMap: ExpenseSubMap;
}) {
  const [expanded, setExpanded] = useState(false);

  // Collect all sub-categories across months for this category
  const allSubs = new Set<string>();
  if (hasSubs) {
    for (const m of months) {
      const subs = subMap[m.year_month]?.[cat];
      if (subs) subs.forEach((s) => allSubs.add(s.sub_category));
      getSubs(m.operating_expense, cat).forEach((s) => allSubs.add(s.sub_category));
    }
  }

  return (
    <>
      <tr
        className={`border-b border-slate-100 ${hasSubs ? "cursor-pointer hover:bg-red-50/30" : "hover:bg-slate-50/50"}`}
        onClick={hasSubs ? () => setExpanded(!expanded) : undefined}
      >
        <td className="pl-3 pr-1 py-1 text-black font-medium whitespace-nowrap sticky left-0 bg-white z-10">
          <span className={`inline-block w-3 text-[9px] text-slate-400 transition-transform ${hasSubs ? (expanded ? "rotate-90" : "") : "invisible"}`}>&#9654;</span>
          {cat}
        </td>
        {months.map((m) => (
          <AmountCell key={m.year_month} amount={getAmount(m.operating_expense, cat)} type="expense" planned={m.is_actual ? getPlanned(m.operating_expense, cat) : undefined} />
        ))}
        <td className={`px-1 py-1 text-right font-bold text-red-500 whitespace-nowrap ${totalCol}`}>{yen(total)}</td>
      </tr>
      {expanded && [...allSubs].map((sub) => {
        const subTotal = months.reduce((s, m) => {
          const subMapItems = subMap[m.year_month]?.[cat];
          const subMapFound = subMapItems?.find((i) => i.sub_category === sub);
          const fundingFound = getSubs(m.operating_expense, cat).find((i) => i.sub_category === sub);
          return s + (subMapFound?.amount ?? fundingFound?.amount ?? 0);
        }, 0);
        return (
          <tr key={`${cat}-${sub}`} className="border-b border-slate-50 bg-slate-50/30">
            <td className="pl-7 pr-1 py-0.5 text-[11px] text-black font-medium whitespace-nowrap sticky left-0 bg-slate-50/30 z-10">{sub}</td>
            {months.map((m) => {
              const subMapItems = subMap[m.year_month]?.[cat];
              const subMapFound = subMapItems?.find((i) => i.sub_category === sub);
              const fundingFound = getSubs(m.operating_expense, cat).find((i) => i.sub_category === sub);
              const amt = subMapFound?.amount ?? fundingFound?.amount ?? 0;
              return (
                <td key={m.year_month} className="px-1 py-0.5 text-right text-[11px] text-black whitespace-nowrap">
                  {amt === 0 ? "\u2014" : yen(amt)}
                </td>
              );
            })}
            <td className={`px-1 py-0.5 text-right text-[11px] font-medium text-black whitespace-nowrap ${totalCol}`}>
              {subTotal === 0 ? "\u2014" : yen(subTotal)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

/** The funding table (desktop) — single label column with indent */
function FundingTable({
  months,
  allIncome,
  allExpense,
  fixedCost,
  subMap = {},
}: {
  months: FundingMonth[];
  allIncome: string[];
  allExpense: string[];
  fixedCost: number;
  subMap?: ExpenseSubMap;
}) {
  const dangerLine = fixedCost * DANGER_MONTHS;
  const catTotal = (items: (m: FundingMonth) => FundingItem[], cat: string) =>
    months.reduce((s, m) => s + getAmount(items(m), cat), 0);

  const totalCol = "border-l border-slate-300 bg-slate-50";

  return (
    <table className="w-full text-xs border-collapse table-fixed">
      <colgroup>
        <col className="w-[190px]" />
        {months.map((m) => (
          <col key={m.year_month} />
        ))}
        <col className="w-[76px]" />
      </colgroup>
      <thead>
        <tr className="bg-slate-800 text-white sticky top-0 z-20">
          <th className="px-1 py-1.5 text-center font-medium whitespace-nowrap sticky left-0 bg-slate-800 z-30">
            科目
          </th>
          {months.map((m) => (
            <th key={m.year_month} className="px-1 py-1.5 text-right font-medium whitespace-nowrap bg-slate-800">
              {m.label}
              <span className={`block text-[10px] font-normal ${m.is_actual ? "text-slate-300" : "text-amber-300"}`}>
                {m.is_actual ? "実績" : "計画"}
              </span>
            </th>
          ))}
          <th className="px-1 py-1.5 text-right font-medium whitespace-nowrap border-l border-slate-600 bg-slate-800">合計</th>
        </tr>
      </thead>
      <tbody>
        {/* Opening balance */}
        <tr className="bg-blue-50 border-b border-blue-200">
          <td className="px-2 py-1 font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-blue-50 z-10">月初繰越残高</td>
          {months.map((m) => (
            <td key={m.year_month} className="px-1 py-1 text-right font-bold text-blue-700 whitespace-nowrap">{yen(m.opening_balance)}</td>
          ))}
          <td className={`px-1 py-1 text-right text-slate-300 whitespace-nowrap ${totalCol}`}>&mdash;</td>
        </tr>

        {/* ── 経常収支 ── */}
        <tr className="bg-emerald-50/60">
          <td className="px-2 py-1 font-semibold text-emerald-700 whitespace-nowrap sticky left-0 bg-emerald-50/60 z-10">経常収支</td>
          {months.map((m) => (<td key={m.year_month} />))}
          <td className={totalCol} />
        </tr>

        {/* 経常収入 (sub-header) */}
        <tr className="bg-emerald-50/30">
          <td className="pl-2 pr-1 py-1 font-medium text-emerald-600 whitespace-nowrap sticky left-0 bg-emerald-50/30 z-10">経常収入</td>
          {months.map((m) => (<td key={m.year_month} />))}
          <td className={totalCol} />
        </tr>
        {allIncome.map((cat) => {
          const hasAny = months.some((m) => getAmount(m.operating_income, cat) > 0 || getPlanned(m.operating_income, cat) !== null);
          if (!hasAny) return null;
          const total = catTotal((m) => m.operating_income, cat);
          const hasSubs = months.some((m) => getSubs(m.operating_income, cat).length > 0);
          return <IncomeRow key={cat} cat={cat} months={months} total={total} totalCol={totalCol} hasSubs={hasSubs} />;
        })}
        <SubtotalRow label="　＜経常収入計＞" months={months} getValue={(m) => m.operating_income_total} type="income" />

        {/* 経常支出 (sub-header) */}
        <tr className="bg-red-50/30">
          <td className="pl-2 pr-1 py-1 font-medium text-red-500 whitespace-nowrap sticky left-0 bg-red-50/30 z-10">経常支出</td>
          {months.map((m) => (<td key={m.year_month} />))}
          <td className={totalCol} />
        </tr>
        {allExpense.map((cat) => {
          const hasAny = months.some((m) => getAmount(m.operating_expense, cat) > 0 || getPlanned(m.operating_expense, cat) !== null);
          if (!hasAny) return null;
          const total = catTotal((m) => m.operating_expense, cat);
          // Check if any month has sub-category data (subMap or funding_items.sub_category)
          const hasSubs = months.some((m) => subMap[m.year_month]?.[cat]?.length || getSubs(m.operating_expense, cat).length > 0);
          return (
            <ExpenseRow
              key={cat}
              cat={cat}
              months={months}
              total={total}
              totalCol={totalCol}
              hasSubs={hasSubs}
              subMap={subMap}
            />
          );
        })}
        <SubtotalRow label="　＜経常支出計＞" months={months} getValue={(m) => m.operating_expense_total} type="expense" />
        <SubtotalRow label="【経常収支計】" months={months} getValue={(m) => m.operating_net} type="neutral" />

        {/* ── 投資収支 ── */}
        {months.some((m) => m.investing_income.length > 0 || m.investing_expense.length > 0) && (
          <>
            <tr className="bg-slate-50/50">
              <td className="px-2 py-1 font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50/50 z-10">投資収支</td>
              {months.map((m) => (<td key={m.year_month} />))}
              <td className={totalCol} />
            </tr>
            {(() => {
              const cats = new Set<string>();
              months.forEach((m) => m.investing_income.forEach((i) => cats.add(i.category)));
              return [...cats].map((cat) => {
                const total = catTotal((m) => m.investing_income, cat);
                return (
                  <tr key={`inv-in-${cat}`} className="border-b border-slate-100">
                    <td className="pl-3 pr-1 py-1 text-black font-medium whitespace-nowrap sticky left-0 bg-white z-10">{cat}</td>
                    {months.map((m) => (
                      <AmountCell key={m.year_month} amount={getAmount(m.investing_income, cat)} type="income" />
                    ))}
                    <td className={`px-1 py-1 text-right font-bold text-emerald-600 whitespace-nowrap ${totalCol}`}>{yen(total)}</td>
                  </tr>
                );
              });
            })()}
            {(() => {
              const cats = new Set<string>();
              months.forEach((m) => m.investing_expense.forEach((i) => cats.add(i.category)));
              return [...cats].map((cat) => {
                const total = catTotal((m) => m.investing_expense, cat);
                return (
                  <tr key={`inv-ex-${cat}`} className="border-b border-slate-100">
                    <td className="pl-3 pr-1 py-1 text-black font-medium whitespace-nowrap sticky left-0 bg-white z-10">{cat}</td>
                    {months.map((m) => (
                      <AmountCell key={m.year_month} amount={getAmount(m.investing_expense, cat)} type="expense" />
                    ))}
                    <td className={`px-1 py-1 text-right font-bold text-red-500 whitespace-nowrap ${totalCol}`}>{yen(total)}</td>
                  </tr>
                );
              });
            })()}
            <SubtotalRow label="＜投資収支計＞" months={months} getValue={(m) => m.investing_net} type="neutral" />
          </>
        )}

        {/* ── 財務収支 ── */}
        {months.some((m) => m.financing_income.length > 0 || m.financing_expense.length > 0) && (
          <>
            <tr className="bg-slate-50/50">
              <td className="px-2 py-1 font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50/50 z-10">財務収支</td>
              {months.map((m) => (<td key={m.year_month} />))}
              <td className={totalCol} />
            </tr>
            {(() => {
              const cats = new Set<string>();
              months.forEach((m) => m.financing_income.forEach((i) => cats.add(i.category)));
              return [...cats].map((cat) => {
                const total = catTotal((m) => m.financing_income, cat);
                return (
                  <tr key={`fin-in-${cat}`} className="border-b border-slate-100">
                    <td className="pl-3 pr-1 py-1 text-black font-medium whitespace-nowrap sticky left-0 bg-white z-10">{cat}</td>
                    {months.map((m) => (
                      <AmountCell key={m.year_month} amount={getAmount(m.financing_income, cat)} type="income" />
                    ))}
                    <td className={`px-1 py-1 text-right font-bold text-emerald-600 whitespace-nowrap ${totalCol}`}>{yen(total)}</td>
                  </tr>
                );
              });
            })()}
            {(() => {
              const cats = new Set<string>();
              months.forEach((m) => m.financing_expense.forEach((i) => cats.add(i.category)));
              return [...cats].map((cat) => {
                const total = catTotal((m) => m.financing_expense, cat);
                return (
                  <tr key={`fin-ex-${cat}`} className="border-b border-slate-100">
                    <td className="pl-3 pr-1 py-1 text-black font-medium whitespace-nowrap sticky left-0 bg-white z-10">{cat}</td>
                    {months.map((m) => (
                      <AmountCell key={m.year_month} amount={getAmount(m.financing_expense, cat)} type="expense" />
                    ))}
                    <td className={`px-1 py-1 text-right font-bold text-red-500 whitespace-nowrap ${totalCol}`}>{yen(total)}</td>
                  </tr>
                );
              });
            })()}
            <SubtotalRow label="＜財務収支計＞" months={months} getValue={(m) => m.financing_net} type="neutral" />
          </>
        )}

        {/* Total & Closing */}
        <tr className="bg-slate-100 border-t-2 border-slate-300">
          <td className="px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-slate-100 z-10">【合計収支】</td>
          {months.map((m) => (
            <td key={m.year_month} className={`px-1 py-1.5 text-right font-bold whitespace-nowrap ${m.total_net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {yen(m.total_net)}
            </td>
          ))}
          {(() => {
            const total = months.reduce((s, m) => s + m.total_net, 0);
            return (
              <td className={`px-1 py-1.5 text-right font-bold whitespace-nowrap border-l border-slate-300 bg-slate-200 ${total >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {yen(total)}
              </td>
            );
          })()}
        </tr>
        <tr className="bg-blue-50 border-t border-blue-200">
          <td className="px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-blue-50 z-10">次月繰越額</td>
          {months.map((m) => {
            const isDanger = m.closing_balance < dangerLine;
            return (
              <td key={m.year_month} className={`px-1 py-1.5 text-right font-bold whitespace-nowrap ${isDanger ? "text-red-600 bg-red-50" : m.closing_balance >= 0 ? "text-blue-700" : "text-red-600"}`}
                title={isDanger ? `⚠ 固定費${DANGER_MONTHS}ヶ月分（${yen(dangerLine)}）を下回っています` : undefined}
              >
                {yen(m.closing_balance)}
                {isDanger && <span className="block text-[9px] text-red-500 font-normal">⚠ 要注意</span>}
              </td>
            );
          })}
          <td className={`px-1 py-1.5 text-right text-slate-300 whitespace-nowrap ${totalCol}`}>&mdash;</td>
        </tr>

        {/* 予実差異行 — 実績月がある場合のみ表示 */}
        {months.some((m) => m.is_actual) && (
          <tr className="bg-amber-50 border-t-2 border-amber-200">
            <td className="px-2 py-1.5 font-bold text-amber-700 whitespace-nowrap sticky left-0 bg-amber-50 z-10">予実差異</td>
            {months.map((m) => {
              if (!m.is_actual) {
                return <td key={m.year_month} className="px-1 py-1.5 text-right text-slate-300 text-xs whitespace-nowrap">&mdash;</td>;
              }
              const diff = m.total_net - m.planned_net;
              return (
                <td key={m.year_month} className={`px-1 py-1.5 text-right text-xs font-bold whitespace-nowrap ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {diff > 0 ? "+" : ""}{yen(diff)}
                </td>
              );
            })}
            {(() => {
              const actualMonths = months.filter((m) => m.is_actual);
              const totalDiff = actualMonths.reduce((s, m) => s + (m.total_net - m.planned_net), 0);
              return (
                <td className={`px-1 py-1.5 text-right text-xs font-bold whitespace-nowrap border-l border-amber-300 bg-amber-100 ${totalDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {totalDiff > 0 ? "+" : ""}{yen(totalDiff)}
                </td>
              );
            })()}
          </tr>
        )}
      </tbody>
    </table>
  );
}
