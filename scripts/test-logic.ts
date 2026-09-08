import { normalizeEmail, normalizePhone } from "../src/lib/normalize";
import { isMonthOpen } from "../src/lib/phase-rules";
import { generateBookingCode } from "../src/lib/booking-code";
import { formatDate, dateStringToUtcMidnight, todayDateStringInTaipei } from "../src/lib/timezone";
import { createSessionToken, verifySessionToken, signForTesting } from "../src/lib/admin-session";

let pass = 0;
let fail = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}  → got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

console.log("normalize.ts — 電話正規化");
assertEqual(normalizePhone("0912-345-678"), "+886912345678", "本國格式 0912-345-678 → +886912345678");
assertEqual(normalizePhone("0912345678"), "+886912345678", "無分隔號 0912345678 → +886912345678");
assertEqual(normalizePhone("+886912345678"), "+886912345678", "已是國際格式，維持不變");
assertEqual(normalizePhone(" 0912 345 678 "), "+886912345678", "含空白也要正確去除");

console.log("\nnormalize.ts — Email 正規化");
assertEqual(normalizeEmail("  Test@Example.COM  "), "test@example.com", "trim + 轉小寫");
assertEqual(normalizeEmail("a@b.com"), "a@b.com", "已是小寫則不變");

console.log("\nphase-rules.ts — 分階段開放判斷");
const rules = [
  { openDate: "2026-10-01", appliesToMonth: "2026-10" },
  { openDate: "2026-10-20", appliesToMonth: "2026-11" },
  { openDate: "2026-11-20", appliesToMonth: "2026-12" }
];
assertEqual(isMonthOpen(rules, "2026-10", "2026-09-25"), false, "9/25 時，10月 尚未開放");
assertEqual(isMonthOpen(rules, "2026-10", "2026-10-01"), true, "10/1 當天，10月 開放");
assertEqual(isMonthOpen(rules, "2026-11", "2026-10-19"), false, "10/19 時，11月 尚未開放");
assertEqual(isMonthOpen(rules, "2026-11", "2026-10-20"), true, "10/20 當天，11月 開放");
assertEqual(isMonthOpen(rules, "2026-12", "2026-11-19"), false, "11/19 時，12月 尚未開放");
assertEqual(isMonthOpen(rules, "2026-12", "2026-11-20"), true, "11/20 當天，12月 開放");
assertEqual(isMonthOpen(rules, "2027-01", "2027-01-01"), false, "沒有對應規則的月份，預設不開放（安全預設）");

console.log("\nbooking-code.ts — 預約編號格式");
const sampleDate = dateStringToUtcMidnight("2026-10-15");
const code = generateBookingCode(sampleDate);
assertEqual(/^M\d{6}-\d{4}$/.test(code), true, `格式需符合 M+YYMMDD+4碼隨機（實際產生: ${code}）`);
assertEqual(code.startsWith("M261015-"), true, "日期部分需正確對應 2026-10-15 → 261015");

console.log("\ntimezone.ts — 時區換算");
assertEqual(formatDate(dateStringToUtcMidnight("2026-10-15"), "yyyy-MM-dd"), "2026-10-15", "日期字串轉換再格式化應該一致（不因時區偏移日期）");
assertEqual(formatDate(dateStringToUtcMidnight("2026-01-01"), "yyyy-MM-dd"), "2026-01-01", "跨年邊界也不偏移");
console.log(`  (今天在 Asia/Taipei 是 ${todayDateStringInTaipei()}，僅供人工確認，不斷言)`);

async function testAdminSession() {
  console.log("\nadmin-session.ts — 後台登入 session 簽章／驗證");

  const token = await createSessionToken("admin-123");
  const verified = await verifySessionToken(token);
  assertEqual(verified?.adminId, "admin-123", "正確簽章的 token 驗證通過，且能拿回 adminId");

  assertEqual(await verifySessionToken(null), null, "沒有 token 時視為未登入");
  assertEqual(await verifySessionToken("garbage"), null, "格式不對的 token 視為未登入");

  const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a");
  assertEqual(await verifySessionToken(tampered), null, "竄改過簽章的 token 必須被拒絕");

  const expiredButValidlySigned = await signForTesting("admin-123", Date.now() - 1000);
  assertEqual(
    await verifySessionToken(expiredButValidlySigned),
    null,
    "簽章合法但已過期的 token 必須被拒絕（不是靠簽章不符矇混過關）"
  );

  console.log(`\n共 ${pass + fail} 項，通過 ${pass}，失敗 ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

testAdminSession();
