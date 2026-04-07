/**
 * Import funding data from ★資金繰り表＆利益計算.xlsx
 * Reads both "資金繰り表" (実績) and "資金繰り予定" (計画) sheets
 * and posts to /api/sync
 */
import ExcelJS from "exceljs";
import path from "path";

const EXCEL_PATH = path.join(
  process.env.USERPROFILE || "C:\\Users\\pc",
  "OneDrive - 株式会社ユニポール",
  "unipoll-ai",
  "03_イネーブルチーム",
  "01_ケイ",
  "★資金繰り表＆利益計算.xlsx"
);

const API_URL = "http://localhost:3001/api/sync";

// Map row labels to section + category
const INCOME_MAP = {
  "入札支援サービス": "operating_income",
  "案件獲得パートナー報酬": "operating_income",
  "選管実務支援": "operating_income",
  "全戸配布支援": "operating_income",
  "研修サービス": "operating_income",
  "事前審査代行": "operating_income",
  "選管コンサル": "operating_income",
  "Opsデザイン": "operating_income",
  "UniPollクルー": "operating_income",
  "アウトリーチ": "operating_income",
  "コンシェルジュ": "operating_income",
  "差異調整（現金タイミング）": "operating_income",
  "差異調整": "operating_income",
};

const EXPENSE_MAP = {
  "役員報酬": "operating_expense",
  "給料賃金": "operating_expense",
  "通勤手当": "operating_expense",
  "賞与": "operating_expense",
  "法定福利費": "operating_expense",
  "広告宣伝費": "operating_expense",
  "接待交際費": "operating_expense",
  "旅費交通費": "operating_expense",
  "通信費": "operating_expense",
  "備品・消耗品費": "operating_expense",
  "地代家賃": "operating_expense",
  "支払手数料": "operating_expense",
  "会議費": "operating_expense",
  "福利厚生費": "operating_expense",
  "租税公課": "operating_expense",
  "支払報酬料": "operating_expense",
};

const INVEST_INCOME = ["固定資産の売却"];
const INVEST_EXPENSE = ["固定資産の取得", "保険積立金"];
const FINANCE_INCOME = ["アイメストグループ借入"];
const FINANCE_EXPENSE = ["○○銀行短期借入金返済(500万2021/3まで)"];

function getCellValue(cell) {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === "number") return cell;
  if (typeof cell === "object" && cell.result !== undefined) return cell.result || 0;
  if (typeof cell === "string") return parseInt(cell.replace(/,/g, ""), 10) || 0;
  return 0;
}

function getDateFromCell(cell) {
  if (cell instanceof Date) {
    const y = cell.getFullYear();
    const m = cell.getMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  }
  if (typeof cell === "string") {
    // "2025/4" format
    const match = cell.match(/(\d{4})\/(\d{1,2})/);
    if (match) return `${match[1]}-${String(match[2]).padStart(2, "0")}`;
  }
  return null;
}

async function importSheet(wb, sheetName, isActual) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    console.log(`Sheet "${sheetName}" not found, skipping.`);
    return;
  }

  console.log(`\n=== Processing: ${sheetName} (${isActual ? "実績" : "計画"}) ===`);

  // Row 3 has month headers starting from column 4
  const monthRow = ws.getRow(3);
  const months = [];
  for (let col = 4; col <= ws.columnCount; col++) {
    const val = monthRow.getCell(col).value;
    if (val === "合計" || val === null) break;
    const ym = getDateFromCell(val);
    if (ym) months.push({ col, year_month: ym });
  }

  console.log(`Found ${months.length} months:`, months.map(m => m.year_month).join(", "));

  const fundingItems = [];
  const fundingBalances = [];

  // Scan all rows to find data
  let currentSection = null; // track which section we're in

  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum <= 3) return;

    const col1 = String(row.getCell(1).value || "").trim();
    const col2 = String(row.getCell(2).value || "").trim();
    const col3 = String(row.getCell(3).value || "").trim();

    // Opening balance
    if (col1 === "月初繰越残高") {
      for (const { col, year_month } of months) {
        const val = getCellValue(row.getCell(col).value);
        if (val !== 0) {
          fundingBalances.push({ year_month, opening_balance: val });
        }
      }
      return;
    }

    // Track section context
    if (col1 === "経常収支" && col2 === "経常収入") currentSection = "income_start";
    if (col2 === "経常支出") currentSection = "expense_start";
    if (col1 === "投資収支") currentSection = "investing";
    if (col1 === "財務収支") currentSection = "financing";

    // Skip subtotal/total rows
    if (col3.startsWith("＜") || col2.startsWith("【") || col1.startsWith("【") || col1 === "次月繰越額") return;

    // Determine category from col3 (the actual line item name)
    const category = col3;
    if (!category) return;

    // Determine section
    let section = null;
    if (INCOME_MAP[category]) section = INCOME_MAP[category];
    else if (EXPENSE_MAP[category]) section = EXPENSE_MAP[category];
    else if (INVEST_INCOME.includes(category)) section = "investing_income";
    else if (INVEST_EXPENSE.includes(category)) section = "investing_expense";
    else if (FINANCE_INCOME.includes(category)) section = "financing_income";
    else if (FINANCE_EXPENSE.some(f => category.includes(f.substring(0, 10)))) section = "financing_expense";
    else if (currentSection === "income_start") section = "operating_income";
    else if (currentSection === "expense_start") section = "operating_expense";
    else if (currentSection === "investing" && col2.includes("収入")) section = "investing_income";
    else if (currentSection === "investing" && col2.includes("支出")) section = "investing_expense";
    else if (currentSection === "financing" && col2.includes("収入")) section = "financing_income";
    else if (currentSection === "financing" && col2.includes("支出")) section = "financing_expense";

    if (!section) return;

    // Read amounts for each month
    for (const { col, year_month } of months) {
      const amount = getCellValue(row.getCell(col).value);
      if (amount !== 0) {
        fundingItems.push({
          year_month,
          section,
          category,
          amount,
          is_actual: isActual,
        });
      }
    }
  });

  console.log(`Extracted: ${fundingItems.length} items, ${fundingBalances.length} balances`);

  // Post to sync API
  if (fundingItems.length > 0 || fundingBalances.length > 0) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        funding_items: fundingItems,
        funding_balances: fundingBalances,
      }),
    });
    const result = await res.json();
    console.log("Sync result:", result);
  }
}

async function main() {
  console.log("Reading:", EXCEL_PATH);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  // Import actual data (資金繰り表)
  await importSheet(wb, "資金繰り表", true);

  // Import forecast data (資金繰り予定)
  await importSheet(wb, "資金繰り予定", false);

  console.log("\nDone!");
}

main().catch(console.error);
