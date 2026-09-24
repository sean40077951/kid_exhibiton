import type { BookingResult } from "./StepRegister";
import Button from "@/components/ui/Button";

// 登記確認畫面（業主提供「體驗登記系統」Figma 參考稿）：置中大字登記號碼、
// 圖示＋資訊列表、黃底重要提醒。取代原本的 MONSTER PASS 票卡視覺。
export default function StepSuccess({
  result,
  noticeText,
  onRestart
}: {
  result: BookingResult;
  noticeText: string;
  onRestart: () => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2.5 text-center text-sm text-pink">請至信箱查收確認信，並截圖保存此頁。</p>
        <p className="break-all rounded-xl bg-[#F5F5F5] py-6 text-center text-4xl font-bold tracking-[0.2em] text-ink">
          {result.bookingCode}
        </p>
      </div>

      <div>
        <p className="mb-2.5 text-sm font-bold text-ink">登記資訊</p>
        <div className="space-y-2">
          <InfoRow icon="person" label="姓名" value={result.name} />
          <InfoRow icon="mail" label="E-mail" value={result.email} />
          <InfoRow icon="calendar" label="日期" value={result.date} />
          <InfoRow icon="clock" label="時段" value={result.timeSlot} />
          <InfoRow icon="people" label="參加人數" value={`${result.headcount} 人`} />
        </div>
      </div>

      {noticeText && (
        <div className="rounded-lg border border-[#F3E3A0] bg-[#FFF8D6] px-4 py-3 text-xs leading-6 text-ink">
          <p className="mb-1 text-sm font-bold">重要提醒</p>
          <p className="whitespace-pre-line">{noticeText}</p>
        </div>
      )}

      <Button type="button" variant="pink-outline" onClick={onRestart}>
        回到首頁
      </Button>
    </div>
  );
}

type IconName = "person" | "mail" | "calendar" | "clock" | "people";

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#F5F5F5] px-4 py-3">
      <span className="mt-0.5 shrink-0 text-ink">
        <Icon name={icon} />
      </span>
      <div>
        <p className="text-xs font-bold text-ink">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
    </div>
  );
}

function Icon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4",
    "aria-hidden": true
  };
  switch (name) {
    case "person":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
          <path d="M16 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
          <path d="M15 13.2c2.3.4 4 2.3 4 4.6" />
        </svg>
      );
  }
}
