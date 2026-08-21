import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight, formatDate } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// 雛形版本：尚未接後台登入驗證，僅供本機開發預覽名單畫面用。
// TODO：正式上線前必須加上後台帳號驗證（PROJECT_SPEC.md 第 7 節）。
export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get("date");

  const bookings = await prisma.booking.findMany({
    where: dateStr ? { bookingDate: dateStringToUtcMidnight(dateStr) } : {},
    include: { session: { select: { timeSlot: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      name: b.name,
      phone: b.phone,
      email: b.email,
      headcount: b.headcount,
      date: formatDate(b.bookingDate, "yyyy-MM-dd"),
      timeSlot: b.session.timeSlot,
      status: b.status,
      checkedIn: b.checkedIn,
      createdAt: b.createdAt
    }))
  });
}
