"use client";

import { useEffect, useState } from "react";

type BookingRow = {
  id: string;
  bookingCode: string;
  name: string;
  email: string;
  headcount: number;
  date: string;
  timeSlot: string;
  status: string;
  createdAt: string;
};

// 篩選選單用的場次清單：新制（10:00 起每 25 分鐘一場，共 24 場）加上 10 月沿用的舊場次時間。
const NEW_SLOTS = Array.from({ length: 24 }, (_, k) => {
  const m = 10 * 60 + k * 25;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const OLD_SLOTS = ["10:00", "10:35", "11:10", "11:45", "13:30", "14:05", "14:40", "15:15", "15:50", "16:25"];
const TIME_SLOTS = Array.from(new Set([...NEW_SLOTS, ...OLD_SLOTS])).sort();

const STATUS_LABEL: Record<string, string> = { confirmed: "已確認", pending: "處理中", cancelled: "已取消" };

export default function AdminBookingsPage() {
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 打字時不要每個字都馬上打 API，停下來 400ms 後才真的送出查詢。
  useEffect(() => {
    const t = setTimeout(() => setCode(codeInput.trim()), 400);
    return () => clearTimeout(t);
  }, [codeInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (timeSlot) params.set("timeSlot", timeSlot);
    if (code) params.set("code", code);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/admin/bookings${qs}`)
      .then((r) => r.json())
      .then((data) => setRows(data.bookings ?? []))
      .finally(() => setLoading(false));
  }, [date, timeSlot, code]);

  async function cancelBooking(r: BookingRow) {
    const ok = window.confirm(
      `確定要取消這筆預約嗎？

${r.bookingCode}　${r.name}
${r.date} ${r.timeSlot}　${r.headcount} 人

取消後名額會釋出給其他人，且無法復原。`
    );
    if (!ok) return;
    setCancellingId(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${r.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "取消失敗");
        return;
      }
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)));
    } catch {
      setError("網路異常，請稍後再試一次");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 font-display text-xl font-bold text-ink">預約查詢</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold text-ink">
          預約編號
          <input
            type="text"
            placeholder="例如 M260912-2947"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            className="ml-2 w-36 rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
          />
        </label>
        <label className="text-sm font-bold text-ink">
          日期
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
          />
        </label>
        <label className="text-sm font-bold text-ink">
          場次
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="ml-2 rounded-eight border-2 border-ink bg-card px-2 py-1 font-normal"
          >
            <option value="">全部</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {loading && <span className="text-sm text-muted">載入中…</span>}
      </div>
      {error && <p className="mb-3 text-sm font-bold text-red">{error}</p>}

      <div className="overflow-x-auto rounded-eight border-[3px] border-ink bg-card shadow-hardsm">
        <table className="w-full text-sm">
          <thead className="bg-line/40">
            <tr>
              <Th>預約編號</Th>
              <Th>姓名</Th>
              <Th>信箱</Th>
              <Th>日期</Th>
              <Th>場次</Th>
              <Th>人數</Th>
              <Th>狀態</Th>
              <Th>預約時間戳記</Th>
              <Th>操作</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-line ${r.status === "cancelled" ? "opacity-50" : ""}`}>
                <Td className="font-display font-bold">{r.bookingCode}</Td>
                <Td>{r.name}</Td>
                <Td>{r.email}</Td>
                <Td>{r.date}</Td>
                <Td>{r.timeSlot}</Td>
                <Td>{r.headcount}</Td>
                <Td>{STATUS_LABEL[r.status] ?? r.status}</Td>
                <Td>
                  {new Date(r.createdAt).toLocaleString("zh-TW", {
                    timeZone: "Asia/Taipei",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                  })}
                </Td>
                <Td>
                  {r.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => cancelBooking(r)}
                      disabled={cancellingId === r.id}
                      className="rounded-eight border-2 border-red px-2 py-0.5 text-xs font-bold text-red hover:bg-red/10 disabled:opacity-40"
                    >
                      {cancellingId === r.id ? "取消中…" : "取消預約"}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-muted">
                  沒有符合條件的預約
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap p-2 text-left font-bold text-ink">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap p-2 text-ink ${className}`}>{children}</td>;
}
