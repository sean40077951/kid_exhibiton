import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { PhaseOpenRule } from "@/lib/phase-rules";

export const dynamic = "force-dynamic";

// 展覽介紹與分階段開放日期，後台皆可自行編輯，
// 不用再麻煩工程師手動改資料庫（業主要求更有彈性，不要寫死在種子資料裡）。
export async function GET() {
  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }
  return NextResponse.json({
    id: event.id,
    introText: event.introText,
    phaseOpenRules: event.phaseOpenRules as PhaseOpenRule[]
  });
}

const bodySchema = z.object({
  introText: z.string().max(1000, "展覽介紹文字太長，請控制在 1000 字以內"),
  phaseOpenRules: z
    .array(
      z.object({
        openDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "開放日期格式錯誤，需為 yyyy-mm-dd"),
        appliesToMonth: z.string().regex(/^\d{4}-\d{2}$/, "對應月份格式錯誤，需為 yyyy-mm")
      })
    )
    .min(1, "至少要設定一筆分階段開放規則")
});

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "資料格式錯誤" }, { status: 400 });
  }

  const months = parsed.data.phaseOpenRules.map((r) => r.appliesToMonth);
  if (new Set(months).size !== months.length) {
    return NextResponse.json({ error: "同一個月份不能設定兩筆開放規則" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "asc" } });
  if (!event) {
    return NextResponse.json({ error: "尚未設定展會" }, { status: 404 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      introText: parsed.data.introText,
      phaseOpenRules: parsed.data.phaseOpenRules
    }
  });

  return NextResponse.json({
    id: updated.id,
    introText: updated.introText,
    phaseOpenRules: updated.phaseOpenRules as PhaseOpenRule[]
  });
}
