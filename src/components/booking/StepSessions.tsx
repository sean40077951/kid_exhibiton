"use client";

import { useEffect, useState } from "react";

type SessionOption = { id: string; timeSlot: string; capacity: number; remaining: number };

export default function StepSessions({
  dateStr,
  onBack,
  onNext
}: {
  dateStr: string;
  onBack: () => void;
  onNext: (session: SessionOption, headcount: number) => void;
}) {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [headcount, setHeadcount] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    fetch(`/api/sessions?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .finally(() => setLoading(false));
  }, [dateStr]);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-brand-primary underline">
        ‹ 返回上一頁
      </button>

      <div className="rounded-2xl bg-white/70 p-4">
        <p className="text-sm opacity-70">預約日期</p>
        <p className="text-lg font-bold">{dateStr}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold">場次（每場上限依實際名額）</p>
        {loading && <p className="text-sm opacity-60">載入中…</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-sm opacity-60">此日期尚無可預約場次。</p>
        )}
        {sessions.map((s) => {
          const full = s.remaining <= 0;
          const active = selectedId === s.id;
          const ratio = s.capacity > 0 ? s.remaining / s.capacity : 0;
          return (
            <button
              key={s.id}
              type="button"
              disabled={full}
              onClick={() => setSelectedId(s.id)}
              className={`block w-full rounded-xl border-2 p-3 text-left transition ${
                full
                  ? "cursor-not-allowed border-transparent bg-black/5 opacity-50"
                  : active
                    ? "border-brand-danger bg-brand-accent/70"
                    : "border-transparent bg-brand-accent/40 hover:bg-brand-accent/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{s.timeSlot}</span>
                <span className={`text-sm font-bold ${ratio <= 0.2 && !full ? "text-brand-danger" : ""}`}>
                  {full ? "已滿" : `剩餘名額 ${s.remaining}`}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className={`h-full ${full ? "bg-brand-danger" : "bg-brand-primary"}`}
                  style={{ width: `${full ? 100 : Math.max(4, ratio * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold">預約人數（最多 5 人）</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setHeadcount(n)}
              className={`h-11 w-11 rounded-lg border-2 font-bold ${
                headcount === n
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-brand-primary/30 bg-white text-brand-primary-dark"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs opacity-70">含大人與小孩，需至少 1 位成人同行。3 歲以下兒童需至少 1 位成人同行。</p>
      </div>

      <button
        type="button"
        disabled={!selected || !headcount}
        onClick={() => selected && headcount && onNext(selected, headcount)}
        className="w-full rounded-xl bg-brand-success py-3 font-bold text-white disabled:opacity-40"
      >
        下一步：填寫資料
      </button>
    </div>
  );
}
