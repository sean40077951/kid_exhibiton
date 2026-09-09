import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 布告欄文字後台可自行編輯（業主須知回覆 4-3）。
export async function GET() {
  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }
  return NextResponse.json({ id: event.id, bannerText: event.bannerText });
}

const bodySchema = z.object({
  bannerText: z.string().max(500, "布告欄文字太長，請控制在 500 字以內")
});

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "資料格式錯誤" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { bannerText: parsed.data.bannerText }
  });

  return NextResponse.json({ id: updated.id, bannerText: updated.bannerText });
}
