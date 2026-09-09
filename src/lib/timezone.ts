import { formatInTimeZone, toZonedTime } from "date-fns-tz";

// 全系統時間運算一律以 Asia/Taipei 為準（PROJECT_SPEC.md 第 1、3.3 節）。
export const TAIPEI_TZ = "Asia/Taipei";

export function nowInTaipei(): Date {
  return toZonedTime(new Date(), TAIPEI_TZ);
}

export function formatDate(date: Date | string, pattern = "yyyy-MM-dd"): string {
  return formatInTimeZone(date, TAIPEI_TZ, pattern);
}

export function todayDateStringInTaipei(): string {
  return formatDate(new Date(), "yyyy-MM-dd");
}

// 將 "yyyy-MM-dd" 字串轉為當天台北午夜對應的 UTC Date，存入資料庫的 date 欄位使用。
export function dateStringToUtcMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+08:00`);
}

const BOOKING_CUTOFF_MINUTES = 15;

// 場次開始前 15 分鐘自動停止該場次預約（業主須知回覆 4-2）。
// 用「現在時間」跟「場次開始時間 - 15 分鐘」比較，即時計算，不需要排程去改資料庫欄位。
export function isPastBookingCutoff(sessionDate: Date, timeSlot: string, now: Date = new Date()): boolean {
  const dateStr = formatDate(sessionDate, "yyyy-MM-dd");
  const sessionStart = new Date(`${dateStr}T${timeSlot}:00+08:00`);
  const cutoff = new Date(sessionStart.getTime() - BOOKING_CUTOFF_MINUTES * 60 * 1000);
  return now >= cutoff;
}
