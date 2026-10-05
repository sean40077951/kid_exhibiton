import { prisma } from "@/lib/prisma";
import { isPastCancelCutoff } from "@/lib/timezone";

export class CancelError extends Error {
  constructor(
    public code: "NOT_FOUND" | "ALREADY_CANCELLED" | "PAST_CANCEL_CUTOFF",
    message: string
  ) {
    super(message);
  }
}

// 取消預約：預約標記為 cancelled（保留紀錄，不刪除），並把名額還給場次。
// 後台取消（src/app/api/admin/bookings/[id]/cancel）與使用者從確認信連結自助取消
// （src/app/api/cancel）共用這支，名額邏輯只維護一份。
//
// 還名額的做法：先鎖住該場次那一列，再用「上限 - 目前未取消的預約人數」直接重算 remaining，
// 而不是 remaining + headcount。原因跟後台調整人數上限一樣：上限被調到低於已預約人數時
// remaining 會被夾到 0，直接加回去會多算名額。先鎖場次列是因為前台預約也是先更新場次列再寫入預約，
// 鎖住之後能保證重算時看得到剛成立的預約，不會被同時進來的預約蓋掉。
//
// enforceUserCutoff：使用者自助取消才需要檢查「場次開始前 N 分鐘內不能取消」，後台取消不受限。
export async function cancelBookingById(id: string, opts: { enforceUserCutoff: boolean }) {
  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, include: { session: true } });
      if (!booking) throw new CancelError("NOT_FOUND", "找不到這筆預約");

      if (opts.enforceUserCutoff && isPastCancelCutoff(booking.session.date, booking.session.timeSlot)) {
        throw new CancelError("PAST_CANCEL_CUTOFF", "已超過可取消的時間，如需協助請洽現場工作人員");
      }

      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${booking.sessionId} FOR UPDATE`;

      // 條件式更新：兩邊同時按取消時，只有一邊會更新到，避免名額重複歸還。
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: { not: "cancelled" } },
        data: { status: "cancelled" }
      });
      if (updated.count === 0) throw new CancelError("ALREADY_CANCELLED", "這筆預約已經取消過了");

      const booked = await tx.booking.aggregate({
        where: { sessionId: booking.sessionId, status: { not: "cancelled" } },
        _sum: { headcount: true }
      });
      const remaining = Math.max(0, booking.session.capacity - (booked._sum.headcount ?? 0));
      await tx.session.update({ where: { id: booking.sessionId }, data: { remaining } });

      return { id: booking.id, status: "cancelled" as const, remaining };
    },
    { maxWait: 10000, timeout: 10000 }
  );
}
