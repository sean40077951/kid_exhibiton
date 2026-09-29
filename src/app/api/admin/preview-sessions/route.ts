import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight, isPastBookingCutoff } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// 後台「前台預覽」專用：跟 /api/sessions 邏輯完全一樣（同樣套用開放狀態與 15 分鐘截止規則），
// 差別只有不限制「必須是今天」——因為這支是要讓管理者提前檢查任何一天的場次資料排得對不對、
// 畫面會不會跑版。登入保護已在 src/middleware.ts 統一擋（比對 /api/admin/:path*），
// 一般使用者無法呼叫到這支 API，不會因此重新打開「可預約未來日期」那個漏洞。
export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get("date");
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

  const bookable = sessions
    .filter((s) => !isPastBookingCutoff(s.date, s.timeSlot))
    .map(({ id, timeSlot, capacity, remaining }) => ({ id, timeSlot, capacity, remaining }));

  return NextResponse.json({ date: dateStr, sessions: bookable });
}
