// 發信服務尚未整合（PROJECT_SPEC.md 第 3.4 節：需用 Resend/SES 等專業發信服務，走佇列非同步處理）。
// 雛形先用 console.log 佔位，介面保持穩定，之後接上真正的 provider 與 queue 時不需改呼叫端。

type ConfirmationEmailPayload = {
  to: string;
  name: string;
  bookingCode: string;
  dateStr: string;
  timeSlot: string;
  headcount: number;
  noticeText: string;
};

export async function sendConfirmationEmail(payload: ConfirmationEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[mailer] RESEND_API_KEY 未設定，僅模擬寄送確認信給 ${payload.to}（預約編號 ${payload.bookingCode}）`
    );
    return;
  }

  // TODO: 串接 Resend/SES，並改為丟進佇列非同步處理，避免拖慢送出預約的回應速度。
  console.log(`[mailer] TODO: 實作真正寄信邏輯`, payload);
}
