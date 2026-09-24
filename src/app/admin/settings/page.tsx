"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import RichIntro from "@/components/booking/RichIntro";

type PhaseOpenRule = { openDate: string; appliesToMonth: string };

export default function AdminSettingsPage() {
  const [introText, setIntroText] = useState("");
  const [phaseOpenRules, setPhaseOpenRules] = useState<PhaseOpenRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/event")
      .then((r) => r.json())
      .then((data) => {
        setIntroText(data.introText ?? "");
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
        body: JSON.stringify({ introText, phaseOpenRules })
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
          <span className="mb-1 block font-bold text-ink">展覽介紹</span>
          <span className="mb-2 block text-xs leading-5 text-muted">
            顯示在前台登記頁面左欄（桌機）／表單上方（手機）。用下面的符號設定文字樣式，下方會即時預覽：
          </span>
          <span className="mb-2 block rounded-eight bg-line/40 p-2 text-xs leading-6 text-ink">
            <code># 文字</code>　大標題　<code>## 文字</code>　粗體小標題　<code>**文字**</code>　行內粗體
            <br />
            <code>&gt; 文字</code>　灰色小字　<code>@時間 文字</code>　灰字＋時鐘圖示　<code>@地點 文字</code>　灰字＋地點圖示
            <br />
            <code>---</code>　虛線分隔　空一行＝段落間距
          </span>
          {loading ? (
            <p className="text-sm text-muted">載入中…</p>
          ) : (
            <textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={8}
              maxLength={1000}
              className="w-full rounded-eight border-2 border-ink bg-card px-3 py-2 focus:border-[3px] focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          )}
        </label>

        {!loading && introText.trim() && (
          <div>
            <span className="mb-1 block text-sm font-bold text-ink">前台預覽</span>
            <div className="rounded-eight border-2 border-line bg-[#FBF8F2] p-4">
              <RichIntro source={introText} />
            </div>
          </div>
        )}

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
