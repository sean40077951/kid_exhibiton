import { formatDate } from "./timezone";

// 預約編號規則尚未經業主確認（PROJECT_SPEC.md 第 5 節），這裡先用線稿上出現的格式：
// 前綴（預設 "M"）+ 場次日期 YYMMDD + "-" + 4 碼隨機碼，例如 M261015-5912。
// 動工前務必向業主確認正式規則，若不同，只需要改這個檔案，不影響其他程式碼。
export function generateBookingCode(sessionDate: Date, prefix = "M"): string {
  const yymmdd = formatDate(sessionDate, "yyMMdd");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${yymmdd}-${random}`;
}
