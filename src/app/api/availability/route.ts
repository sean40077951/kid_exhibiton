import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight, formatDate, isPastBookingCutoff, todayDateStringInTaipei } from "@/lib/timezone";
import { isMonthOpen, type PhaseOpenRule } from "@/lib/phase-rules";

export const dynamic = "force-dynamic";

// 回傳某月份每一天的預約狀態，供 Step 1 月曆使用。
// status: closed（休館/未開放/超出展期）｜full（額滿）｜low（名額緊張）｜available（可預約）
export async function GET(req: NextRequest) {
  const monthStr = req.nextUrl.searchParams.get("month"); // yyyy-MM
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return NextResponse.json({ error: "缺少或格式錯誤的 month 參數（需 yyyy-MM）" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }

  const today = todayDateStringInTaipei();
  const rules = event.phaseOpenRules as PhaseOpenRule[];
  const monthOpen = isMonthOpen(rules, monthStr, today);

  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const rangeStartStr = formatDate(event.dateRangeStart, "yyyy-MM-dd");
  const rangeEndStr = formatDate(event.dateRangeEnd, "yyyy-MM-dd");

  const monthStart = dateStringToUtcMidnight(`${monthStr}-01`);
  const monthEnd = dateStringToUtcMidnight(
    `${monthStr}-${String(daysInMonth).padStart(2, "0")}`
  );

  const sessions = monthOpen
    ? await prisma.session.findMany({
        where: { eventId: event.id, date: { gte: monthStart, lte: monthEnd } },
        select: { date: true, timeSlot: true, remaining: true, capacity: true, isOpen: true }
      })
    : [];

  const byDate = new Map<string, { remaining: number; capacity: number; anyBookable: boolean }>();
  for (const s of sessions) {
    if (!s.isOpen) continue;

    const key = formatDate(s.date, "yyyy-MM-dd");
    const agg = byDate.get(key) ?? { remaining: 0, capacity: 0, anyBookable: false };

    // 場次開始前 15 分鐘自動停止預約（4-2）。這種場次不算進「可預約」的加總，
    // 但這天本身不算「額滿」——額滿是指名額被訂光，不是時間過了訂不到，
    // 兩者對使用者的意義不一樣，不能用同一個標籤。
    if (!isPastBookingCutoff(s.date, s.timeSlot)) {
      agg.remaining += s.remaining;
      agg.capacity += s.capacity;
      agg.anyBookable = true;
    }
    byDate.set(key, agg);
  }

  const days: Record<
    string,
    { status: "closed" | "full" | "low" | "available"; remaining?: number }
  > = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
    const weekday = new Date(`${dateStr}T12:00:00+08:00`).getDay();

    const inRange = dateStr >= rangeStartStr && dateStr <= rangeEndStr;
    const isClosedWeekday = weekday === event.closedWeekday;
    const inPast = dateStr < today;

    if (!inRange || isClosedWeekday || !monthOpen || inPast) {
      days[dateStr] = { status: "closed" };
      continue;
    }

    const agg = byDate.get(dateStr);
    // 沒有場次資料，或今天所有場次都已經過了「開始前 15 分鐘」的截止點
    // （例如已經是傍晚，今天場次全數截止）——這種情況顯示未開放，不是額滿。
    if (!agg || !agg.anyBookable) {
      days[dateStr] = { status: "closed" };
      continue;
    }
    if (agg.remaining <= 0) {
      days[dateStr] = { status: "full", remaining: 0 };
      continue;
    }

    const ratio = agg.capacity > 0 ? agg.remaining / agg.capacity : 0;
    days[dateStr] = {
      status: ratio <= 0.2 ? "low" : "available",
      remaining: agg.remaining
    };
  }

  return NextResponse.json({ month: monthStr, days });
}
