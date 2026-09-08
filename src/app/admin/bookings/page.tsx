"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
};

export default function AdminBookingsPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setLoading(true);
    const qs = date ? `?date=${date}` : "";
    fetch(`/api/admin/bookings${qs}`)
      .then((r) => r.json())
      .then((data) => setRows(data.bookings ?? []))
      .finally(() => setLoading(false));
  }, [date]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">預約查詢</h1>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded border border-black/20 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-40"
        >
          {loggingOut ? "登出中…" : "登出"}
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
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
                <Td>{r.checkedIn ? "已到場" : "未到場"}</Td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center opacity-60">
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
