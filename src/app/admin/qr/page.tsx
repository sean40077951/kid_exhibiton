"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Button from "@/components/ui/Button";

type QrInfo = { date: string; today: string; path: string; gateEnabled: boolean };

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AdminQrPage() {
  const [date, setDate] = useState<string | null>(null);
  const [info, setInfo] = useState<QrInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const load = useCallback((d: string | null) => {
    setError(null);
    fetch(`/api/admin/qr${d ? `?date=${d}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setInfo(data);
        setDate(data.date);
      })
      .catch(() => setError("載入失敗，請重新整理"));
  }, []);

  useEffect(() => load(null), [load]);

  const fullUrl = info ? `${window.location.origin}${info.path}` : "";

  useEffect(() => {
    if (!fullUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, fullUrl, { width: 320, margin: 2, errorCorrectionLevel: "M" }).catch(() =>
      setError("QR Code 產生失敗")
    );
  }, [fullUrl]);

  async function toggleGate() {
    if (!info) return;
    const next = !info.gateEnabled;
    const msg = next
      ? "確定要開啟嗎？開啟後，沒有掃過當天 QR Code 的人會看不到登記表單。"
      : "確定要關閉嗎？關閉後任何人打開網址就能登記，不需要掃 QR Code。";
    if (!window.confirm(msg)) return;
    setToggling(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/qr", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateEnabled: next })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "切換失敗");
        return;
      }
      setInfo({ ...info, gateEnabled: data.gateEnabled });
    } finally {
      setToggling(false);
    }
  }

  // 下載成可直接列印的 PNG：QR Code 上方加日期，避免現場人員拿錯天的。
  async function downloadPng() {
    if (!info) return;
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, fullUrl, { width: 900, margin: 2, errorCorrectionLevel: "M" });
    const out = document.createElement("canvas");
    out.width = 1000;
    out.height = 1180;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText("怪獸放電場　現場登記", 500, 90);
    ctx.font = "bold 72px sans-serif";
    ctx.fillText(info.date.replace(/-/g, "/"), 500, 180);
    ctx.drawImage(qr, 50, 230, 900, 900);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = `qrcode-${info.date}.png`;
    a.click();
  }

  const isToday = info ? info.date === info.today : false;
  const isPast = info ? info.date < info.today : false;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="font-display text-xl font-bold text-ink">現場 QR Code</h1>

      <div className="rounded-eight border-[3px] border-ink bg-card p-4 shadow-hardsm">
        <p className="text-sm leading-6 text-ink">
          每天 00:00（台北時間）自動換一組新的 QR Code，前一天的 QR Code 當天就失效。
          現場掃描後，當天可以登記；隔天要重新掃新的。也可以先切到明天以後的日期，提前下載、印好。
        </p>
      </div>

      <div className="rounded-eight border-[3px] border-ink bg-card p-4 shadow-hardsm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">要求掃 QR Code 才能登記</p>
            <p className="mt-1 text-xs text-muted">
              {info?.gateEnabled ? "已開啟：沒掃 QR Code 的人看不到登記表單。" : "未開啟：目前任何人打開網址都可以登記。"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleGate}
            disabled={!info || toggling}
            role="switch"
            aria-checked={info?.gateEnabled ?? false}
            className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-ink transition disabled:opacity-40 ${
              info?.gateEnabled ? "bg-navy" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                info?.gateEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="rounded-eight border-[3px] border-ink bg-card p-4 shadow-hardsm">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={!date}
            onClick={() => date && load(shiftDate(date, -1))}
            className="rounded-eight border-2 border-ink px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40 disabled:opacity-40"
          >
            ← 前一天
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-ink">{info ? info.date.replace(/-/g, "/") : "載入中…"}</p>
            {info && (
              <p className={`text-xs font-bold ${isToday ? "text-green" : isPast ? "text-red" : "text-muted"}`}>
                {isToday ? "今天（現場使用這張）" : isPast ? "已過期，掃了無效" : "尚未到期，當天才有效"}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!date}
            onClick={() => date && load(shiftDate(date, 1))}
            className="rounded-eight border-2 border-ink px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40 disabled:opacity-40"
          >
            後一天 →
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <canvas
            ref={canvasRef}
            className={`h-auto w-full max-w-[320px] rounded-eight border-2 border-ink ${isPast ? "opacity-30" : ""}`}
          />
          {info && <p className="max-w-full break-all text-center text-xs text-muted">{fullUrl}</p>}
          <div className="w-full max-w-xs space-y-2">
            <Button type="button" variant="continue" onClick={downloadPng} disabled={!info}>
              下載 PNG（可列印）
            </Button>
            {info && !isToday && (
              <button
                type="button"
                onClick={() => load(info.today)}
                className="w-full rounded-eight border-2 border-ink px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40"
              >
                回到今天
              </button>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-bold text-red">{error}</p>}
      </div>
    </main>
  );
}
