// 分階段開放預約排程（PROJECT_SPEC.md 第 4 節）
// event.phaseOpenRules 格式： [{ openDate: "2026-10-01", appliesToMonth: "2026-10" }, ...]
// 規則本身存在資料庫設定內，這裡只負責「依規則判斷某月份現在是否開放」，不寫死日期。

export type PhaseOpenRule = {
  openDate: string; // yyyy-MM-dd
  appliesToMonth: string; // yyyy-MM
};

export function isMonthOpen(
  rules: PhaseOpenRule[],
  monthStr: string, // yyyy-MM
  todayStr: string // yyyy-MM-dd，呼叫端請以 Asia/Taipei 的「今天」傳入
): boolean {
  const rule = rules.find((r) => r.appliesToMonth === monthStr);
  // 該月份沒有對應規則時，預設視為尚未開放（避免規則漏設定卻意外開放）。
  if (!rule) return false;
  return todayStr >= rule.openDate;
}
