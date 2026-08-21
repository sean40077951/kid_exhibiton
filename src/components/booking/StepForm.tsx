"use client";

import { useState } from "react";

type SessionOption = { id: string; timeSlot: string };

export type BookingResult = {
  bookingCode: string;
  name: string;
  email: string;
  date: string;
  timeSlot: string;
  headcount: number;
};

export default function StepForm({
  dateStr,
  session,
  headcount,
  consentText,
  noticeText,
  onBack,
  onDone
}: {
  dateStr: string;
  session: SessionOption;
  headcount: number;
  consentText: string;
  noticeText: string;
  onBack: () => void;
  onDone: (result: BookingResult) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("請先閱讀並勾選入場注意事項與個資使用同意聲明。");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          name,
          phone,
          email,
          headcount,
          consent: true,
          website
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "送出失敗，請稍後再試一次");
        return;
      }
      onDone(data);
    } catch {
      setError("網路異常，請稍後再試一次");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-brand-primary underline">
        ‹ 返回上一頁
      </button>

      <div className="rounded-2xl bg-white/70 p-4 text-sm">
        <Row label="日期" value={dateStr} />
        <Row label="場次" value={session.timeSlot} />
        <Row label="人數" value={`${headcount} 人`} />
      </div>

      <div className="space-y-3 rounded-2xl bg-white/70 p-4">
        <Field label="姓名" required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="請填寫預約人姓名"
            className="w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </Field>
        <Field label="聯絡電話" required>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
            className="w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </Field>
        <Field label="電子信箱" required>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="confirm@example.com"
            className="w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </Field>

        {/* Honeypot：CSS 隱藏而非 display:none，一般使用者看不到也不會填 */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>
            網站
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-brand-danger/60 bg-brand-danger/10 p-4 text-sm">
        <p className="font-bold text-brand-danger">送出後不能取消或修改</p>
        <p className="mt-1 opacity-90">系統不提供取消與更改功能，請確認日期、場次與人數無誤再送出。若無法到場，直接不入場即可。</p>
      </div>

      {noticeText && (
        <details className="rounded-2xl bg-white/70 p-4 text-sm">
          <summary className="cursor-pointer font-bold">入場注意事項</summary>
          <p className="mt-2 whitespace-pre-line opacity-90">{noticeText}</p>
        </details>
      )}

      <label className="flex items-start gap-2 text-xs opacity-90">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          我已閱讀入場注意事項，同意主辦單位為本次預約蒐集與使用上述個人資料。
          {consentText && <span className="block opacity-70">{consentText}</span>}
        </span>
      </label>

      {/* Cloudflare Turnstile 掛載點：正式環境設定 NEXT_PUBLIC_TURNSTILE_SITE_KEY 後於此渲染 widget */}

      {error && <p className="text-sm font-bold text-brand-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-40"
      >
        {submitting ? "送出中…" : "確認送出"}
      </button>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-black/5 py-1 last:border-0">
      <span className="opacity-60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-bold">
        {label}
        {required && <span className="text-brand-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
