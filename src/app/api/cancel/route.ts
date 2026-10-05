import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCancelToken } from "@/lib/cancel-token";
import { CancelError, cancelBookingById } from "@/lib/cancel-booking";
import { formatDate, isPastCancelCutoff } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const invalid = () =>
  NextResponse.json({ error: "取消連結無效，請使用確認信裡的連結", code: "INVALID_LINK" }, { status: 400 });

// 取消頁載入時查詢預約資訊（用確認信連結裡的 id + 簽章驗證，不用登入）。
// 只回顯示用的欄位，不回傳 E-mail 等個資。
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("b");
  const token = req.nextUrl.searchParams.get("t");
  if (!id || !isValidCancelToken(id, token)) return invalid();

  const booking = await prisma.booking.findUnique({ where: { id }, include: { session: true } });
  if (!booking) return invalid();

  return NextResponse.json({
    bookingCode: booking.bookingCode,
    name: booking.name,
    date: formatDate(booking.bookingDate, "yyyy-MM-dd"),
    timeSlot: booking.session.timeSlot,
    headcount: booking.headcount,
    cancelled: booking.status === "cancelled",
    canCancel: booking.status !== "cancelled" && !isPastCancelCutoff(booking.session.date, booking.session.timeSlot)
  });
}

// 按下「確認取消」才真的取消。刻意用 POST、不在 GET 取消：很多信箱／防毒軟體會預先掃描信裡的連結，
// 如果點連結本身就取消，會被機器人誤觸發。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = typeof body?.b === "string" ? body.b : null;
  const token = typeof body?.t === "string" ? body.t : null;
  if (!id || !isValidCancelToken(id, token)) return invalid();

  try {
    const r = await cancelBookingById(id, { enforceUserCutoff: true });
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    if (e instanceof CancelError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    }
    console.error("[cancel] 使用者取消預約失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
