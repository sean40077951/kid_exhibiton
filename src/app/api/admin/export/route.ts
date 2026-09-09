import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { dateStringToUtcMidnight, formatDate } from "@/lib/timezone";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

// Booking.status 目前的程式邏輯只會寫入 "confirmed"（見 src/app/api/bookings/route.ts），
// pending / cancelled 是資料庫欄位預留的可能值，目前沒有地方會真的寫入，先一併對照，
// 避免以後真的用到時匯出檔案漏翻。
const STATUS_LABEL: Record<string, string> = {
  confirmed: "已確認",
  pending: "處理中",
  cancelled: "已取消"
};

// 依日期區間（可等於單日）匯出，選填 sessionId 就是單場次匯出（PROJECT_SPEC.md 第 7 節）。
export async function GET(req: NextRequest) {
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const sessionId = req.nextUrl.searchParams.get("sessionId") || undefined;

  if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "請提供 startDate、endDate（格式 yyyy-MM-dd）" }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "起始日期不能晚於結束日期" }, { status: 400 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      bookingDate: { gte: dateStringToUtcMidnight(startDate), lte: dateStringToUtcMidnight(endDate) },
      ...(sessionId ? { sessionId } : {})
    },
    include: { session: { select: { timeSlot: true } } },
    orderBy: [{ bookingDate: "asc" }, { createdAt: "asc" }]
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("預約資料");

  // 每欄都設寬度，時間戳記這種容易被 Excel 顯示成 ### 的欄位才不會擠在一起；
  // 電話／日期／時間戳記一律用純文字寫入（不是數字或日期型別），Excel 開啟時不會
  // 把電話開頭的 0 吃掉，也不會因為時區重新解讀日期時間。
  sheet.columns = [
    { header: "預約編號", key: "bookingCode", width: 20 },
    { header: "姓名", key: "name", width: 14 },
    { header: "電話", key: "phone", width: 16, style: { numFmt: "@" } },
    { header: "信箱", key: "email", width: 26 },
    { header: "人數", key: "headcount", width: 8 },
    { header: "預約日期", key: "bookingDate", width: 14, style: { numFmt: "@" } },
    { header: "場次", key: "timeSlot", width: 10 },
    { header: "狀態", key: "status", width: 10 },
    { header: "預約時間戳記", key: "createdAt", width: 22, style: { numFmt: "@" } }
  ];
  sheet.getRow(1).font = { bold: true };

  for (const b of bookings) {
    sheet.addRow({
      bookingCode: b.bookingCode,
      name: b.name,
      phone: b.phone,
      email: b.email,
      headcount: b.headcount,
      bookingDate: formatDate(b.bookingDate, "yyyy-MM-dd"),
      timeSlot: b.session.timeSlot,
      status: STATUS_LABEL[b.status] ?? b.status,
      createdAt: formatDate(b.createdAt, "yyyy-MM-dd HH:mm:ss")
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  // 記錄「誰於何時匯出」（PROJECT_SPEC.md 第 7 節建議事項）。
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);
    const admin = session ? await prisma.admin.findUnique({ where: { id: session.adminId } }) : null;
    await prisma.adminExportLog.create({
      data: {
        adminEmail: admin?.email ?? "unknown",
        rangeStart: dateStringToUtcMidnight(startDate),
        rangeEnd: dateStringToUtcMidnight(endDate),
        sessionId: sessionId ?? null,
        rowCount: bookings.length
      }
    });
  } catch (e) {
    // 記錄失敗不影響匯出本身，只印警告。
    console.error("[admin/export] 匯出紀錄寫入失敗", e);
  }

  const filename = sessionId ? `bookings-${startDate}-單場次.xlsx` : `bookings-${startDate}_${endDate}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`
    }
  });
}
