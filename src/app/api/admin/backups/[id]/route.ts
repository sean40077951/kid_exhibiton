import { NextRequest, NextResponse } from "next/server";
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
