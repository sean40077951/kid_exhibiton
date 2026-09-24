import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

class CancelError extends Error {
  constructor(
    public code: "NOT_FOUND" | "ALREADY_CANCELLED",
    message: string
  ) {
    super(message);
  }
}

// 後台主動取消預約：預約標記為 cancelled（保留紀錄，不刪除），並把名額還給場次。
// 登入保護在 src/middleware.ts 統一擋。
//
// 還名額的做法：先鎖住該場次那一列，再用「上限 - 目前未取消的預約人數」直接重算 remaining，
// 而不是 remaining + headcount。原因跟後台調整人數上限一樣：上限被調到低於已預約人數時
// remaining 會被夾到 0，直接加回去會多算名額。先鎖場次列是因為前台預約也是先更新場次列再寫入預約，
// 鎖住之後能保證重算時看得到剛成立的預約，不會被同時進來的預約蓋掉。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({ where: { id: params.id } });
        if (!booking) throw new CancelError("NOT_FOUND", "找不到這筆預約");

        await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${booking.sessionId} FOR UPDATE`;

        // 條件式更新：兩位管理者同時按取消時，只有一邊會更新到，避免名額重複歸還。
        const updated = await tx.booking.updateMany({
          where: { id: booking.id, status: { not: "cancelled" } },
          data: { status: "cancelled" }
        });
        if (updated.count === 0) throw new CancelError("ALREADY_CANCELLED", "這筆預約已經取消過了");

        const session = await tx.session.findUniqueOrThrow({ where: { id: booking.sessionId } });
        const booked = await tx.booking.aggregate({
          where: { sessionId: session.id, status: { not: "cancelled" } },
          _sum: { headcount: true }
        });
        const remaining = Math.max(0, session.capacity - (booked._sum.headcount ?? 0));
        await tx.session.update({ where: { id: session.id }, data: { remaining } });

        return { id: booking.id, status: "cancelled", remaining };
      },
      { maxWait: 10000, timeout: 10000 }
    );
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof CancelError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    }
    console.error("[admin/bookings] 取消預約失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
