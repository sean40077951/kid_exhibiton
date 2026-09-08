import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// 登入保護在 src/middleware.ts 統一擋。
export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get("date");
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "缺少或格式錯誤的 date 參數（需 yyyy-MM-dd）" }, { status: 400 });
  }

  const sessions = await prisma.session.findMany({
    where: { date: dateStringToUtcMidnight(dateStr) },
    orderBy: { timeSlot: "asc" }
  });

  // 已預約人數要用 Booking 實際加總，不能用 capacity - remaining 反推——
  // 如果後台把上限調到低於已預約人數，remaining 會被夾到 0，這時候
  // capacity - remaining 會比真正的已預約人數少，畫面上會誤導管理者。
  const bookedSums = await prisma.booking.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    _sum: { headcount: true }
  });
  const bookedBySessionId = new Map(bookedSums.map((b) => [b.sessionId, b._sum.headcount ?? 0]));

  return NextResponse.json({
    date: dateStr,
    sessions: sessions.map((s) => ({
      id: s.id,
      timeSlot: s.timeSlot,
      capacity: s.capacity,
      remaining: s.remaining,
      booked: bookedBySessionId.get(s.id) ?? 0,
      isOpen: s.isOpen
    }))
  });
}
