"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

type SessionOption = { id: string; timeSlot: string };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminExportPage() {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<SessionOption[]>([]);

  const isSingleDay = startDate === endDate;

  useEffect(() => {
    setSessionId("");
    if (!isSingleDay || !startDate) {
      setSessions([]);
      return;
    }
    fetch(`/api/admin/sessions?date=${startDate}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => setSessions([]));
  }, [startDate, isSingleDay]);

  const invalidRange = startDate > endDate;

  function handleExport() {
    const params = new URLSearchParams({ startDate, endDate });
    if (sessionId) params.set("sessionId", sessionId);
    window.location.href = `/api/admin/export?${params.toString()}`;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 font-display text-xl font-bold text-ink">資料匯出</h1>

      <div className="space-y-4 rounded-eight border-[3px] border-ink bg-card p-4 shadow-hardsm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-bold text-ink">
            起始日期
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
            />
          </label>
          <label className="text-sm font-bold text-ink">
            結束日期
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
            />
          </label>
        </div>

        {invalidRange && <p className="text-sm font-bold text-red">起始日期不能晚於結束日期</p>}

        <label className="block text-sm font-bold text-ink">
          特定場次（選填，僅單日可選）
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={!isSingleDay}
            className="mt-1 block w-full rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal disabled:bg-line/30 disabled:text-muted"
          >
            <option value="">全部場次</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.timeSlot}
              </option>
            ))}
          </select>
          {!isSingleDay && <span className="mt-1 block text-xs text-muted">日期區間橫跨多天時無法指定單一場次</span>}
        </label>

        <Button type="button" variant="continue" onClick={handleExport} disabled={invalidRange || !startDate || !endDate}>
          匯出 Excel（.xlsx）
        </Button>
      </div>
    </main>
  );
}
