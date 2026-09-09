"use client";

import { useState } from "react";
import type { PendingBookingInput } from "./StepForm";

type SessionOption = { id: string; timeSlot: string };

export type BookingResult = {
  bookingCode: string;
  name: string;
  email: string;
  date: string;
  timeSlot: string;
  headcount: number;
};

// 送出前最後一次確認畫面（業主須知回覆 5-2）：因為不提供取消或修改，
// 先讓使用者看一次完整填寫內容，按「已確認資料無誤」才真的送出。
export default function StepConfirm({
  dateStr,
  session,
  headcount,
  input,
  onBack,
  onDone
}: {
  dateStr: string;
  session: SessionOption;
  headcount: number;
  input: PendingBookingInput;
  onBack: () => void;
  onDone: (result: BookingResult) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          headcount,
          consent: true,
          website: input.website
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
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-brand-primary underline">
        ‹ 返回修改
      </button>

      <div className="rounded-2xl bg-white/70 p-4 text-sm">
        <p className="mb-2 font-bold">請再次確認以下資料，送出後將無法取消或修改</p>
        <Row label="日期" value={dateStr} />
        <Row label="場次" value={session.timeSlot} />
        <Row label="人數" value={`${headcount} 人`} />
        <Row label="姓名" value={input.name} />
        <Row label="聯絡電話" value={input.phone} />
        <Row label="電子信箱" value={input.email} />
      </div>

      <div className="rounded-2xl border-2 border-brand-danger/60 bg-brand-danger/10 p-4 text-sm">
        <p className="font-bold text-brand-danger">確定資料都正確嗎？</p>
        <p className="mt-1 opacity-90">送出後系統不提供取消或修改，如有問題可至展場詢問現場人員。</p>
      </div>

      {error && <p className="text-sm font-bold text-brand-danger">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-40"
      >
        {submitting ? "送出中…" : "已確認資料無誤，送出預約"}
      </button>
    </div>
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
