import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight, isPastBookingCutoff } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// Step 2：列出某天的場次與即時剩餘名額。
export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get("date"); // yyyy-MM-dd
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "缺少或格式錯誤的 date 參數（需 yyyy-MM-dd）" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }

  const sessions = await prisma.session.findMany({
    where: { eventId: event.id, date: dateStringToUtcMidnight(dateStr), isOpen: true },
    orderBy: { timeSlot: "asc" },
    select: { id: true, timeSlot: true, capacity: true, remaining: true, date: true }
  });

  // 場次開始前 15 分鐘自動停止預約（4-2），過了截止時間就不列出來給人選。
  const bookable = sessions
    .filter((s) => !isPastBookingCutoff(s.date, s.timeSlot))
    .map(({ id, timeSlot, capacity, remaining }) => ({ id, timeSlot, capacity, remaining }));

  return NextResponse.json({ date: dateStr, sessions: bookable });
}
