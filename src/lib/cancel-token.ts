import { createHmac, timingSafeEqual } from "crypto";

// 確認信裡「取消預約」連結用的簽章。token 由預約 id 加密鑰算出來，不用存資料庫（不用改資料庫結構），
// 沒有密鑰的人無法偽造別人預約的取消連結。密鑰沿用 ADMIN_SESSION_SECRET，用不同的前綴跟 QR 門禁區隔。
function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret-change-me";
}

export function cancelTokenFor(bookingId: string): string {
  return createHmac("sha256", secret()).update(`cancel-booking:${bookingId}`).digest("base64url").slice(0, 32);
}

export function isValidCancelToken(bookingId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(cancelTokenFor(bookingId));
  return a.length === b.length && timingSafeEqual(a, b);
}

// 信件裡的連結用哪個網址開頭。可用環境變數 APP_BASE_URL 覆蓋，沒設定就用正式網域。
export function cancelUrlFor(bookingId: string): string {
  const base = (process.env.APP_BASE_URL || "https://booking.hellomonster-ntpc.com").replace(/\/+$/, "");
  return `${base}/cancel?b=${encodeURIComponent(bookingId)}&t=${cancelTokenFor(bookingId)}`;
}
