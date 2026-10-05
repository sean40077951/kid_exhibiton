"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FrameBackground, MobileFrameBackground, SiteHeader, Footer } from "@/components/booking/BookingWizard";

type Info = {
  bookingCode: string;
  name: string;
  date: string;
  timeSlot: string;
  headcount: number;
  cancelled: boolean;
  canCancel: boolean;
};

// 使用者從確認信「取消預約」按鈕進來的頁面。先顯示預約資訊，再按「確認取消」才真的取消
// （不是點連結就取消，避免信箱預先掃描連結而誤觸發）。
function CancelContent() {
  const params = useSearchParams();
  const b = params.get("b") ?? "";
  const t = params.get("t") ?? "";

  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "done" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!b || !t) {
      setState("invalid");
      return;
    }
    fetch(`/api/cancel?b=${encodeURIComponent(b)}&t=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (!r.ok) {
          setState("invalid");
          return;
        }
        setInfo(await r.json());
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [b, t]);

  async function confirmCancel() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ b, t })
      });
      const data = await res.json();
      if (res.ok) {
        setState("done");
        return;
      }
      if (data.code === "ALREADY_CANCELLED") {
        setInfo((i) => (i ? { ...i, cancelled: true, canCancel: false } : i));
        return;
      }
      if (data.code === "PAST_CANCEL_CUTOFF") {
        setInfo((i) => (i ? { ...i, canCancel: false } : i));
        return;
      }
      setMessage(data.error ?? "取消失敗，請稍後再試一次");
    } catch {
      setMessage("網路異常，請稍後再試一次");
    } finally {
      setBusy(false);
    }
  }

  let title = "取消預約";
  let body: React.ReactNode = null;

  if (state === "loading") {
    body = <p className="text-sm text-muted">載入中…</p>;
  } else if (state === "invalid") {
    title = "取消連結無效";
    body = <p className="text-sm leading-7 text-ink">這個連結無法使用，請回到確認信，點選信裡的「取消預約」按鈕。</p>;
  } else if (state === "error") {
    body = <p className="text-sm font-bold text-ink">載入失敗，請稍後重新整理頁面再試一次。</p>;
  } else if (state === "done" || (info && info.cancelled)) {
    title = "預約已取消";
    body = (
      <p className="text-sm leading-7 text-ink">
        {info ? `預約編號 ${info.bookingCode} 已取消，名額已釋出。` : "預約已取消，名額已釋出。"}
        如需重新登記，請於現場掃描 QR Code。
      </p>
    );
  } else if (info) {
    body = (
      <div className="space-y-5">
        <div className="space-y-2">
          {[
            ["預約編號", info.bookingCode],
            ["姓名", info.name],
            ["日期", info.date.replace(/-/g, "/")],
            ["時段", info.timeSlot],
            ["人數", `${info.headcount} 人`]
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 rounded-lg bg-[#F5F5F5] px-4 py-3 text-sm">
              <span className="w-20 shrink-0 font-bold text-ink">{k}</span>
              <span className="text-ink">{v}</span>
            </div>
          ))}
        </div>

        {info.canCancel ? (
          <>
            <p className="text-xs leading-6 text-muted">確認取消後無法復原，名額會釋出給其他人。請於場次開始前 1 小時完成取消。</p>
            {message && <p className="text-sm font-bold text-hotred">{message}</p>}
            <button
              type="button"
              onClick={confirmCancel}
              disabled={busy}
              className="h-12 w-full rounded-full bg-pink text-base font-bold text-white transition hover:bg-pinkdeep disabled:bg-[#D9D9D9] md:rounded-lg"
            >
              {busy ? "取消中…" : "確認取消預約"}
            </button>
          </>
        ) : (
          <p className="rounded-lg bg-[#FFF8D6] px-4 py-3 text-sm font-bold leading-7 text-ink">
            已超過可取消的時間（場次開始前 1 小時），如需協助請洽現場工作人員。
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="frame-bg relative">
          <FrameBackground />
          <MobileFrameBackground />
          <SiteHeader />
          <div className="relative px-4 pb-14 pt-4 md:px-[5%] md:pb-[8%] md:pt-8">
            <section className="relative mx-auto max-w-xl bg-white px-6 pb-8 pt-12 shadow-soft md:px-10">
              <span className="absolute left-0 top-0 bg-[#FFF200] px-2.5 py-1 text-xs font-bold text-ink">取消預約</span>
              <h1 className="mb-5 text-xl font-bold text-ink">{title}</h1>
              {body}
            </section>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={null}>
      <CancelContent />
    </Suspense>
  );
}
