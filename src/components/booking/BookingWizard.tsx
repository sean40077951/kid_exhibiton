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
      <div className="mx-auto max-w-xl px-4 py-6">
        <header className="mb-5 flex items-center justify-between">
          <div className="text-lg font-bold text-brand-primary-dark">怪獸放電場</div>
        </header>
        <section className="rounded-3xl bg-brand-panel p-8 text-center shadow-sm">
          <p className="text-xl font-bold text-brand-primary-dark">本次活動已結束</p>
          <p className="mt-3 text-sm opacity-80">感謝大家的參與，期待未來還有機會再相見！</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="text-lg font-bold text-brand-primary-dark">
          怪獸放電場
          <span className="ml-2 text-xs font-normal opacity-60">{event?.name}</span>
        </div>
        <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-bold text-brand-primary-dark">
          線上預約
        </span>
      </header>

      <div className="mb-6 overflow-x-auto">
        <ProgressBar current={step} />
      </div>

      <section className="rounded-3xl bg-brand-panel p-4 shadow-sm sm:p-6">
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
  );
}
