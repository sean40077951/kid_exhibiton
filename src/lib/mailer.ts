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
  bookingCode: string;
  dateStr: string;
  timeSlot: string;
  headcount: number;
  noticeText: string;
  // 確認信裡「取消預約」按鈕的連結（見 src/lib/cancel-token.ts）。
  cancelUrl: string;
};

// 確認信裡的品牌名稱固定寫死「怪獸放電場」（業主 2026-10-01 指示），
// 不用資料庫的 event.name（那欄現在存的是比較長的展會描述「體驗登記系統｜兒藝節秋季展期」，
// 用在前台頁面標題，跟信件品牌名稱是兩回事，所以不共用同一個值）。
const BRAND_NAME = "怪獸放電場";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// 業主提供的信件樣式參考稿（2026-10-01）：置中標題＋副標、左對齊內文、
// 有格線的資訊表格、條列式入場注意事項、結尾署名與展覽地址。
// 展覽地址目前沒有對應欄位，先寫死「待補」，業主確定地址後再改這裡。
const VENUE_ADDRESS = "待補";

function buildEmailHtml(p: ConfirmationEmailPayload): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="border:1px solid #E5E5E5;background:#F5F5F5;padding:10px 14px;font-size:13px;font-weight:bold;color:#111827;width:110px;">${escapeHtml(label)}</td>
      <td style="border:1px solid #E5E5E5;padding:10px 14px;font-size:13px;color:#111827;">${escapeHtml(value)}</td>
    </tr>`;

  const noticeLines = p.noticeText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<li style="margin:0 0 6px;">${escapeHtml(l.replace(/^\d+[.、]\s*/, ""))}</li>`)
    .join("");

  const notice = noticeLines
    ? `<tr><td style="padding:20px 32px 0;">
         <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#111827;">入場注意事項</p>
         <ol style="margin:0;padding-left:20px;font-size:13px;line-height:22px;color:#374151;">${noticeLines}</ol>
       </td></tr>`
    : "";

  return `<!doctype html>
<html lang="zh-Hant"><body style="margin:0;background:#F3F3F5;font-family:'PingFang TC','Microsoft JhengHei',sans-serif;">
<table role="presentation" width="100%" style="background:#F3F3F5;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" style="max-width:92%;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 32px 0;text-align:center;">
        <p style="margin:0;font-size:22px;font-weight:bold;color:#111827;">${escapeHtml(BRAND_NAME)}</p>
        <p style="margin:6px 0 0;font-size:14px;font-weight:bold;color:#2F8F5B;">預約成功！您的確認信已送達</p>
      </td></tr>
      <tr><td style="padding:20px 32px 0;">
        <p style="margin:0;font-size:14px;color:#111827;">${escapeHtml(p.name)} 您好：</p>
        <p style="margin:8px 0 0;font-size:13px;line-height:22px;color:#374151;">
          感謝您預約「${escapeHtml(BRAND_NAME)}」，本次預約已完成，以下為您的預約資訊，請妥善保存本封信件，並於活動當日出示以利入場核對。
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          ${row("預約編號", p.bookingCode)}
          ${row("姓名", p.name)}
          ${row("預約日期", p.dateStr)}
          ${row("場次", p.timeSlot)}
          ${row("預約人數", `${p.headcount} 人`)}
        </table>
      </td></tr>
      ${notice}
      <tr><td style="padding:24px 32px 0;text-align:center;">
        <a href="${escapeHtml(p.cancelUrl)}" style="display:inline-block;padding:12px 32px;border-radius:999px;background:#EC1C8D;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">取消預約</a>
        <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;">如需取消，請於場次開始前 1 小時按上方按鈕辦理</p>
      </td></tr>
      <tr><td style="padding:20px 32px 0;">
        <p style="margin:0;font-size:13px;color:#374151;">若對本次預約有任何疑問，歡迎於活動現場洽詢工作人員。</p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-bottom:1px solid #E5E5E5;">
        <p style="margin:0;font-size:13px;color:#111827;">${escapeHtml(BRAND_NAME)} 敬上</p>
        <p style="margin:2px 0 0;font-size:12px;color:#9CA3AF;">展覽地址：${escapeHtml(VENUE_ADDRESS)}</p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;">
        <p style="margin:0;font-size:12px;color:#9CA3AF;">※ 本信件由預約系統自動發送，請勿直接回覆。</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildEmailText(p: ConfirmationEmailPayload): string {
  const notice = p.noticeText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const lines = [
    `${p.name} 您好：`,
    ``,
    `感謝您預約「${BRAND_NAME}」，本次預約已完成，以下為您的預約資訊，請妥善保存本封信件，並於活動當日出示以利入場核對。`,
    ``,
    `預約編號：${p.bookingCode}`,
    `姓名：${p.name}`,
    `預約日期：${p.dateStr}`,
    `場次：${p.timeSlot}`,
    `預約人數：${p.headcount} 人`
  ];
  if (notice.length) lines.push("", "入場注意事項", ...notice);
  lines.push(
    "",
    "如需取消預約，請於場次開始前 1 小時，點選下方連結辦理：",
    p.cancelUrl,
    "",
    "若對本次預約有任何疑問，歡迎於活動現場洽詢工作人員。",
    "",
    `${BRAND_NAME} 敬上`,
    `展覽地址：${VENUE_ADDRESS}`,
    "",
    "※ 本信件由預約系統自動發送，請勿直接回覆。"
  );
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
      subject: `【${BRAND_NAME}】預約成功通知－預約編號 ${payload.bookingCode}`,
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
