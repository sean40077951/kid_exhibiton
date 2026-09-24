import { NextRequest, NextResponse } from "next/server";
import { isValidTodayToken, QR_PASS_COOKIE, secondsUntilTaipeiMidnight } from "@/lib/qr-pass";

export const dynamic = "force-dynamic";

// 現場 QR Code 掃進來的入口：token 正確就發一張「今天有效」的通行 cookie，再導回首頁；
// 不正確（過期或亂填）導回首頁並帶 gate=invalid，首頁會顯示「QR Code 已失效」。
// 用相對路徑 Location 而不是 new URL(req.url)，避免在反向代理後面組出內部主機名。
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("k");

  if (!isValidTodayToken(token)) {
    return new NextResponse(null, { status: 302, headers: { Location: "/?gate=invalid" } });
  }

  const res = new NextResponse(null, { status: 302, headers: { Location: "/" } });
  res.cookies.set(QR_PASS_COOKIE, token as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: secondsUntilTaipeiMidnight()
  });
  return res;
}
