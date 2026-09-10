"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

type BackupRow = {
  id: string;
  createdAt: string;
  rowCounts: { events: number; sessionTemplates: number; sessions: number; bookings: number };
};

export default function AdminBackupsPage() {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/backups")
      .then((r) => r.json())
      .then((data) => setBackups(data.backups ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function backupNow() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "備份失敗");
        return;
      }
      load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 font-display text-xl font-bold text-ink">資料備份</h1>

      <p className="mb-4 text-sm text-muted">
        系統每天台北時間凌晨 3 點會自動備份一次展會、場次、預約資料，全部保留、不會自動刪除舊的。
        也可以隨時手動立即備份一次。
      </p>

      <div className="mb-4 max-w-xs">
        <Button type="button" variant="continue" onClick={backupNow} disabled={creating}>
          {creating ? "備份中…" : "立即手動備份"}
        </Button>
      </div>

      {error && <p className="mb-3 text-sm font-bold text-red">{error}</p>}

      <div className="overflow-x-auto rounded-eight border-[3px] border-ink bg-card shadow-hardsm">
        <table className="w-full text-sm">
          <thead className="bg-line/40">
            <tr>
              <Th>備份時間</Th>
              <Th>展會</Th>
              <Th>場次樣板</Th>
              <Th>場次</Th>
              <Th>預約</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">
                  載入中…
                </td>
              </tr>
            )}
            {!loading &&
              backups.map((b) => (
                <tr key={b.id} className="border-t border-line">
                  <Td>{new Date(b.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</Td>
                  <Td>{b.rowCounts.events}</Td>
                  <Td>{b.rowCounts.sessionTemplates}</Td>
                  <Td>{b.rowCounts.sessions}</Td>
                  <Td>{b.rowCounts.bookings}</Td>
                  <Td>
                    <a
                      href={`/api/admin/backups/${b.id}`}
                      className="rounded-eight border-2 border-ink px-3 py-1 font-bold hover:bg-line/40"
                    >
                      下載
                    </a>
                  </Td>
                </tr>
              ))}
            {!loading && backups.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">
                  還沒有任何備份紀錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="p-2 text-left font-bold text-ink">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-2 text-ink">{children}</td>;
}
