"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

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

  // 改變人數時連動檢查場次餘額，不足的場次自動取消選取（ui/_preview/05_人數與表單.png）。
  function selectHeadcount(n: number) {
    setHeadcount(n);
    if (selected && selected.remaining < n) {
      setSelectedId(null);
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-navy underline">
        ‹ 返回上一頁
      </button>

      <div className="flex items-center gap-3 rounded-toy border-[3px] border-ink bg-yellow p-4 shadow-hardsm">
        <img
          src="/monsters/monster-05.png"
          alt=""
          aria-hidden="true"
          className="h-11 w-11 shrink-0 rounded-eight border-2 border-dashed border-ink/50 bg-card/40 object-contain p-0.5"
        />
        <div>
          <p className="text-sm text-ink/70">預約日期</p>
          <p className="font-display text-lg font-bold text-ink">{dateStr}</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">場次（每場上限依實際名額）</p>
        {loading && <p className="text-sm text-muted">載入中…</p>}
        {!loading && sessions.length === 0 && <p className="text-sm text-muted">此日期尚無可預約場次。</p>}
        {sessions.map((s) => {
          const full = s.remaining <= 0;
          const insufficient = !full && headcount !== null && s.remaining < headcount;
          const disabled = full || insufficient;
          const active = selectedId === s.id;
          const tight = !full && s.remaining <= 8;
          const ratio = s.capacity > 0 ? s.remaining / s.capacity : 0;

          const cardClass = full
            ? "border-line bg-line/40 text-muted cursor-not-allowed shadow-none"
            : insufficient
              ? "border-ink bg-card text-ink cursor-not-allowed opacity-60 shadow-hardsm"
              : active
                ? "border-red bg-card text-ink shadow-hardlg"
                : tight
                  ? "border-ink bg-yellow text-ink shadow-hardsm"
                  : "border-ink bg-card text-ink shadow-hardsm hover:-translate-y-0.5";

          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedId(s.id)}
              className={`block w-full rounded-toy border-[3px] p-4 text-left transition ${cardClass}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl font-bold">{s.timeSlot}</span>
                <span className="text-right">
                  <span className="block text-xs text-muted">剩餘名額</span>
                  <span className={`font-display text-lg font-bold ${tight || insufficient ? "text-red" : ""}`}>
                    {full ? "已滿" : s.remaining}
                  </span>
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border-2 border-ink bg-white">
                <div
                  className={`h-full ${full ? "bg-stone" : tight || insufficient ? "bg-red" : "bg-green"}`}
                  style={{ width: `${full ? 100 : Math.max(4, ratio * 100)}%` }}
                />
              </div>
              {insufficient && headcount !== null && (
                <p className="mt-1.5 text-xs font-bold text-red">
                  剩餘 {s.remaining} 名，不足 {headcount} 人
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">預約人數（最多 5 人）</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => selectHeadcount(n)}
              className={`h-11 w-11 rounded-eight border-[3px] border-ink font-display font-bold transition ${
                headcount === n ? "bg-navy text-white" : "bg-card text-ink"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">含大人與小孩，需至少 1 位成人同行。3 歲以下兒童需至少 1 位成人同行。</p>
      </div>

      <Button
        type="button"
        variant="continue"
        disabled={!selected || !headcount}
        onClick={() => selected && headcount && onNext(selected, headcount)}
      >
        下一步：填寫資料
      </Button>
    </div>
  );
}
