/**
 * 週次 管理会計アプリ sync スクリプト
 * freee trial_pl / trial_bs → localhost:3001/api/sync
 *
 * 実行方法:
 *   node scripts/weekly-sync.mjs
 *
 * Windows Task Scheduler での自動実行:
 *   タスク: 毎週月曜 07:57
 *   プログラム: node
 *   引数: C:\Users\pc\unipoll-finance-demo\scripts\weekly-sync.mjs
 */

import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

// ── 設定 ──────────────────────────────────────────────
const COMPANY_ID = 12566384;
const SYNC_URL = 'http://localhost:3001/api/sync';
const FISCAL_YEAR = 2026;

// freee-mcp のトークンファイルパス
const TOKEN_PATH = 'C:/Users/pc/.config/freee-mcp/tokens.json';
const CRED_PATH  = 'C:/Users/pc/AppData/Roaming/freee-mcp/credentials.json';

// is_fixed な勘定科目
const FIXED_CATEGORIES = new Set([
  '役員報酬', '給料手当', '法定福利費', '通信費', '地代家賃', '支払報酬料',
]);

// ── ユーティリティ ────────────────────────────────────
function getYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return { yearMonth: `${y}-${m}`, year: y, month: now.getMonth() + 1 };
}

async function refreshToken(tokenData) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const fs = require('fs');
  const creds = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));

  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: tokenData.refresh_token,
    }).toString();

    const req = https.request('https://accounts.secure.freee.co.jp/public_api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const newToken = JSON.parse(data);
        newToken.expires_at = Date.now() + newToken.expires_in * 1000;
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(newToken, null, 2));
        resolve(newToken.access_token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchFreee(path, params) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const fs = require('fs');

  let tokenData;
  try {
    tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  } catch {
    throw new Error(`freeeトークンが読み込めません。先にClaude Codeでfreee認証を行ってください。\nパス: ${TOKEN_PATH}`);
  }

  // トークン期限切れなら自動リフレッシュ
  let token;
  if (tokenData.expires_at && Date.now() > tokenData.expires_at - 60000) {
    console.log('  トークンをリフレッシュ中...');
    token = await refreshToken(tokenData);
  } else {
    token = tokenData.access_token;
  }

  const query = new URLSearchParams({ company_id: COMPANY_ID, ...params }).toString();
  const url = `https://api.freee.co.jp${path}?${query}`;

  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`freee API error: ${res.statusCode} ${data}`));
        else resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}

async function postSync(body) {
  const json = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

// ── メイン ────────────────────────────────────────────
async function main() {
  const { yearMonth, year, month } = getYearMonth();
  console.log(`\n▶ 週次sync開始: ${yearMonth}`);

  // trial_bs 取得
  console.log('  freee trial_bs 取得中...');
  const bsRes = await fetchFreee('/api/1/reports/trial_bs', {
    fiscal_year: year, start_month: month, end_month: month,
  });
  const bsBalances = bsRes.trial_bs?.balances ?? [];

  const findBs = (name) => bsBalances.find(b => b.account_item_name === name)?.closing_balance ?? 0;
  const cash        = findBs('現金');
  const bankBalance = bsBalances.find(b => b.account_item_id === 1033844704)?.closing_balance ?? findBs('普通預金');
  const receivables = findBs('売掛金');
  const payables    = findBs('未払金');
  const loanBalance = findBs('長期借入金');

  // 純資産・資産合計はhierarchy_level=1の合計行
  const totalAssets  = bsBalances.find(b => b.hierarchy_level === 1 && b.account_item_name?.includes('資産'))?.closing_balance ?? 0;
  const netAssets    = bsBalances.find(b => b.hierarchy_level === 1 && b.account_item_name?.includes('純資産'))?.closing_balance ?? 0;

  // trial_pl 取得
  console.log('  freee trial_pl 取得中...');
  const plRes = await fetchFreee('/api/1/reports/trial_pl', {
    fiscal_year: year, start_month: month, end_month: month,
  });
  const plBalances = plRes.trial_pl?.balances ?? [];

  const totalRevenue = plBalances.find(b => b.account_item_name === '売上高')?.closing_balance ?? 0;

  // 費用科目（hierarchy_level=2）
  const SKIP_NAMES = new Set(['売上高', '売上総利益', '営業利益', '経常利益', '税引前当期純利益', '当期純利益']);
  // 費用科目は hierarchy_level=3（勘定科目単位）
  const expenseItems = plBalances.filter(b =>
    b.hierarchy_level === 3 &&
    b.account_item_name &&
    b.closing_balance > 0 &&
    !SKIP_NAMES.has(b.account_item_name)
  );
  const totalExpense = expenseItems.reduce((s, b) => s + b.closing_balance, 0);
  const netIncome    = totalRevenue - totalExpense;

  const expenses = expenseItems.map(b => ({
    year_month: yearMonth,
    category: b.account_item_name,
    sub_category: '',
    amount: b.closing_balance,
    is_fixed: FIXED_CATEGORIES.has(b.account_item_name),
  }));

  // sync API へ送信
  console.log('  localhost:3001/api/sync へ送信中...');
  const result = await postSync({
    snapshot: {
      year_month: yearMonth,
      cash_balance: cash,
      bank_balance: bankBalance,
      accounts_receivable: receivables,
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      net_income: netIncome,
    },
    bs: {
      year_month: yearMonth,
      total_assets: totalAssets,
      cash,
      receivables_total: receivables,
      payables,
      loan_balance: loanBalance,
      net_assets: netAssets,
    },
    expenses,
  });

  if (result.ok) {
    const fmt = (n) => n.toLocaleString('ja-JP');
    console.log(`\n✅ 週次sync完了（${yearMonth}）`);
    console.log(`   売上: ${fmt(totalRevenue)}円 / 費用: ${fmt(totalExpense)}円 / GMO残高: ${fmt(bankBalance)}円`);
  } else {
    console.error('\n❌ syncエラー:', result.error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌ 実行エラー:', err.message);
  process.exit(1);
});
