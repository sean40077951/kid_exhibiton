"use client";

import { useEffect, useState } from "react";
import StepRegister, { type BookingResult } from "./StepRegister";
import StepSuccess from "./StepSuccess";
import { formatDate, todayDateStringInTaipei } from "@/lib/timezone";

type EventConfig = {
  name: string;
  bannerText: string;
  introText: string;
  noticeText: string;
  consentText: string;
  dateRangeEnd: string;
  qrGate: { enabled: boolean; passed: boolean };
};

// 版面照業主提供的「體驗登記系統」Figma 參考稿：
// 藍底花瓣邊框鋪滿固定寬度畫布（畫布外留白），頁首是浮在邊框上的白色小框，
// 中間一張直角卡片，桌機左右兩欄（左米白＝活動介紹、右純白＝登記表單），手機上下堆疊。
export default function BookingWizard() {
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [scanInvalid, setScanInvalid] = useState(false);

  useEffect(() => {
    // /enter 遇到過期或錯誤的 QR Code 會導回 /?gate=invalid。
    setScanInvalid(new URLSearchParams(window.location.search).get("gate") === "invalid");
    fetch("/api/event")
      .then((r) => r.json())
      .then((data) => setEvent(data))
      .catch(() => setEvent(null));
  }, []);

  // 展期結束後頁面全部關閉（業主須知回覆 4-2），要有明確的結束畫面。
  const eventEnded = event ? todayDateStringInTaipei() > formatDate(event.dateRangeEnd, "yyyy-MM-dd") : false;

  // 門禁開啟、且這個瀏覽器還沒掃過今天的 QR Code：不顯示表單，請對方掃現場 QR Code。
  const gated = event ? event.qrGate.enabled && !event.qrGate.passed : false;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="frame-bg relative">
          <FrameBackground />
          <SiteHeader />

          <div className="relative px-3 pb-6 pt-3 md:px-[5%] md:pb-[4%] md:pt-2">
            {eventEnded ? (
              <section className="relative bg-white px-6 py-16 text-center shadow-soft">
                <p className="text-xl font-bold text-ink">本次活動已結束</p>
                <p className="mt-3 text-sm text-muted">感謝大家的參與，期待未來還有機會再相見！</p>
              </section>
            ) : gated ? (
              <section className="relative bg-white px-6 py-16 text-center shadow-soft">
                <p className="text-xl font-bold text-ink">
                  {scanInvalid ? "此 QR Code 已失效" : "請掃描現場 QR Code 登記"}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {scanInvalid
                    ? "QR Code 每天更新，請掃描現場今天最新的 QR Code。"
                    : "本登記系統僅開放現場民眾使用，請至展場掃描今天的 QR Code 進入。"}
                </p>
              </section>
            ) : (
              <section className="relative grid overflow-hidden shadow-soft md:grid-cols-2">
                <IntroPanel
                  eventName={event?.name ?? "怪獸放電場"}
                  bannerText={event?.bannerText ?? ""}
                  introText={event?.introText ?? ""}
                />

                <div className="relative bg-white px-5 pb-8 pt-12 md:px-10 md:pb-12 md:pt-16">
                  <span className="absolute left-0 top-0 bg-[#FFF200] px-2.5 py-1 text-xs font-bold text-ink">
                    {result ? "登記確認" : "體驗登記"}
                  </span>

                  {/* 手機版上下堆疊，參考稿在登記區開頭重複一次活動名稱。 */}
                  <h2 className="mb-6 text-xl font-bold leading-snug text-ink md:hidden">
                    {event?.name ?? "怪獸放電場"}
                  </h2>

                  {!result && (
                    <StepRegister
                      dateStr={todayDateStringInTaipei()}
                      consentText={event?.consentText ?? ""}
                      onDone={(res) => setResult(res)}
                    />
                  )}

                  {result && (
                    <StepSuccess
                      result={result}
                      noticeText={event?.noticeText ?? ""}
                      onRestart={() => setResult(null)}
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function IntroPanel({ eventName, bannerText, introText }: { eventName: string; bannerText: string; introText: string }) {
  return (
    <div className="space-y-4 bg-[#FBF8F2] px-5 py-8 md:px-10 md:py-16">
      {bannerText && (
        <p className="rounded-lg bg-skyblue px-4 py-2.5 text-sm font-bold text-white">{bannerText}</p>
      )}
      <h1 className="text-2xl font-bold leading-snug text-ink md:text-3xl">{eventName}</h1>
      {introText && <p className="whitespace-pre-line text-sm leading-7 text-ink">{introText}</p>}
    </div>
  );
}

// 頁首：浮在花瓣邊框上的白色圓角小框（左），政府合作 logo 放在右上角白色方塊。
// 參考稿小框裡還有「競技場介紹／選手登入」等選單，系統沒有對應頁面，不放。
// 手機版照參考稿改成整條白色橫條，logo 收在橫條右側。
function SiteHeader() {
  return (
    <header className="relative flex items-start justify-between px-3 pt-3 md:px-4 md:pt-4">
      <div className="flex w-full items-center gap-3 rounded-2xl bg-white py-1.5 pl-4 pr-2 shadow-softsm md:w-auto md:py-2 md:pr-4">
        <span className="text-lg font-black text-pink">怪獸放電場</span>
        <span className="rounded-full bg-pink px-3 py-1 text-xs font-bold text-white">線上登記</span>
        <img src="/pattern/logo-newtaipei.png" alt="" aria-hidden="true" className="ml-auto h-10 w-auto md:hidden" />
      </div>
      <div className="absolute right-0 top-0 hidden bg-white p-1.5 md:block">
        <img src="/pattern/logo-newtaipei.png" alt="" aria-hidden="true" className="h-16 w-auto" />
      </div>
    </header>
  );
}

// 頁尾：亮黃色，版權文字靠左。參考稿右側的隱私政策等連結系統沒有對應頁面，不放。
function Footer() {
  return (
    <footer className="bg-[#FFF200] px-5 py-6 text-sm font-bold text-ink md:px-[4%]">
      © {new Date().getFullYear()} 怪獸放電場. All rights reserved.
    </footer>
  );
}

// 桌機版花瓣邊框（業主提供的 8 張圖，原始檔在 ui/new/，見 public/pattern/）：
// 四角各一張專用角落圖、上下緣各 3 張、左右緣各 2 張。業主指定的對應關係：
//   左上=corner-tl(vector2)  上緣×3=edge-top(vector1)   右上=corner-tr(vector，無編號)
//   左緣×2=edge-left(vector4) 右緣×2=edge-right(vector3)
//   左下=corner-bl(vector6)  下緣×3=edge-bottom(vector5) 右下=corner-br(vector7)
// 用絕對定位的 <img> 依原始畫布（1444×1371px）比例擺放；不用 CSS background-position，
// 因為它的 % 是「容器減圖片後再乘比例」，多張疊起來位置會兜不起來。
// 手機版畫面又窄又長，照這個比例會把花瓣拉成細長橢圓，所以手機改用 .frame-bg 的
// 左右重複花瓣邊（見 globals.css），這組只在 md 以上顯示。
type FramePiece = { src: string; left: number; top: number; width: number; height: number };
const FRAME_PIECES: FramePiece[] = [
  { src: "corner-tl", left: 0, top: 0, width: 22.784, height: 26.331 },
  { src: "edge-top", left: 22.784, top: 0, width: 18.144, height: 26.331 },
  { src: "edge-top", left: 40.928, top: 0, width: 18.144, height: 26.331 },
  { src: "edge-top", left: 59.072, top: 0, width: 18.144, height: 26.331 },
  { src: "corner-tr", left: 77.216, top: 0, width: 22.784, height: 26.331 },
  { src: "edge-left", left: 0, top: 26.331, width: 22.784, height: 23.705 },
  { src: "edge-left", left: 0, top: 50.036, width: 22.784, height: 23.705 },
  { src: "edge-right", left: 77.216, top: 26.331, width: 22.784, height: 23.705 },
  { src: "edge-right", left: 77.216, top: 50.036, width: 22.784, height: 23.705 },
  { src: "corner-bl", left: 0, top: 73.742, width: 22.784, height: 26.258 },
  { src: "edge-bottom", left: 22.784, top: 73.742, width: 18.144, height: 26.258 },
  { src: "edge-bottom", left: 40.928, top: 73.742, width: 18.144, height: 26.258 },
  { src: "edge-bottom", left: 59.072, top: 73.742, width: 18.144, height: 26.258 },
  { src: "corner-br", left: 77.216, top: 73.742, width: 22.784, height: 26.258 }
];

function FrameBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block" aria-hidden="true">
      {FRAME_PIECES.map((p, i) => (
        <img
          key={i}
          src={`/pattern/${p.src}.png`}
          alt=""
          className="absolute"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` }}
        />
      ))}
    </div>
  );
}
