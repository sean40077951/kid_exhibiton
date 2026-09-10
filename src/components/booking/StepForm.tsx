"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

type SessionOption = { id: string; timeSlot: string };

export type PendingBookingInput = {
  name: string;
  phone: string;
  email: string;
  website: string; // honeypot，原樣往下傳
};

export default function StepForm({
  dateStr,
  session,
  headcount,
  consentText,
  onBack,
  onReviewReady
}: {
  dateStr: string;
  session: SessionOption;
  headcount: number;
  consentText: string;
  onBack: () => void;
  onReviewReady: (input: PendingBookingInput) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);

  const emailInvalid = emailTouched && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("請先閱讀並勾選入場注意事項與個資使用同意聲明。");
      return;
    }

    // 這一步只做欄位檢查，不直接送出，先進到「確認資料」頁面讓使用者再看一次
    // （業主須知回覆 5-2：不能取消或修改，所以送出前多一層防呆）。
    onReviewReady({ name, phone, email, website });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-navy underline">
        ‹ 返回上一頁
      </button>

      <div className="rounded-eight border-[3px] border-ink bg-card p-4 text-sm shadow-hardsm">
        <Row label="日期" value={dateStr} />
        <Row label="場次" value={session.timeSlot} />
        <Row label="人數" value={`${headcount} 人`} />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Form 表單欄位</p>
        <Field label="姓名" required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="請填寫預約人姓名"
            className="h-10 w-full rounded-eight border-2 border-ink bg-card px-3 text-ink placeholder:text-muted focus:border-[3px] focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
        </Field>
        <Field label="聯絡電話" required>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
            className="h-10 w-full rounded-eight border-2 border-ink bg-card px-3 text-ink placeholder:text-muted focus:border-[3px] focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
        </Field>
        <Field label="電子信箱" required>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="confirm@example.com"
            className={`h-10 w-full rounded-eight border-2 bg-card px-3 text-ink placeholder:text-muted focus:outline-none ${
              emailInvalid
                ? "border-red focus:border-[3px] focus:ring-2 focus:ring-red/30"
                : "border-ink focus:border-[3px] focus:border-navy focus:ring-2 focus:ring-navy/30"
            }`}
          />
          {emailInvalid && (
            <p className="mt-1 text-xs font-bold text-red">
              信箱格式不正確，請再確認一次。
              <span className="block font-normal text-muted">確認信會寄到這個信箱，請仔細確認。</span>
            </p>
          )}
        </Field>

        {/* Honeypot：sr-only 隱藏而非 display:none，一般使用者看不到也不會填。
            原本用 -left-[9999px] 做法會讓手機瀏覽器把整個頁面的可捲動範圍撐寬，
            導致頁面被橫向捲走、內容被裁掉，改用 sr-only（1px 裁切）不會有這個問題。 */}
        <div className="sr-only" aria-hidden="true">
          <label>
            網站
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="rounded-blob border-[3px] border-ink bg-red p-4 text-sm text-white shadow-hardsm">
        <p className="font-display font-bold">送出後不能取消或修改</p>
        <p className="mt-1 opacity-95">系統不提供取消與更改功能，請確認日期、場次與人數無誤再送出。</p>
        <p className="mt-1 opacity-95">小提醒：記得在預約時間前 10 分鐘到場報到，逾時不候喔！</p>
      </div>

      {consentText && (
        <div className="rounded-eight border-2 border-line bg-card p-3 text-xs leading-relaxed text-muted">
          {consentText}
        </div>
      )}

      <label className="flex items-start gap-2 text-xs text-ink">
        <span
          onClick={() => setConsent((v) => !v)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-eight border-2 border-ink ${
            consent ? "bg-green" : "bg-card"
          }`}
        >
          {consent && (
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
              <path d="M3 8l3 3 7-7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <input type="checkbox" checked={consent} onChange={() => {}} className="sr-only" />
        <span>我已閱讀入場注意事項，同意主辦單位為本次預約蒐集與使用上述個人資料。</span>
      </label>

      {/* Cloudflare Turnstile 掛載點：正式環境設定 NEXT_PUBLIC_TURNSTILE_SITE_KEY 後於此渲染 widget */}

      {error && <p className="text-sm font-bold text-red">{error}</p>}

      <Button type="submit" variant="continue">
        下一步：確認資料
      </Button>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-display font-bold text-ink">{value}</span>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-bold text-ink">
        {label}
        {required && <span className="text-red"> *</span>}
      </span>
      {children}
    </label>
  );
}
