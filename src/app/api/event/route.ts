import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 每次即時查詢資料庫，避免 Next.js 在 build 時嘗試靜態預先渲染。
export const dynamic = "force-dynamic";

// 目前為單一展會的雛形，先取第一筆 Event。多展會／切換展期時再擴充為依網域或 slug 查詢。
export async function GET() {
  const event = await prisma.event.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (!event) {
    return NextResponse.json({ error: "尚未設定展會，請先執行 prisma:seed" }, { status: 404 });
  }

  return NextResponse.json({
    id: event.id,
    name: event.name,
    dateRangeStart: event.dateRangeStart,
    dateRangeEnd: event.dateRangeEnd,
    closedWeekday: event.closedWeekday,
    phaseOpenRules: event.phaseOpenRules,
    bannerText: event.bannerText,
    noticeText: event.noticeText,
    consentText: event.consentText,
    consentVersion: event.consentVersion
  });
}
