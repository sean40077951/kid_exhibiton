"use client";

import { useEffect, useState } from "react";
import ProgressBar from "./ProgressBar";
import StepCalendar from "./StepCalendar";
import StepSessions from "./StepSessions";
import StepForm, { type PendingBookingInput } from "./StepForm";
import StepConfirm, { type BookingResult } from "./StepConfirm";
import StepSuccess from "./StepSuccess";
import { formatDate, todayDateStringInTaipei } from "@/lib/timezone";

type EventConfig = {
  name: string;
  bannerText: string;
  noticeText: string;
  consentText: string;
  dateRangeEnd: string;
};

type SessionOption = { id: string; timeSlot: string; capacity: number; remaining: number };

export default function BookingWizard() {
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionOption | null>(null);
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [pendingInput, setPendingInput] = useState<PendingBookingInput | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    fetch("/api/event")
      .then((r) => r.json())
      .then((data) => setEvent(data))
      .catch(() => setEvent(null));
  }, []);

  function reset() {
    setStep(1);
    setSelectedDate(null);
    setSelectedSession(null);
    setHeadcount(null);
    setPendingInput(null);
    setResult(null);
  }

  // 展期結束後頁面全部關閉（業主須知回覆 4-2），不只是月曆變灰，要有明確的結束畫面。
  const eventEnded = event ? todayDateStringInTaipei() > formatDate(event.dateRangeEnd, "yyyy-MM-dd") : false;

  if (eventEnded) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteHeader eventName={event?.name} />
        <div className="mx-auto max-w-xl px-4 py-8">
          <section className="rounded-blob border-[3px] border-ink bg-card p-8 text-center shadow-hardlg">
            <p className="font-display text-xl font-bold text-ink">本次活動已結束</p>
            <p className="mt-3 text-sm text-muted">感謝大家的參與，期待未來還有機會再相見！</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader eventName={event?.name} />

      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="mb-6">
          <ProgressBar current={step} />
        </div>

        <section className="rounded-blob border-[3px] border-ink bg-card p-4 shadow-hard sm:p-6">
          {step === 1 && (
            <StepCalendar
              bannerText={event?.bannerText ?? ""}
              onSelect={(dateStr) => {
                setSelectedDate(dateStr);
                setStep(2);
              }}
            />
          )}

          {step === 2 && selectedDate && (
            <StepSessions
              dateStr={selectedDate}
              onBack={() => setStep(1)}
              onNext={(session, hc) => {
                setSelectedSession(session);
                setHeadcount(hc);
                setStep(3);
              }}
            />
          )}

          {step === 3 && selectedDate && selectedSession && headcount && !pendingInput && (
            <StepForm
              dateStr={selectedDate}
              session={selectedSession}
              headcount={headcount}
              consentText={event?.consentText ?? ""}
              onBack={() => setStep(2)}
              onReviewReady={(input) => setPendingInput(input)}
            />
          )}

          {step === 3 && selectedDate && selectedSession && headcount && pendingInput && (
            <StepConfirm
              dateStr={selectedDate}
              session={selectedSession}
              headcount={headcount}
              input={pendingInput}
              onBack={() => setPendingInput(null)}
              onDone={(res) => {
                setResult(res);
                setStep(4);
              }}
            />
          )}

          {step === 4 && result && (
            <StepSuccess result={result} noticeText={event?.noticeText ?? ""} onRestart={reset} />
          )}
        </section>
      </div>
    </div>
  );
}

// 頁首規範（ui/_preview/09_頁首彈窗與驗證.png）：sticky、米紙底＋下緣 3px 墨黑，
// 右側「線上預約」徽章芥黃圓角 8 陰影 3；下方黑底跑馬燈 22 秒無縫循環。
function SiteHeader({ eventName }: { eventName?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap font-display text-lg font-bold text-ink">
          怪獸放電場
          <span className="ml-2 text-xs font-normal text-muted">{eventName}</span>
        </div>
        <span className="shrink-0 rounded-eight border-2 border-ink bg-yellow px-3 py-1.5 text-xs font-bold text-ink shadow-hardsm">
          線上預約
        </span>
      </div>
      <div className="overflow-hidden bg-ink py-1.5">
        <div className="animate-marquee flex w-max whitespace-nowrap text-xs font-bold tracking-widest text-paper">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-4">
              HELLO! MONSTERS!
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
