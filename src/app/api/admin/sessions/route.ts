import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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

const createBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式錯誤，需為 yyyy-mm-dd"),
  timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時段格式錯誤，需為 HH:mm（例如 14:30）"),
  capacity: z.number().int().min(0, "人數上限需為 0 以上的整數")
});

// 後台新增場次（場次管理頁，除了開關、調上限，也要能直接新增一個時段）。
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "資料格式錯誤" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }

  try {
    const session = await prisma.session.create({
      data: {
        eventId: event.id,
        date: dateStringToUtcMidnight(parsed.data.date),
        timeSlot: parsed.data.timeSlot,
        capacity: parsed.data.capacity,
        remaining: parsed.data.capacity,
        isOpen: true
      }
    });
    return NextResponse.json({
      id: session.id,
      timeSlot: session.timeSlot,
      capacity: session.capacity,
      remaining: session.remaining,
      booked: 0,
      isOpen: session.isOpen
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "這個日期已經有同樣時段的場次了" }, { status: 409 });
    }
    console.error("[admin/sessions] 新增場次失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
