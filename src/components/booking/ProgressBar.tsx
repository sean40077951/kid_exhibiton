const STEPS = ["選日期", "場次＆人數", "預約資料", "完成"];

export default function ProgressBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const active = step === current;
        const done = step < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? "bg-brand-accent text-brand-primary-dark"
                  : done
                    ? "bg-brand-primary text-white"
                    : "bg-white/40 text-brand-primary-dark"
              }`}
            >
              {step}
            </span>
            <span className={active ? "font-bold" : "opacity-80"}>{label}</span>
            {step !== STEPS.length && <span className="mx-1 opacity-50">—</span>}
          </li>
        );
      })}
    </ol>
  );
}
