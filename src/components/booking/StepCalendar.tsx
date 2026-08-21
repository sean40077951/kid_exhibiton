"use client";

import { useEffect, useMemo, useState } from "react";

type DayStatus = "closed" | "full" | "low" | "available";
type DayInfo = { status: DayStatus; remaining?: number };

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

const STATUS_STYLE: Record<DayStatus, string> = {
  available: "bg-brand-success text-white hover:brightness-110 cursor-pointer",
  low: "bg-brand-warning text-brand-primary-dark hover:brightness-110 cursor-pointer",
  full: "bg-brand-primary-dark/30 text-brand-primary-dark/60 cursor-not-allowed",
  closed: "bg-transparent text-brand-primary-dark/30 cursor-not-allowed"
};

export default function StepCalendar({
  onSelect,
  bannerText
}: {
  onSelect: (dateStr: string) => void;
  bannerText: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1
  }));
  const [days, setDays] = useState<Record<string, DayInfo>>({});
  const [loading, setLoading] = useState(true);

  const monthStr = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability?month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => setDays(data.days ?? {}))
      .finally(() => setLoading(false));
  }, [monthStr]);

  const firstWeekday = new Date(cursor.year, cursor.month - 1, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthStr}-${String(i + 1).padStart(2, "0")}`)
  ];

  function changeMonth(delta: number) {
    setCursor((prev) => {
      let month = prev.month + delta;
      let year = prev.year;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month };
    });
  }

  return (
    <div className="space-y-4">
      {bannerText && (
        <div className="rounded-lg bg-brand-primary/10 px-4 py-2 text-sm text-brand-primary-dark">
          {bannerText}
        </div>
      )}

      <div className="rounded-2xl bg-white/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-full px-3 py-1 text-lg hover:bg-black/5"
            aria-label="上個月"
          >
            ‹
          </button>
          <h2 className="text-lg font-bold">
            {cursor.year} 年 {cursor.month} 月
          </h2>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-full px-3 py-1 text-lg hover:bg-black/5"
            aria-label="下個月"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold opacity-70">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((dateStr, idx) => {
            if (!dateStr) return <div key={idx} />;
            const info = days[dateStr];
            const status = info?.status ?? "closed";
            const dayNum = Number(dateStr.slice(-2));
            const clickable = status === "available" || status === "low";
            return (
              <button
                key={dateStr}
                type="button"
                disabled={!clickable || loading}
                onClick={() => onSelect(dateStr)}
                className={`flex h-14 flex-col items-center justify-center rounded-lg text-sm transition ${STATUS_STYLE[status]}`}
              >
                <span className="font-bold">{dayNum}</span>
                {typeof info?.remaining === "number" && status !== "full" && (
                  <span className="text-[10px] opacity-90">餘{info.remaining}</span>
                )}
                {status === "full" && <span className="text-[10px]">滿</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <LegendDot className="bg-brand-success" label="可預約" />
          <LegendDot className="bg-brand-warning" label="名額緊張" />
          <LegendDot className="bg-brand-primary-dark/30" label="額滿" />
          <LegendDot className="border border-brand-primary-dark/30 bg-transparent" label="休館／未開放" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}
