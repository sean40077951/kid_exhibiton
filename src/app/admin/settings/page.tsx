"use client";

import { useEffect, useState } from "react";

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
      <h1 className="mb-4 text-xl font-bold">活動設定</h1>

      <div className="rounded-lg border border-black/10 p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-bold">布告欄文字</span>
          <span className="mb-2 block text-xs opacity-60">顯示在前台選日期頁面上方，可隨時更新（例如臨時休館公告）</span>
          {loading ? (
            <p className="text-sm opacity-60">載入中…</p>
          ) : (
            <textarea
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full rounded border border-black/20 px-3 py-2"
            />
          )}
        </label>

        {message && <p className="mt-2 text-sm font-bold text-green-700">{message}</p>}
        {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="mt-3 rounded bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "儲存中…" : "儲存"}
        </button>
      </div>
    </main>
  );
}
