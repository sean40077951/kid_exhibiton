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

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-bold">名額管理</h1>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm">
          日期
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 rounded border border-black/20 px-2 py-1"
          />
        </label>
        {loading && <span className="text-sm opacity-60">載入中…</span>}
      </div>

      {error && <p className="mb-3 text-sm font-bold text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <Th>場次</Th>
              <Th>人數上限</Th>
              <Th>已預約</Th>
              <Th>剩餘名額</Th>
              <Th>開放狀態</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/5">
                <Td>{r.timeSlot}</Td>
                <Td>
                  <input
                    type="number"
                    min={0}
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    className="w-20 rounded border border-black/20 px-2 py-1"
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
                    />
                    {r.isOpen ? "開放中" : "已關閉"}
                  </label>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => saveCapacity(r.id)}
                    disabled={savingId === r.id || drafts[r.id] === String(r.capacity)}
                    className="rounded border border-black/20 px-3 py-1 hover:bg-black/5 disabled:opacity-40"
                  >
                    {savingId === r.id ? "儲存中…" : "儲存上限"}
                  </button>
                </Td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center opacity-60">
                  此日期沒有場次資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs opacity-60">
        把人數上限調到低於「已預約」人數時，不會影響已經成立的預約，只會擋住後續超過已預約人數的新預約。
      </p>
    </main>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="p-2 text-left font-bold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-2">{children}</td>;
}
