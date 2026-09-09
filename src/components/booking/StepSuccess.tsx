import type { BookingResult } from "./StepConfirm";
import Button from "@/components/ui/Button";

// 憑證樣式參考 ui/_preview/07_憑證與圖鑑.png 的 MONSTER PASS 卡（芥黃底、圓角 blob、陰影 6,6）。
// 圖鑑蒐集機制不在這輪範圍內，只套用票卡視覺。
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
      <div className="rounded-blob border-[3px] border-ink bg-green p-6 text-center text-white shadow-hardlg">
        <p className="font-display text-2xl font-bold">預約成功！</p>
        <p className="mt-2 text-sm opacity-95">確認信已寄出，請到信箱收信。沒收到請看看垃圾郵件匣。</p>
      </div>

      <div className="relative overflow-hidden rounded-blob border-[3px] border-ink bg-yellow p-5 text-ink shadow-hardlg">
        <img
          src="/monsters/monster-05.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-4 h-28 w-28 rotate-6 opacity-90"
        />
        <p className="font-display text-xs font-bold tracking-widest">MONSTER PASS</p>
        <p className="text-xs text-ink/70">入場憑證</p>
        <p className="mt-2 break-all font-display text-3xl font-bold">{result.bookingCode}</p>

        <div className="my-3 border-t-[3px] border-dashed border-ink/40" />

        <p className="font-display text-base font-bold">{result.date}</p>
        <p className="mt-0.5 text-sm">
          {result.timeSlot} 場・{result.headcount} 人
        </p>
        <p className="text-sm">{result.name}</p>

        <div className="mt-4 rounded-eight border-[3px] border-ink bg-ink py-2.5 text-center text-sm font-bold text-white">
          入場時出示此畫面
        </div>
      </div>

      <div className="rounded-eight border-[3px] border-ink bg-card p-4 text-sm shadow-hardsm">
        <Row label="信箱" value={result.email} />
      </div>

      {noticeText && (
        <div className="rounded-eight border-2 border-line bg-card p-4 text-sm">
          <p className="mb-2 font-bold text-ink">入場注意事項</p>
          <p className="whitespace-pre-line text-muted">{noticeText}</p>
        </div>
      )}

      <Button type="button" variant="secondary" onClick={onRestart} className="border-ink">
        回到首頁
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-display font-bold text-ink">{value}</span>
    </div>
  );
}
