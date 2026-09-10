"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

type PhaseOpenRule = { openDate: string; appliesToMonth: string };

export default function AdminSettingsPage() {
  const [bannerText, setBannerText] = useState("");
  const [phaseOpenRules, setPhaseOpenRules] = useState<PhaseOpenRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/event")
      .then((r) => r.json())
      .then((data) => {
        setBannerText(data.bannerText ?? "");
        setPhaseOpenRules(data.phaseOpenRules ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateRule(idx: number, field: keyof PhaseOpenRule, value: string) {
    setPhaseOpenRules((rules) => rules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addRule() {
    setPhaseOpenRules((rules) => [...rules, { openDate: "", appliesToMonth: "" }]);
  }

  function removeRule(idx: number) {
    setPhaseOpenRules((rules) => rules.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerText, phaseOpenRules })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "儲存失敗");
        return;
      }
      setPhaseOpenRules(data.phaseOpenRules ?? []);
      setMessage("已儲存");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 font-display text-xl font-bold text-ink">活動設定</h1>

      <div className="space-y-6 rounded-eight border-[3px] border-ink bg-card p-4 shadow-hardsm">
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

        <div>
          <span className="mb-1 block text-sm font-bold text-ink">分階段開放日期</span>
          <span className="mb-2 block text-xs text-muted">
            設定每個月份從哪一天開始開放預約（例如 11 月從 10/20 開始可以訂），使用者在開放日之前只會看到「未開放」。
          </span>

          {loading ? (
            <p className="text-sm text-muted">載入中…</p>
          ) : (
            <div className="space-y-2">
              {phaseOpenRules.map((rule, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2">
                  <label className="text-xs font-bold text-ink">
                    對應月份
                    <input
                      type="month"
                      value={rule.appliesToMonth}
                      onChange={(e) => updateRule(idx, "appliesToMonth", e.target.value)}
                      className="mt-1 block rounded-eight border-2 border-ink bg-card px-2 py-1 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-bold text-ink">
                    開放日期
                    <input
                      type="date"
                      value={rule.openDate}
                      onChange={(e) => updateRule(idx, "openDate", e.target.value)}
                      className="mt-1 block rounded-eight border-2 border-ink bg-card px-2 py-1 text-sm font-normal"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="rounded-eight border-2 border-ink bg-card px-3 py-1.5 text-xs font-bold text-red"
                  >
                    刪除
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addRule}
                className="rounded-eight border-2 border-dashed border-line px-3 py-1.5 text-xs font-bold text-muted"
              >
                ＋ 新增一筆規則
              </button>
            </div>
          )}
        </div>

        {message && <p className="text-sm font-bold text-green">{message}</p>}
        {error && <p className="text-sm font-bold text-red">{error}</p>}

        <div className="max-w-xs">
          <Button type="button" variant="continue" onClick={handleSave} disabled={loading || saving}>
            {saving ? "儲存中…" : "儲存"}
          </Button>
        </div>
      </div>
    </main>
  );
}
