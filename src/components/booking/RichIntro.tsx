import { Fragment } from "react";

// 展覽介紹的簡易排版語法（後台在純文字框輸入，前台與後台預覽用同一個元件轉成畫面）。
// 不用 dangerouslySetInnerHTML，全部轉成 React 元素，管理者輸入什麼都不會變成可執行的網頁碼。
//
//   # 文字        大標題（粗、大字）
//   ## 文字       小標題（粗體）
//   **文字**      行內粗體（可用在任何一行）
//   > 文字        灰色小字
//   @時間 文字    灰色小字＋時鐘圖示（連續幾行 @時間 只有第一行顯示圖示，其餘對齊縮排）
//   @地點 文字    灰色小字＋地點圖示
//   ---           虛線分隔
//   空白行        段落間距
//   其他          一般文字
type Line =
  | { kind: "h1" | "h2" | "text" | "gray"; text: string }
  | { kind: "clock" | "pin"; text: string; first: boolean }
  | { kind: "hr" }
  | { kind: "gap" };

function parse(source: string): Line[] {
  const out: Line[] = [];
  let prevIcon: "clock" | "pin" | null = null;
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    let icon: "clock" | "pin" | null = null;

    if (line.trim() === "") out.push({ kind: "gap" });
    else if (/^-{3,}$/.test(line.trim())) out.push({ kind: "hr" });
    else if (line.startsWith("## ")) out.push({ kind: "h2", text: line.slice(3) });
    else if (line.startsWith("# ")) out.push({ kind: "h1", text: line.slice(2) });
    else if (line.startsWith("> ")) out.push({ kind: "gray", text: line.slice(2) });
    else if (line.startsWith("@時間")) {
      icon = "clock";
      out.push({ kind: "clock", text: line.slice(3).trim(), first: prevIcon !== "clock" });
    } else if (line.startsWith("@地點")) {
      icon = "pin";
      out.push({ kind: "pin", text: line.slice(3).trim(), first: prevIcon !== "pin" });
    } else out.push({ kind: "text", text: line });

    prevIcon = icon;
  }
  return out;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "mt-1 h-4 w-4 shrink-0",
  "aria-hidden": true
};

function Icon({ kind }: { kind: "clock" | "pin" }) {
  return kind === "clock" ? (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ) : (
    <svg {...ICON_PROPS}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export default function RichIntro({ source }: { source: string }) {
  return (
    <div>
      {parse(source).map((l, i) => {
        switch (l.kind) {
          case "gap":
            return <div key={i} className="h-4" />;
          case "hr":
            return <hr key={i} className="my-4 border-0 border-t border-dashed border-[#9CC5E8]" />;
          case "h1":
            return (
              <p key={i} className="text-2xl font-bold leading-snug text-ink md:text-3xl">
                <Inline text={l.text} />
              </p>
            );
          case "h2":
            return (
              <p key={i} className="text-base font-bold leading-7 text-ink">
                <Inline text={l.text} />
              </p>
            );
          case "gray":
            return (
              <p key={i} className="text-sm leading-6 text-[#6B7280]">
                <Inline text={l.text} />
              </p>
            );
          case "clock":
          case "pin":
            return (
              <div key={i} className="flex gap-2 text-sm leading-6 text-[#6B7280]">
                {l.first ? <Icon kind={l.kind} /> : <span className="w-4 shrink-0" />}
                <span>
                  <Inline text={l.text} />
                </span>
              </div>
            );
          default:
            return (
              <p key={i} className="text-sm leading-7 text-ink">
                <Inline text={l.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
