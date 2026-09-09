import type { BookingResult } from "./StepConfirm";

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
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-success/15 p-6 text-center">
        <p className="text-2xl font-bold text-brand-success">預約成功！</p>
        <p className="mt-2 text-sm opacity-80">確認信已寄出，請到信箱收信。沒收到請看看垃圾郵件匣。</p>
      </div>

      <div className="rounded-2xl bg-white/70 p-4 text-sm">
        <p className="mb-2 text-xs opacity-60">預約編號</p>
        <p className="mb-3 text-xl font-bold tracking-wide">{result.bookingCode}</p>
        <Row label="姓名" value={result.name} />
        <Row label="日期" value={result.date} />
        <Row label="場次" value={result.timeSlot} />
        <Row label="人數" value={`${result.headcount} 人`} />
        <Row label="信箱" value={result.email} />
      </div>

      {noticeText && (
        <div className="rounded-2xl bg-white/70 p-4 text-sm">
          <p className="mb-2 font-bold">入場注意事項</p>
          <p className="whitespace-pre-line opacity-90">{noticeText}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white"
      >
        回到首頁
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-black/5 py-1 last:border-0">
      <span className="opacity-60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
