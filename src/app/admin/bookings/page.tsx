"use client";

import { useEffect, useState } from "react";

type BookingRow = {
  id: string;
  bookingCode: string;
  name: string;
  phone: string;
  email: string;
  headcount: number;
  date: string;
  timeSlot: string;
  status: string;
  checkedIn: boolean;
  createdAt: string;
};

// 場次時間固定樣板（同一份清單也用在 prisma/seed.ts），這裡拿來當篩選選單用。
const TIME_SLOTS = ["10:00", "10:35", "11:10", "11:45", "13:30", "14:05", "14:40", "15:15", "15:50", "16:25"];

export default function AdminBookingsPage() {
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (timeSlot) params.set("timeSlot", timeSlot);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/admin/bookings${qs}`)
      .then((r) => r.json())
      .then((data) => setRows(data.bookings ?? []))
      .finally(() => setLoading(false));
  }, [date, timeSlot]);

  async function toggleCheckedIn(id: string, checkedIn: boolean) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedIn })
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, checkedIn } : r)));
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-bold">預約查詢</h1>

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
        <label className="text-sm">
          場次
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="ml-2 rounded border border-black/20 px-2 py-1"
          >
            <option value="">全部</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {loading && <span className="text-sm opacity-60">載入中…</span>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <Th>預約編號</Th>
              <Th>姓名</Th>
              <Th>電話</Th>
              <Th>信箱</Th>
              <Th>日期</Th>
              <Th>場次</Th>
              <Th>人數</Th>
              <Th>狀態</Th>
              <Th>到場</Th>
              <Th>預約時間戳記</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/5">
                <Td>{r.bookingCode}</Td>
                <Td>{r.name}</Td>
                <Td>{r.phone}</Td>
                <Td>{r.email}</Td>
                <Td>{r.date}</Td>
                <Td>{r.timeSlot}</Td>
                <Td>{r.headcount}</Td>
                <Td>{r.status}</Td>
                <Td>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.checkedIn}
                      onChange={(e) => toggleCheckedIn(r.id, e.target.checked)}
                      disabled={savingId === r.id}
                    />
                    {r.checkedIn ? "已到場" : "未到場"}
                  </label>
                </Td>
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
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-4 text-center opacity-60">
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
  return <th className="p-2 text-left font-bold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-2">{children}</td>;
}
