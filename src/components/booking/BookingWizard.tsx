"use client";

import { useEffect, useState } from "react";
import StepRegister, { type BookingResult } from "./StepRegister";
import StepSuccess from "./StepSuccess";
import RichIntro from "./RichIntro";
import { formatDate, todayDateStringInTaipei } from "@/lib/timezone";

type EventConfig = {
  name: string;
  introText: string;
  noticeText: string;
  consentText: string;
  dateRangeEnd: string;
  qrGate: { enabled: boolean; passed: boolean };
};

// 版面照業主提供的「體驗登記系統」Figma 參考稿：
// 藍底花瓣邊框鋪滿固定寬度畫布（畫布外留白），頁首是浮在邊框上的白色小框，
// 中間一張直角卡片，桌機左右兩欄（左米白＝活動介紹、右純白＝登記表單），手機上下堆疊。
export default function BookingWizard({
  previewMode = false,
  previewDate
}: {
  // 後台「前台預覽」用（src/app/admin/preview/page.tsx）：可以看任何一天的畫面，
  // 不受「本次活動已結束」「QR 門禁」影響，送出登記也不會真的建立預約。
  previewMode?: boolean;
  previewDate?: string;
}) {
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

  const dateStr = previewMode && previewDate ? previewDate : todayDateStringInTaipei();

  // 展期結束後頁面全部關閉（業主須知回覆 4-2），要有明確的結束畫面。預覽模式下不套用，
  // 讓管理者可以檢查展期結束日之後、或還沒開展前的畫面長怎樣。
  const eventEnded = !previewMode && event ? todayDateStringInTaipei() > formatDate(event.dateRangeEnd, "yyyy-MM-dd") : false;

  // 門禁開啟、且這個瀏覽器還沒掃過今天的 QR Code：不顯示表單，請對方掃現場 QR Code。
  // 預覽模式一律不套用門禁，管理者不用另外掃 QR Code 才能檢查畫面。
  const gated = !previewMode && event ? event.qrGate.enabled && !event.qrGate.passed : false;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="frame-bg relative">
          <FrameBackground />
          <MobileFrameBackground />
          <SiteHeader />

          <div className="relative px-4 pb-14 pt-4 md:px-[5%] md:pb-[4%] md:pt-2">
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
                  eventName={event?.name ?? "體驗登記系統"}
                  introText={event?.introText ?? ""}
                />

                <div className="relative bg-white px-5 pb-8 pt-12 md:px-10 md:pb-12 md:pt-16">
                  <span className="absolute left-0 top-0 bg-[#FFF200] px-2.5 py-1 text-xs font-bold text-ink">
                    {result ? "登記確認" : "體驗登記"}
                  </span>

                  {/* 手機版上下堆疊，參考稿在登記區開頭重複一次活動名稱。 */}
                  <h2 className="mb-6 text-xl font-bold leading-snug text-ink md:hidden">
                    {event?.name ?? "體驗登記系統"}
                  </h2>

                  {!result && (
                    <StepRegister
                      dateStr={dateStr}
                      consentText={event?.consentText ?? ""}
                      onDone={(res) => setResult(res)}
                      previewMode={previewMode}
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

function IntroPanel({ eventName, introText }: { eventName: string; introText: string }) {
  return (
    <div className="relative space-y-4 bg-[#FDF9F5] px-5 py-8 md:px-10 md:py-16">
      {/* 展覽介紹裡自己寫了「# 大標題」時就不再重複顯示展會名稱。 */}
      {!/^# /m.test(introText) && (
        <h1 className="text-2xl font-bold leading-snug text-ink md:text-3xl">{eventName}</h1>
      )}
      {introText && <RichIntro source={introText} />}
      {/* 業主第二版素材：右上藍色怪獸、左下兩隻橘色怪獸。放在文字之後、絕對定位，不影響排版。 */}
      <img
        src="/monsters/intro-blue.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-14 w-24 md:right-10 md:top-28 md:w-40"
      />
      <img
        src="/monsters/intro-pair.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-3 w-28 md:bottom-4 md:left-8 md:w-40"
      />
      <div className="h-24 md:h-32" aria-hidden="true" />
    </div>
  );
}

// 頁首：浮在花瓣邊框上的白色圓角小框（左，放「怪獸放電場 PLAY TOGETHER!」標題圖），政府合作 logo 放在右上角白色方塊。
// 參考稿小框裡還有「競技場介紹／選手登入」等選單，系統沒有對應頁面，不放。
// 手機版照參考稿改成整條白色橫條，logo 收在橫條右側。
export function SiteHeader() {
  return (
    <header className="relative flex items-start justify-between px-4 pt-4">
      <div className="flex w-full items-center gap-3 rounded-2xl bg-white py-1.5 pl-4 pr-2 shadow-softsm md:w-auto md:py-2 md:pr-6">
        <img src="/pattern/logo-play-together.png" alt="怪獸放電場 PLAY TOGETHER!" className="h-8 w-auto md:h-10" />
        <img src="/pattern/logo-newtaipei.png" alt="" aria-hidden="true" className="ml-auto h-10 w-auto md:hidden" />
      </div>
      <div className="absolute right-0 top-0 hidden bg-white p-1.5 md:block">
        <img src="/pattern/logo-newtaipei.png" alt="" aria-hidden="true" className="h-16 w-auto" />
      </div>
    </header>
  );
}

// 頁尾：業主第二版素材包改成玫瑰粉色底、白字，版權文字靠左。
// 參考稿右側的隱私政策等連結系統沒有對應頁面，不放。
export function Footer() {
  return (
    <footer className="bg-[#C5707D] px-5 py-6 text-sm font-bold text-white md:px-[4%]">
      © {new Date().getFullYear()} 體驗登記系統. All rights reserved.
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

// 手機版花瓣邊框：四角各放一張角落圖，上下緣與左右緣只鋪在角落之間，彼此不重疊
// （之前整條鋪到底，角落會有好幾張圖疊在一起）。尺寸以左右緣寬 120px 為基準，
// 高度照原圖比例換算；background-repeat: round 讓每段都剛好放整數張、不會切一半。
const M_SIDE_W = 120; // edge-left/right、corner 寬
const M_TOP_H = 132; // corner-tl/tr、edge-top 高（361 × 120 / 329）
const M_BOTTOM_H = 131; // corner-bl/br、edge-bottom 高（360 × 120 / 329）

export function MobileFrameBackground() {
  const strip = (src: string, style: React.CSSProperties, size: string, repeat: string) => (
    <div
      className="absolute"
      style={{ ...style, backgroundImage: `url(/pattern/${src}.png)`, backgroundSize: size, backgroundRepeat: repeat }}
    />
  );
  const corner = (src: string, style: React.CSSProperties, h: number) => (
    <img src={`/pattern/${src}.png`} alt="" className="absolute" style={{ ...style, width: M_SIDE_W, height: h }} />
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden md:hidden" aria-hidden="true">
      {strip("edge-top", { top: 0, left: M_SIDE_W, right: M_SIDE_W, height: M_TOP_H }, `auto ${M_TOP_H}px`, "round no-repeat")}
      {strip("edge-bottom", { bottom: 0, left: M_SIDE_W, right: M_SIDE_W, height: M_BOTTOM_H }, `auto ${M_BOTTOM_H}px`, "round no-repeat")}
      {strip("edge-left", { top: M_TOP_H, bottom: M_BOTTOM_H, left: 0, width: M_SIDE_W }, `${M_SIDE_W}px auto`, "no-repeat round")}
      {strip("edge-right", { top: M_TOP_H, bottom: M_BOTTOM_H, right: 0, width: M_SIDE_W }, `${M_SIDE_W}px auto`, "no-repeat round")}
      {corner("corner-tl", { top: 0, left: 0 }, M_TOP_H)}
      {corner("corner-tr", { top: 0, right: 0 }, M_TOP_H)}
      {corner("corner-bl", { bottom: 0, left: 0 }, M_BOTTOM_H)}
      {corner("corner-br", { bottom: 0, right: 0 }, M_BOTTOM_H)}
    </div>
  );
}

export function FrameBackground() {
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
