import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight, formatDate } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// 登入保護在 src/middleware.ts 統一擋（比對 /api/admin/:path* 這裡不用重複判斷）。
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
