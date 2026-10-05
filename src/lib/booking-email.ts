import { prisma } from "@/lib/prisma";
import { MailError, sendConfirmationEmail } from "@/lib/mailer";
import { cancelUrlFor } from "@/lib/cancel-token";
import { formatDate } from "@/lib/timezone";

const RETRY_DELAY_MS = 3000;

// 暫時性錯誤（沒有狀態碼＝網路層問題、429 超過寄信額度、5xx 對方服務出錯）才值得自動重試一次；
// 其他 4xx（信箱格式不對、網域沒驗證、金鑰錯誤）重試也一樣失敗，直接記錄就好。
function isRetryable(e: unknown): boolean {
  if (!(e instanceof MailError)) return true;
  return e.status === undefined || e.status === 429 || e.status >= 500;
}

// 寄出某筆預約的確認信，並把結果（已寄出／失敗／模擬）寫回預約紀錄，讓後台看得到、失敗時可以重寄。
// 這個函式自己吞掉所有錯誤（只回傳結果），所以預約流程可以放心「不等待」呼叫它。
// 預約建立後的第一次寄送與後台「重寄確認信」共用這一支。
export async function sendBookingConfirmation(bookingId: string): Promise<{ status: "sent" | "failed" | "skipped"; error?: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { session: { include: { event: { select: { noticeText: true } } } } }
  });
  if (!booking) return { status: "failed", error: "找不到這筆預約" };

  const payload = {
    to: booking.email,
    name: booking.name,
    bookingCode: booking.bookingCode,
    dateStr: formatDate(booking.bookingDate, "yyyy-MM-dd"),
    timeSlot: booking.session.timeSlot,
    headcount: booking.headcount,
    noticeText: booking.session.event.noticeText,
    cancelUrl: cancelUrlFor(booking.id)
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await sendConfirmationEmail(payload);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { emailStatus: result, emailSentAt: result === "sent" ? new Date() : null, emailError: null }
      });
      return { status: result };
    } catch (e) {
      lastError = e;
      if (attempt === 0 && isRetryable(e)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      break;
    }
  }

  const message = (lastError instanceof Error ? lastError.message : String(lastError)).slice(0, 500);
  console.error(`[mailer] 確認信寄送失敗（預約編號 ${booking.bookingCode}）：${message}`);
  await prisma.booking
    .update({ where: { id: booking.id }, data: { emailStatus: "failed", emailError: message } })
    .catch((e) => console.error("[mailer] 寫入寄送失敗狀態也失敗", e));
  return { status: "failed", error: message };
}
