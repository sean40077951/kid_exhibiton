// 確認信寄送。用 Resend 的 REST API（不加官方 SDK，跟專案裡呼叫 Cloudflare Turnstile
// 的做法一致：一個 fetch 就能做完的事，不多引入一個套件）。
//
// 沒設定 RESEND_API_KEY 時（本機開發、或業主網域還沒設定好之前）僅印出模擬訊息，
// 呼叫端介面不變，正式接上金鑰後不需要改呼叫端任何程式碼。
//
// 呼叫端（src/app/api/bookings/route.ts）刻意不 await 這個函式，送出預約的回應不用等信寄完，
// 寄信失敗只記錄錯誤、不影響預約本身是否成立（預約已經在資料庫交易裡確定寫入）。
// 這是簡化版的「非同步寄送」，還沒有真正的重試佇列——量體還小，故障時先靠 log 人工補寄，
// 之後要接 queue（例如 Zeabur 內的 Redis + worker）時，只需要把 sendConfirmationEmail
// 內部從「直接呼叫 Resend」換成「丟進佇列」，介面不用變。

type ConfirmationEmailPayload = {
  to: string;
  name: string;
  eventName: string;
  bookingCode: string;
  dateStr: string;
  timeSlot: string;
  headcount: number;
  noticeText: string;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function buildEmailHtml(p: ConfirmationEmailPayload): string {
  const notice = p.noticeText.trim()
    ? `<tr><td style="padding:16px 24px 24px;">
         <table role="presentation" width="100%" style="background:#FFF8D6;border-radius:8px;">
           <tr><td style="padding:14px 16px;font-size:13px;line-height:22px;color:#111827;white-space:pre-line;">${escapeHtml(p.noticeText)}</td></tr>
         </table>
       </td></tr>`
    : "";

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#6B7280;width:88px;">${label}</td>
      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:bold;">${escapeHtml(value)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="zh-Hant"><body style="margin:0;background:#F3F3F5;font-family:'PingFang TC','Microsoft JhengHei',sans-serif;">
<table role="presentation" width="100%" style="background:#F3F3F5;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="480" style="max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#EC1C8D;padding:20px 24px;">
        <p style="margin:0;color:#ffffff;font-size:16px;font-weight:bold;">${escapeHtml(p.eventName)}</p>
        <p style="margin:2px 0 0;color:#ffffff;font-size:13px;opacity:0.9;">體驗登記確認信</p>
      </td></tr>
      <tr><td style="padding:24px 24px 8px;">
        <p style="margin:0 0 4px;font-size:13px;color:#6B7280;">${escapeHtml(p.name)} 您好，您的登記已完成，資訊如下：</p>
        <p style="margin:12px 0;padding:16px;background:#F5F5F5;border-radius:8px;text-align:center;font-size:22px;font-weight:bold;letter-spacing:0.1em;color:#111827;">${escapeHtml(p.bookingCode)}</p>
        <table role="presentation" width="100%">
          ${row("日期", p.dateStr)}
          ${row("時段", p.timeSlot)}
          ${row("人數", `${p.headcount} 人`)}
        </table>
      </td></tr>
      ${notice}
      <tr><td style="padding:0 24px 24px;">
        <p style="margin:0;font-size:12px;color:#9CA3AF;">此信件為系統自動寄送，請勿直接回覆。</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildEmailText(p: ConfirmationEmailPayload): string {
  const lines = [
    `${p.name} 您好，您的「${p.eventName}」體驗登記已完成。`,
    ``,
    `預約編號：${p.bookingCode}`,
    `日期：${p.dateStr}`,
    `時段：${p.timeSlot}`,
    `人數：${p.headcount} 人`
  ];
  if (p.noticeText.trim()) lines.push("", p.noticeText.trim());
  return lines.join("\n");
}

export async function sendConfirmationEmail(payload: ConfirmationEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "noreply@example.com";

  if (!apiKey) {
    console.warn(
      `[mailer] RESEND_API_KEY 未設定，僅模擬寄送確認信給 ${payload.to}（預約編號 ${payload.bookingCode}）`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: `「${payload.eventName}」體驗登記確認｜${payload.bookingCode}`,
      html: buildEmailHtml(payload),
      text: buildEmailText(payload)
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[mailer] Resend 回傳失敗 ${res.status}：${body.slice(0, 300)}`);
  }
}
