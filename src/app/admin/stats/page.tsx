"use client";

import { Fragment, useEffect, useState } from "react";
import { todayDateStringInTaipei } from "@/lib/timezone";

type SessionRow = {
  timeSlot: string;
  capacity: number;
  isOpen: boolean;
  counted: boolean;
  people: number;
  count: number;
  cancelledCount: number;
};
type Day = {
  date: string;
  sessionCount: number;
  capacity: number;
  people: number;
  count: number;
  cancelledCount: number;
  sessions: SessionRow[];
};
type Stats = {
  startDate: string;
  endDate: string;
  total: { days: number; sessionCount: number; capacity: number; people: number; count: number; cancelledCount: number };
  days: Day[];
};

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pct(people: number, capacity: number): number {
  return capacity > 0 ? Math.round((people / capacity) * 100) : 0;
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-24 overflow-hidden rounded-full bg-line/60">
      <div className="h-full rounded-full bg-navy" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

const QUICK_RANGES: { label: string; days: number }[] = [
  { label: "今天", days: 1 },
  { label: "近 7 天", days: 7 },
  { label: "近 14 天", days: 14 },
  { label: "近 30 天", days: 30 }
];

export default function AdminStatsPage() {
  const today = todayDateStringInTaipei();
  const [startDate, setStartDate] = useState(shiftDate(today, -13));
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/stats?startDate=${startDate}&endDate=${endDate}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error ?? "查詢失敗");
          setData(null);
          return;
        }
        setData(d);
      })
      .catch(() => setError("網路異常，請稍後再試一次"))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  function setRange(days: number) {
    setEndDate(today);
    setStartDate(shiftDate(today, -(days - 1)));
  }

  function toggle(date: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const t = data?.total;
  const cards = t
    ? [
        { label: "預約率", value: `${pct(t.people, t.capacity)}%`, sub: `${t.people} / ${t.capacity} 人次` },
        { label: "登記人次", value: `${t.people}`, sub: `${t.count} 筆預約` },
        { label: "有場次的天數", value: `${t.days}`, sub: `共 ${t.sessionCount} 個場次` },
        { label: "已取消", value: `${t.cancelledCount}`, sub: "筆（不計入人次）" }
      ]
    : [];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 font-display text-xl font-bold text-ink">統計報表</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold text-ink">
          起
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
            className="ml-2 rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
          />
        </label>
        <label className="text-sm font-bold text-ink">
          迄
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => e.target.value && setEndDate(e.target.value)}
            className="ml-2 rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
          />
        </label>
        {QUICK_RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r.days)}
            className="rounded-eight border-2 border-ink px-3 py-1 text-xs font-bold text-ink hover:bg-line/40"
          >
            {r.label}
          </button>
        ))}
        {loading && <span className="text-sm text-muted">載入中…</span>}
      </div>

      {error && <p className="mb-3 text-sm font-bold text-red">{error}</p>}

      {t && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-eight border-[3px] border-ink bg-card p-3 shadow-hardsm">
              <p className="text-xs font-bold text-muted">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{c.value}</p>
              <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-eight border-[3px] border-ink bg-card shadow-hardsm">
        <table className="w-full text-sm">
          <thead className="bg-line/40">
            <tr>
              {["日期", "場次數", "總名額", "登記人次", "登記筆數", "已取消", "預約率"].map((h) => (
                <th key={h} className="whitespace-nowrap p-2 text-left font-bold text-ink">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.days.map((d) => {
              const weekday = WEEKDAY[new Date(`${d.date}T12:00:00+08:00`).getDay()];
              const expanded = open.has(d.date);
              return (
                <Fragment key={d.date}>
                  <tr
                    onClick={() => toggle(d.date)}
                    className="cursor-pointer border-t border-line hover:bg-line/20"
                    title="點一下展開各場次"
                  >
                    <td className="whitespace-nowrap p-2 font-bold text-ink">
                      <span className="mr-1 text-muted">{expanded ? "▾" : "▸"}</span>
                      {d.date.replace(/-/g, "/")}（{weekday}）
                    </td>
                    <td className="p-2 text-ink">{d.sessionCount}</td>
                    <td className="p-2 text-ink">{d.capacity}</td>
                    <td className="p-2 font-bold text-ink">{d.people}</td>
                    <td className="p-2 text-ink">{d.count}</td>
                    <td className="p-2 text-ink">{d.cancelledCount}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Bar value={pct(d.people, d.capacity)} />
                        <span className="text-ink">{pct(d.people, d.capacity)}%</span>
                      </div>
                    </td>
                  </tr>
                  {expanded &&
                    d.sessions.map((s) => (
                      <tr key={`${d.date}-${s.timeSlot}`} className="border-t border-line/60 bg-line/10 text-xs">
                        <td className="whitespace-nowrap py-1.5 pl-8 pr-2 text-ink">
                          {s.timeSlot}
                          {!s.isOpen && <span className="ml-1 text-muted">（已關閉）</span>}
                        </td>
                        <td className="p-2 text-muted">—</td>
                        <td className="p-2 text-ink">{s.counted ? s.capacity : "不計"}</td>
                        <td className="p-2 text-ink">{s.people}</td>
                        <td className="p-2 text-ink">{s.count}</td>
                        <td className="p-2 text-ink">{s.cancelledCount}</td>
                        <td className="p-2">
                          {s.counted ? (
                            <div className="flex items-center gap-2">
                              <Bar value={pct(s.people, s.capacity)} />
                              <span className="text-ink">{pct(s.people, s.capacity)}%</span>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            {!loading && data && data.days.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted">
                  這段期間沒有場次
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </main>
  );
}
