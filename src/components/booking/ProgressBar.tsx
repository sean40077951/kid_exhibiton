// 步驟指示規範（ui/_preview/02_步驟指示.png）：4 條橫向進度條，高 6px 圓角滿，
// 已完成／進行中 = 莓紅 #D8362B，未進行 = 米線 #E2DCD1。
// 標籤僅當前步驟為墨黑，其餘灰（muted）。
const STEPS = ["選日期", "場次人數", "填資料", "完成"];

export default function ProgressBar({ current }: { current: number }) {
  return (
    <ol className="w-full">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        <span className="text-ink">STEP {current}</span> 進行中
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {STEPS.map((_, idx) => {
          const step = idx + 1;
          const filled = step <= current;
          return <li key={step} className={`h-1.5 rounded-full ${filled ? "bg-red" : "bg-line"}`} />;
        })}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs">
        {STEPS.map((label, idx) => {
          const step = idx + 1;
          const active = step === current;
          return (
            <span key={label} className={active ? "font-bold text-ink" : "text-muted"}>
              {step}.{label}
            </span>
          );
        })}
      </div>
    </ol>
  );
}
