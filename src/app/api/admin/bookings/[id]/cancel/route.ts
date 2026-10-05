import { NextRequest, NextResponse } from "next/server";
import { CancelError, cancelBookingById } from "@/lib/cancel-booking";

export const dynamic = "force-dynamic";

// 後台主動取消預約（不受「開始前 1 小時」限制）。登入保護在 src/middleware.ts 統一擋。
// 取消與還名額的邏輯見 src/lib/cancel-booking.ts。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await cancelBookingById(params.id, { enforceUserCutoff: false }));
  } catch (e) {
    if (e instanceof CancelError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    }
    console.error("[admin/bookings] 取消預約失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
