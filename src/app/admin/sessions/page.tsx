"use client";

import { useEffect, useState } from "react";

type SessionRow = {
  id: string;
  timeSlot: string;
  capacity: number;
  remaining: number;
  booked: number;
  isOpen: boolean;
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminSessionsPage() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [newCapacity, setNewCapacity] = useState("30");
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/sessions?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.sessions ?? []);
        const nextDrafts: Record<string, string> = {};
        (data.sessions ?? []).forEach((s: SessionRow) => {
          nextDrafts[s.id] = String(s.capacity);
        });
        setDrafts(nextDrafts);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [date]);

  async function saveCapacity(id: string) {
    const value = Number(drafts[id]);
    if (!Number.isInteger(value) || value < 0) {
      setError("人數上限請輸入 0 以上的整數");
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity: value })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "更新失敗");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    } finally {
      setSavingId(null);
    }
  }

  async function toggleOpen(id: string, isOpen: boolean) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "更新失敗");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    } finally {
      setSavingId(null);
    }
  }

  // 整天一次開放／關閉，不用逐一場次點擊（例如臨時休館，一次把當天所有場次關掉）。
  async function bulkSetOpen(isOpen: boolean) {
    if (rows.length === 0) return;
    setBulkSaving(true);
    setError(null);
    try {
      const results = await Promise.all(
        rows.map((r) =>
          fetch(`/api/admin/sessions/${r.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isOpen })
          }).then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        )
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        setError(failed.data.error ?? "整批更新失敗");
      }
      load();
    } finally {
      setBulkSaving(false);
    }
  }

  async function createSession() {
    const capacityNum = Number(newCapacity);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newTimeSlot)) {
      setError("時段格式錯誤，請輸入 HH:mm（例如 14:30）");
      return;
    }
    if (!Number.isInteger(capacityNum) || capacityNum < 0) {
      setError("人數上限請輸入 0 以上的整數");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, timeSlot: newTimeSlot, capacity: capacityNum })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "新增失敗");
        return;
      }
      setNewTimeSlot("");
      load();
    } finally {
      setCreating(false);
    }
  }

  async function deleteSession(id: string) {
    if (!window.confirm("確定要刪除這個場次嗎？刪除後無法復原。")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "刪除失敗");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 font-display text-xl font-bold text-ink">場次管理</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold text-ink">
          日期
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
          />
        </label>
        {loading && <span className="text-sm text-muted">載入中…</span>}
      </div>

      <div className="mb-4 rounded-eight border-2 border-dashed border-line p-3">
        <span className="mb-2 block text-sm font-bold text-ink">整天：</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => bulkSetOpen(true)}
            disabled={bulkSaving || loading || rows.length === 0}
            className="rounded-eight border-2 border-ink bg-green px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {bulkSaving ? "處理中…" : "整天開放"}
          </button>
          <button
            type="button"
            onClick={() => bulkSetOpen(false)}
            disabled={bulkSaving || loading || rows.length === 0}
            className="rounded-eight border-2 border-ink bg-red px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {bulkSaving ? "處理中…" : "整天關閉"}
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-eight border-2 border-dashed border-line p-3">
        <span className="mb-2 block text-sm font-bold text-ink">新增場次：</span>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-muted">
            時段（HH:mm）
            <input
              type="text"
              placeholder="14:30"
              value={newTimeSlot}
              onChange={(e) => setNewTimeSlot(e.target.value)}
              className="mt-1 block w-24 rounded-eight border-2 border-ink bg-card px-2 py-1 text-sm text-ink"
            />
          </label>
          <label className="text-xs text-muted">
            人數上限
            <input
              type="number"
              min={0}
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              className="mt-1 block w-20 rounded-eight border-2 border-ink bg-card px-2 py-1 text-sm text-ink"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={createSession}
            disabled={creating || !newTimeSlot}
            className="rounded-eight border-2 border-ink bg-navy px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {creating ? "新增中…" : "＋ 新增"}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm font-bold text-red">{error}</p>}

      <div className="overflow-x-auto rounded-eight border-[3px] border-ink bg-card shadow-hardsm">
        <table className="w-full text-sm">
          <thead className="bg-line/40">
            <tr>
              <Th>場次</Th>
              <Th>人數上限</Th>
              <Th>已預約</Th>
              <Th>剩餘名額</Th>
              <Th>開放狀態</Th>
              <Th />
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <Td className="font-display font-bold">{r.timeSlot}</Td>
                <Td>
                  <input
                    type="number"
                    min={0}
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    className="w-20 rounded-eight border-2 border-ink bg-card px-2 py-1"
                  />
                </Td>
                <Td>{r.booked}</Td>
                <Td>{r.remaining}</Td>
                <Td>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.isOpen}
                      onChange={(e) => toggleOpen(r.id, e.target.checked)}
                      disabled={savingId === r.id}
                      className="h-4 w-4 accent-green"
                    />
                    {r.isOpen ? "開放中" : "已關閉"}
                  </label>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => saveCapacity(r.id)}
                    disabled={savingId === r.id || drafts[r.id] === String(r.capacity)}
                    className="rounded-eight border-2 border-ink px-3 py-1 font-bold hover:bg-line/40 disabled:opacity-40"
                  >
                    {savingId === r.id ? "儲存中…" : "儲存上限"}
                  </button>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => deleteSession(r.id)}
                    disabled={deletingId === r.id}
                    className="rounded-eight border-2 border-red px-3 py-1 font-bold text-red hover:bg-red/10 disabled:opacity-40"
                  >
                    {deletingId === r.id ? "刪除中…" : "刪除"}
                  </button>
                </Td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted">
                  此日期沒有場次資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        把人數上限調到低於「已預約」人數時，不會影響已經成立的預約，只會擋住後續超過已預約人數的新預約。
        已經有人預約的場次無法刪除，請改用「關閉」讓它停止接受新預約。
      </p>
    </main>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap p-2 text-left font-bold text-ink">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap p-2 text-ink ${className}`}>{children}</td>;
}
