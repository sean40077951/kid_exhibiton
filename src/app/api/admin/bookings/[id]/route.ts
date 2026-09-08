import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  checkedIn: z.boolean()
});

// 手動標記到場狀態（PROJECT_SPEC.md 第 7 節）。
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
  }

  try {
    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: { checkedIn: parsed.data.checkedIn }
    });
    return NextResponse.json({ id: updated.id, checkedIn: updated.checkedIn });
  } catch (e) {
    console.error("[admin/bookings] 更新到場狀態失敗", e);
    return NextResponse.json({ error: "找不到此預約，或系統忙碌中請稍後再試" }, { status: 404 });
  }
}
