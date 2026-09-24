import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayDateStringInTaipei } from "@/lib/timezone";

// 現場 QR Code 門禁：業主改成「現場掃當天 QR Code 才能預約」。
// 每天的 token 是 HMAC(密鑰, 日期) 算出來的，不用存資料庫、也不用排程換新——
// 日期一跨過台北午夜，算出來的 token 就自動不一樣，昨天的 QR Code 和 cookie 一起失效。
// 後台可以事先算出任何一天的 token，讓現場人員提前印好隔天的 QR Code。
export const QR_PASS_COOKIE = "qr_pass";

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret-change-me";
}

export function qrTokenForDate(dateStr: string): string {
  return createHmac("sha256", secret()).update(`qr-pass:${dateStr}`).digest("base64url").slice(0, 22);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// 掃到的 token 只有「今天」的算數（提前印好的明天 QR Code 今天不能用）。
export function isValidTodayToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return safeEqual(token, qrTokenForDate(todayDateStringInTaipei()));
}

export function hasQrPass(req: NextRequest): boolean {
  return isValidTodayToken(req.cookies.get(QR_PASS_COOKIE)?.value);
}

// 到當天台北時間 24:00 為止的剩餘秒數，用來設定 cookie 壽命。
export function secondsUntilTaipeiMidnight(now: Date = new Date()): number {
  const next = new Date(`${todayDateStringInTaipei()}T00:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000;
  return Math.max(60, Math.floor((next - now.getTime()) / 1000));
}

// 門禁開關每個前台請求都要查，加 5 秒記憶體快取避免多一條 DB 查詢。
// 後台切換開關時會呼叫 resetQrGateCache()，同一個程序內立即生效。
let cache: { value: boolean; at: number } | null = null;
const CACHE_MS = 5000;

export function resetQrGateCache() {
  cache = null;
}

export async function isQrGateEnabled(): Promise<boolean> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" }, select: { qrGateEnabled: true } });
  cache = { value: event?.qrGateEnabled ?? false, at: Date.now() };
  return cache.value;
}

// 門禁有開、且請求沒有今天的通行 cookie → 回 true（要擋）。
export async function isBlockedByQrGate(req: NextRequest): Promise<boolean> {
  if (!(await isQrGateEnabled())) return false;
  return !hasQrPass(req);
}
