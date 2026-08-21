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
