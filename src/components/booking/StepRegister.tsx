"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatDate } from "@/lib/timezone";

type SessionOption = { id: string; timeSlot: string; capacity: number; remaining: number };

export type BookingResult = {
  bookingCode: string;
  name: string;
  email: string;
  date: string;
  timeSlot: string;
  headcount: number;
};

// 單頁登記表單（卡片右欄）。日期固定為「今天」，因為使用者是現場掃 QR Code 進站。
// 樣式照業主提供的「體驗登記系統」Figma 參考稿：灰框大字日期、灰邊圓角方框按鈕，
// 選中是淡粉紅、額滿是灰底＋粉紅「額滿」標籤。
const OPTION_BASE = "h-11 rounded-lg border text-sm transition";
const OPTION_IDLE = "border-[#D9D9D9] bg-white text-ink hover:border-pink";
const OPTION_ACTIVE = "border-transparent bg-[#F6B8D4] font-bold text-ink";
const INPUT =
  "h-11 w-full rounded-lg border border-transparent bg-[#F3F3F5] px-3 text-sm text-ink placeholder:text-[#9A9AA0] focus:border-pink focus:bg-white focus:outline-none";

export default function StepRegister({
  dateStr,
  consentText,
  onDone
}: {
  dateStr: string;
  consentText: string;
  onDone: (result: BookingResult) => void;
}) {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadBusy, setLoadBusy] = useState(false);
  const [qrExpired, setQrExpired] = useState(false); // 開著頁面跨過午夜，通行 cookie 已失效
  const [loadFailed, setLoadFailed] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [consent, setConsent] = useState(false);
  const [termsViewed, setTermsViewed] = useState(false); // 需先點開條款彈窗看過才能勾選同意
  const [website, setWebsite] = useState(""); // honeypot

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  const emailInvalid = emailTouched && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    setLoading(true);
    setLoadBusy(false);
    const busyTimer = setTimeout(() => setLoadBusy(true), 3000);
    fetch(`/api/sessions?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions ?? []);
        setQrExpired(data.code === "QR_REQUIRED");
        setLoadFailed(false);
      })
      // 伺服器忙碌或出錯時回的不是 JSON（例如 500 空內容），不能讓它變成沒接住的錯誤，
      // 也不能誤顯示成「今天沒有場次」。
      .catch(() => setLoadFailed(true))
      .finally(() => {
        clearTimeout(busyTimer);
        setLoadBusy(false);
        setLoading(false);
      });
    return () => clearTimeout(busyTimer);
  }, [dateStr]);

  function selectHeadcount(n: number) {
    setHeadcount(n);
    if (selected && selected.remaining < n) {
      setSelectedId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected || !headcount) {
      setError("請先選擇體驗人數與時段。");
      return;
    }
    if (!consent) {
      setError("請先閱讀並勾選入場注意事項與個資使用同意聲明。");
      return;
    }

    setSubmitting(true);
    const busyTimer = setTimeout(() => setSubmitBusy(true), 3000);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selected.id, name, email, headcount, consent: true, website })
      });
      const data = await res.json();
      if (!res.ok) {
        setModalMessage(data.error ?? "送出失敗，請稍後再試一次");
        return;
      }
      onDone(data);
    } catch {
      setModalMessage("網路異常，請稍後再試一次");
    } finally {
      clearTimeout(busyTimer);
      setSubmitBusy(false);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Section title="體驗日期">
        <div className="rounded-xl bg-[#F5F5F5] py-6 text-center text-4xl font-bold tracking-wide text-ink md:text-5xl">
          {formatDate(dateStr, "yyyy/MM/dd")}
        </div>
      </Section>

      <Section title="體驗人數">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => selectHeadcount(n)}
              className={`${OPTION_BASE} ${headcount === n ? OPTION_ACTIVE : OPTION_IDLE}`}
            >
              {n} 位
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">含大人與小孩，需至少 1 位成人同行。</p>
      </Section>

      <Section title="體驗時段">
        {loading && (
          <div className="space-y-1 text-sm text-muted">
            <p className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-transparent"
                role="status"
                aria-label="載入中"
              />
              載入中…
            </p>
            {loadBusy && <p className="font-bold text-ink">目前系統使用人數眾多，資料載入需要幾秒鐘的時間，請耐心等候。</p>}
          </div>
        )}
        {!loading && qrExpired && (
          <p className="text-sm font-bold text-ink">QR Code 已過期，請掃描現場今天最新的 QR Code 再登記。</p>
        )}
        {!loading && loadFailed && (
          <p className="text-sm font-bold text-ink">場次載入失敗，請稍後重新整理頁面再試一次。</p>
        )}
        {!loading && !qrExpired && !loadFailed && sessions.length === 0 && (
          <p className="text-sm text-muted">今天沒有可登記的場次了。</p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {sessions.map((s) => {
            const full = s.remaining <= 0;
            const insufficient = !full && headcount !== null && s.remaining < headcount;
            const active = selectedId === s.id;

            const boxClass = full
              ? "cursor-not-allowed border-transparent bg-[#F2F2F2] text-ink"
              : active
                ? OPTION_ACTIVE
                : insufficient
                  ? `${OPTION_IDLE} cursor-not-allowed opacity-50`
                  : OPTION_IDLE;

            return (
              <button
                key={s.id}
                type="button"
                disabled={full || insufficient}
                onClick={() => setSelectedId(s.id)}
                className={`${OPTION_BASE} relative flex items-center justify-center font-bold ${boxClass}`}
              >
                {s.timeSlot}
                <span
                  className={`absolute right-3 rounded-full border px-2 text-[10px] leading-4 ${
                    full ? "border-pink text-pink" : "border-[#BDBDBD] bg-[#F2F2F2] text-ink"
                  }`}
                >
                  {full ? "額滿" : `餘 ${s.remaining}`}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="登記資料">
        <div className="grid grid-cols-2 gap-3">
          <Field label="姓名">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入姓名"
              className={INPUT}
            />
          </Field>
          <div>
            <Field label="E-mail">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="請輸入 E-mail"
                className={`${INPUT} ${emailInvalid ? "border-hotred" : ""}`}
              />
            </Field>
            {emailInvalid && (
              <p className="mt-1 text-xs font-bold text-hotred">信箱格式不正確，確認信會寄到這個信箱，請再確認一次。</p>
            )}
          </div>
        </div>

        {/* Honeypot：sr-only 隱藏而非 display:none 或 -9999px，避免手機瀏覽器把整頁橫向撐開。 */}
        <div className="sr-only" aria-hidden="true">
          <label>
            網站
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
      </Section>

      {/* 參考稿只有一行勾選；送出須知與個資聲明收進可點開的彈窗，內容不變。 */}
      {/* 需先點開條款看過一次，checkbox 才會解鎖可勾選。 */}
      <div className="flex items-start gap-2 text-xs text-muted">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          disabled={!termsViewed}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-pink disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span>
          <label htmlFor="consent" className={termsViewed ? "cursor-pointer" : "cursor-not-allowed"}>
            我已閱讀並同意
          </label>{" "}
          <button type="button" onClick={() => setTermsOpen(true)} className="font-bold text-ink underline">
            隱私權條款 &amp; 體驗安全須知
          </button>
          <span className="text-pink"> *</span>
          {!termsViewed && <span className="mt-1 block text-hotred">請先點選並閱讀上方條款，才能勾選同意。</span>}
        </span>
      </div>

      {submitBusy && (
        <p className="rounded-lg bg-[#FFF8D6] p-3 text-sm font-bold text-ink">
          目前系統使用量較高，正在為您處理，請耐心等候，不要重新整理或離開頁面喔！
        </p>
      )}
      {error && <p className="text-sm font-bold text-hotred">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-full bg-pink md:rounded-lg text-base font-bold text-white transition hover:bg-pinkdeep disabled:bg-[#D9D9D9]"
      >
        {submitting ? "送出中…" : "確認登記"}
      </button>

      {modalMessage && <Modal title={modalMessage} onClose={() => setModalMessage(null)} />}
      {termsOpen && (
        <TermsModal
          consentText={consentText}
          onClose={() => {
            setTermsOpen(false);
            setTermsViewed(true);
          }}
        />
      )}
    </form>
  );
}

function TermsModal({ consentText, onClose }: { consentText: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-base font-bold text-ink">體驗安全須知</p>
        <p className="text-sm leading-7 text-ink">
          送出後不能取消或修改，請確認人數與時段無誤再送出；請於體驗時間前 10 分鐘到場報到，逾時不候。
        </p>
        {consentText && (
          <>
            <p className="mb-3 mt-5 text-base font-bold text-ink">隱私權條款</p>
            <p className="whitespace-pre-line text-sm leading-7 text-ink">{consentText}</p>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-11 w-full rounded-lg bg-pink text-sm font-bold text-white hover:bg-pinkdeep"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-bold text-ink">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}
