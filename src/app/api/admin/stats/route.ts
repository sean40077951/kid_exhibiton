import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight, formatDate, todayDateStringInTaipei } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const MAX_DAYS = 120;

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 統計報表：依日期區間統計每天、每個場次的登記人次與預約率。登入保護在 src/middleware.ts 統一擋。
//
// 名詞定義（畫面上也有寫）：
//  - 登記人次＝未取消預約的 headcount 加總（一筆預約 3 人算 3 人次）；取消的另外列出，不算進人次
//  - 計入名額的場次＝開放中的場次，或已關閉但已經有人登記的場次（後台規定有人預約的場次只能「關閉」不能刪，
//    這種場次的人次不能不算）；沒人登記又被關閉的場次（例如臨時休館）不計入名額，免得把預約率拉低
//  - 預約率＝登記人次 ÷ 計入名額
export async function GET(req: NextRequest) {
  const today = todayDateStringInTaipei();
  const endDate = req.nextUrl.searchParams.get("endDate") ?? today;
  const startDate = req.nextUrl.searchParams.get("startDate") ?? shiftDate(endDate, -13);

  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(startDate) || !re.test(endDate)) {
    return NextResponse.json({ error: "日期格式錯誤（需 yyyy-MM-dd）" }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "起始日期不能晚於結束日期" }, { status: 400 });
  }
  const spanDays = (Date.parse(endDate) - Date.parse(startDate)) / 86400000 + 1;
  if (spanDays > MAX_DAYS) {
    return NextResponse.json({ error: `一次最多查詢 ${MAX_DAYS} 天` }, { status: 400 });
  }

  const sessions = await prisma.session.findMany({
    where: { date: { gte: dateStringToUtcMidnight(startDate), lte: dateStringToUtcMidnight(endDate) } },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
    select: { id: true, date: true, timeSlot: true, capacity: true, isOpen: true }
  });

  const grouped = await prisma.booking.groupBy({
    by: ["sessionId", "status"],
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    _sum: { headcount: true },
    _count: { _all: true }
  });
  const stat = new Map<string, { people: number; count: number; cancelledPeople: number; cancelledCount: number }>();
  for (const g of grouped) {
    const cur = stat.get(g.sessionId) ?? { people: 0, count: 0, cancelledPeople: 0, cancelledCount: 0 };
    if (g.status === "cancelled") {
      cur.cancelledPeople += g._sum.headcount ?? 0;
      cur.cancelledCount += g._count._all;
    } else {
      cur.people += g._sum.headcount ?? 0;
      cur.count += g._count._all;
    }
    stat.set(g.sessionId, cur);
  }

  type Row = { timeSlot: string; capacity: number; isOpen: boolean; counted: boolean; people: number; count: number; cancelledCount: number };
  type Day = {
    date: string;
    sessionCount: number;
    capacity: number;
    people: number;
    count: number;
    cancelledCount: number;
    sessions: Row[];
  };
  const days = new Map<string, Day>();

  for (const s of sessions) {
    const st = stat.get(s.id) ?? { people: 0, count: 0, cancelledPeople: 0, cancelledCount: 0 };
    const counted = s.isOpen || st.people > 0;
    const date = formatDate(s.date, "yyyy-MM-dd");
    const day = days.get(date) ?? { date, sessionCount: 0, capacity: 0, people: 0, count: 0, cancelledCount: 0, sessions: [] };
    day.sessions.push({
      timeSlot: s.timeSlot,
      capacity: s.capacity,
      isOpen: s.isOpen,
      counted,
      people: st.people,
      count: st.count,
      cancelledCount: st.cancelledCount
    });
    if (counted) {
      day.sessionCount += 1;
      day.capacity += s.capacity;
    }
    day.people += st.people;
    day.count += st.count;
    day.cancelledCount += st.cancelledCount;
    days.set(date, day);
  }

  const dayList = Array.from(days.values());
  const total = dayList.reduce(
    (a, d) => ({
      days: a.days + 1,
      sessionCount: a.sessionCount + d.sessionCount,
      capacity: a.capacity + d.capacity,
      people: a.people + d.people,
      count: a.count + d.count,
      cancelledCount: a.cancelledCount + d.cancelledCount
    }),
    { days: 0, sessionCount: 0, capacity: 0, people: 0, count: 0, cancelledCount: 0 }
  );

  return NextResponse.json({ startDate, endDate, total, days: dayList });
}
