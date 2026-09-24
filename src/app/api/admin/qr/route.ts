import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { qrTokenForDate, resetQrGateCache } from "@/lib/qr-pass";
import { todayDateStringInTaipei } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// 某一天的現場 QR Code 內容（預設今天）。token 由日期算出，不存資料庫。
export async function GET(req: NextRequest) {
  const today = todayDateStringInTaipei();
  const date = req.nextUrl.searchParams.get("date") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date 格式錯誤（需 yyyy-MM-dd）" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }

  return NextResponse.json({
    date,
    today,
    path: `/enter?k=${qrTokenForDate(date)}`,
    gateEnabled: event.qrGateEnabled
  });
}

const bodySchema = z.object({ gateEnabled: z.boolean() });

// 開關「前台必須掃 QR Code 才能登記」。
export async function PATCH(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { qrGateEnabled: parsed.data.gateEnabled }
  });
  resetQrGateCache();

  return NextResponse.json({ gateEnabled: updated.qrGateEnabled });
}
