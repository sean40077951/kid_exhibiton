import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/booking-email";

export const dynamic = "force-dynamic";

// 後台手動重寄確認信（確認信寄失敗、或民眾說沒收到時使用）。登入保護在 src/middleware.ts 統一擋。
// 這支會等寄信結果才回應，讓管理者馬上看到成功或失敗原因。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const booking = await prisma.booking.findUnique({ where: { id: params.id }, select: { status: true } });
  if (!booking) return NextResponse.json({ error: "找不到這筆預約" }, { status: 404 });
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "這筆預約已經取消，不能重寄確認信" }, { status: 409 });
  }

  const result = await sendBookingConfirmation(params.id);
  if (result.status === "failed") {
    return NextResponse.json({ error: `寄送失敗：${result.error ?? "未知原因"}`, status: "failed" }, { status: 502 });
  }
  return NextResponse.json({ status: result.status });
}
