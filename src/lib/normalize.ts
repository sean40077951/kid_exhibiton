// 電話與 Email 正規化，用於去重比對（PROJECT_SPEC.md 第 3.2 節）
// 資料庫唯一索引才是最後防線，這裡只是產生要拿去比對／儲存的正規化欄位。

export function normalizePhone(phone: string): string {
  const digitsAndPlus = phone.replace(/[\s-]/g, "");
  if (digitsAndPlus.startsWith("+886")) {
    return digitsAndPlus;
  }
  if (digitsAndPlus.startsWith("0")) {
    return `+886${digitsAndPlus.slice(1)}`;
  }
  return digitsAndPlus;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
