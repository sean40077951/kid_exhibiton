import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  capacity: z.number().int().min(0).optional(),
  isOpen: z.boolean().optional()
});

// 手動調整場次人數上限／開放狀態（PROJECT_SPEC.md 第 7 節）。
// 邊界情況（第 3.5 節）：把上限改到低於目前已預約人數時，不影響已成立的預約，
// 剩餘名額直接夾到 0，之後新預約自然會被擋下（不需要另外寫規則）。
//
// remaining 一定要從「上限 - 實際已預約人數」直接算，不能用舊 remaining 加減差值。
// 差值算法在被夾到 0 那一刻就把「真正短缺多少」的資訊弄丟了，之後如果再把上限調回去，
// 算出來的 remaining 會對不上真正的剩餘名額（少算了先前夾掉的量）。
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
  }
  const { capacity, isOpen } = parsed.data;
  if (capacity === undefined && isOpen === undefined) {
    return NextResponse.json({ error: "沒有要更新的欄位" }, { status: 400 });
  }

  try {
    const { updated, booked } = await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({ where: { id: params.id } });
      if (!session) {
        throw new Error("NOT_FOUND");
      }

      const bookedSum = await tx.booking.aggregate({
        where: { sessionId: params.id, status: { not: "cancelled" } },
        _sum: { headcount: true }
      });
      const booked = bookedSum._sum.headcount ?? 0;

      const data: { capacity?: number; remaining?: number; isOpen?: boolean } = {};
      if (capacity !== undefined) {
        data.capacity = capacity;
        data.remaining = Math.max(0, capacity - booked);
      }
      if (isOpen !== undefined) {
        data.isOpen = isOpen;
      }

      const updated = await tx.session.update({ where: { id: params.id }, data });
      return { updated, booked };
    });

    return NextResponse.json({
      id: updated.id,
      timeSlot: updated.timeSlot,
      capacity: updated.capacity,
      remaining: updated.remaining,
      booked,
      isOpen: updated.isOpen
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "找不到此場次" }, { status: 404 });
    }
    console.error("[admin/sessions] 更新失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}

// 刪除場次。已經有人預約的場次不能刪，這種情況要請管理者改用「關閉」而不是刪除，
// 避免真的把已成立的預約資料弄不見。先主動查一次有沒有預約再刪，比較明確、不用
// 去猜資料庫外鍵錯誤會被 Prisma 包成哪種例外（不同情況實測發現不一定是 P2003）。
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingCount = await prisma.booking.count({ where: { sessionId: params.id } });
    if (bookingCount > 0) {
      return NextResponse.json(
        { error: "這個場次已經有人預約，無法刪除，請改用「關閉」讓它停止接受新預約" },
        { status: 409 }
      );
    }

    await prisma.session.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "找不到此場次" }, { status: 404 });
    }
    console.error("[admin/sessions] 刪除失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
