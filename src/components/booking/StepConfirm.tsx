"use client";

import { useState } from "react";
import type { PendingBookingInput } from "./StepForm";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

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
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setModalMessage(null);
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
        setModalMessage(data.error ?? "送出失敗，請稍後再試一次");
        return;
      }
      onDone(data);
    } catch {
      setModalMessage("網路異常，請稍後再試一次");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-navy underline">
        ‹ 返回修改
      </button>

      <div className="rounded-eight border-[3px] border-ink bg-card p-4 text-sm shadow-hardsm">
        <p className="mb-2 font-bold text-ink">請再次確認以下資料，送出後將無法取消或修改</p>
        <Row label="日期" value={dateStr} />
        <Row label="場次" value={session.timeSlot} />
        <Row label="人數" value={`${headcount} 人`} />
        <Row label="姓名" value={input.name} />
        <Row label="聯絡電話" value={input.phone} />
        <Row label="電子信箱" value={input.email} />
      </div>

      <div className="rounded-blob border-[3px] border-ink bg-red p-4 text-sm text-white shadow-hardsm">
        <p className="font-display font-bold">確定資料都正確嗎？</p>
        <p className="mt-1 opacity-95">送出後系統不提供取消或修改，如有問題可至展場詢問現場人員。</p>
      </div>

      <Button type="button" variant="submit" onClick={handleConfirm} disabled={submitting}>
        {submitting ? "送出中…" : "已確認資料無誤，送出預約"}
      </Button>

      {modalMessage && <Modal title={modalMessage} onClose={() => setModalMessage(null)} />}
    </div>
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
