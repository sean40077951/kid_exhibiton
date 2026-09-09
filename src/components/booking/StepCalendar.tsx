"use client";

import { useEffect, useMemo, useState } from "react";

type DayStatus = "closed" | "full" | "low" | "available";
type DayInfo = { status: DayStatus; remaining?: number };

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

// 六種日期狀態規範（ui/_preview/03_月曆.png）：open/tight/full 是即時算出來的，
// closed/notopen/past 目前後端統一回傳 "closed"，畫面上都用同一種灰階樣式呈現。
const STATUS_STYLE: Record<DayStatus, string> = {
  available: "bg-green text-white border-ink cursor-pointer",
  low: "bg-yellow text-ink border-ink cursor-pointer",
  full: "bg-stone text-white border-ink cursor-not-allowed",
  closed: "bg-transparent text-line border-line cursor-not-allowed"
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
        <div className="rounded-eight border-[3px] border-ink bg-navy px-4 py-3 text-sm font-bold text-white shadow-hardsm">
          {bannerText}
        </div>
      )}

      <div className="rounded-toy border-[3px] border-ink bg-card p-4 shadow-hardsm">
        <div className="mb-3 flex items-center justify-between">
          <IconButton onClick={() => changeMonth(-1)} label="上個月">
            ‹
          </IconButton>
          <h2 className="font-display text-lg font-bold text-ink">
            {cursor.year} 年 {cursor.month} 月
          </h2>
          <IconButton onClick={() => changeMonth(1)} label="下個月">
            ›
          </IconButton>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1.5">
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
                className={`flex aspect-square flex-col items-center justify-center rounded-eight border-[2.5px] font-display text-sm transition ${STATUS_STYLE[status]}`}
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

        <div className="mt-4 flex flex-wrap gap-3 border-t-[3px] border-dashed border-line pt-3 text-xs text-muted">
          <LegendDot className="bg-green" label="可預約" />
          <LegendDot className="bg-yellow" label="名額緊張" />
          <LegendDot className="bg-stone" label="額滿" />
          <LegendDot className="border border-line bg-transparent" label="休館／未開放" />
        </div>
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  label,
  children
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-eight border-2 border-ink text-lg text-ink hover:bg-line/40"
    >
      {children}
    </button>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded-eight border border-ink/30 ${className}`} />
      {label}
    </span>
  );
}
