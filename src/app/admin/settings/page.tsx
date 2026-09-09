"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

export default function AdminSettingsPage() {
  const [bannerText, setBannerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/event")
      .then((r) => r.json())
      .then((data) => setBannerText(data.bannerText ?? ""))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerText })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "儲存失敗");
        return;
      }
      setMessage("已儲存");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 font-display text-xl font-bold text-ink">活動設定</h1>

      <div className="rounded-eight border-[3px] border-ink bg-card p-4 shadow-hardsm">
        <label className="block text-sm">
          <span className="mb-1 block font-bold text-ink">布告欄文字</span>
          <span className="mb-2 block text-xs text-muted">顯示在前台選日期頁面上方，可隨時更新（例如臨時休館公告）</span>
          {loading ? (
            <p className="text-sm text-muted">載入中…</p>
          ) : (
            <textarea
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full rounded-eight border-2 border-ink bg-card px-3 py-2 focus:border-[3px] focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          )}
        </label>

        {message && <p className="mt-2 text-sm font-bold text-green">{message}</p>}
        {error && <p className="mt-2 text-sm font-bold text-red">{error}</p>}

        <div className="mt-3 max-w-xs">
          <Button type="button" variant="continue" onClick={handleSave} disabled={loading || saving}>
            {saving ? "儲存中…" : "儲存"}
          </Button>
        </div>
      </div>
    </main>
  );
}
