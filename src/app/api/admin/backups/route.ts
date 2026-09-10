import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBackupSnapshot } from "@/lib/backup";

export const dynamic = "force-dynamic";

// 列表只回傳筆數統計，不含完整資料內容，避免清單頁一次把所有備份的完整資料都抓下來。
export async function GET() {
  const backups = await prisma.systemBackup.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, rowCounts: true }
  });
  return NextResponse.json({ backups });
}

// 手動立即備份一次（除了每天凌晨 3 點的自動排程，管理者也可以隨時手動觸發）。
export async function POST() {
  try {
    const backup = await createBackupSnapshot();
    return NextResponse.json({
      id: backup.id,
      createdAt: backup.createdAt,
      rowCounts: backup.rowCounts
    });
  } catch (e) {
    console.error("[admin/backups] 手動備份失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
