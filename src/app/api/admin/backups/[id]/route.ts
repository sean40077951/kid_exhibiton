import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// 下載某一筆備份的完整內容（JSON 檔），需要時可以照這份資料手動比對或還原。
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const backup = await prisma.systemBackup.findUnique({ where: { id: params.id } });
  if (!backup) {
    return NextResponse.json({ error: "找不到這筆備份" }, { status: 404 });
  }

  const filename = `backup-${formatDate(backup.createdAt, "yyyy-MM-dd_HHmmss")}.json`;
  return new NextResponse(JSON.stringify(backup.data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`
    }
  });
}

// 刪除某一筆備份紀錄（單純清單管理用，跟「還原」無關，刪掉不影響正式資料）。
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.systemBackup.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "找不到這筆備份" }, { status: 404 });
    }
    console.error("[admin/backups] 刪除失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
