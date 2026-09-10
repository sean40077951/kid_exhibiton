// 伺服器啟動時跑一次，註冊「每天自動備份」的排程（不用靠 Zeabur 付費方案的自動備份功能）。
// 需要 next.config.mjs 開 experimental.instrumentationHook（Next.js 14 版還是實驗性功能）。
//
// 不用 node-cron 之類的套件：那些套件內部會用到 node:crypto / child_process 等 Node 原生模組，
// Next.js 對 instrumentation.ts 會同時嘗試打包給 Edge runtime 用，Edge 環境不支援這些模組，
// 就算程式碼裡有 runtime 判斷擋掉，webpack 在 build 階段還是會先因為找不到這些模組而直接報錯。
// 純用 setTimeout/setInterval 排程完全不需要額外套件，也就不會有這個打包問題。
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BACKUP_HOUR_TAIPEI = 3; // 每天台北時間凌晨 3 點

function msUntilNextBackup(now = new Date()): number {
  const taipeiNow = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  const next = new Date(
    Date.UTC(taipeiNow.getUTCFullYear(), taipeiNow.getUTCMonth(), taipeiNow.getUTCDate(), BACKUP_HOUR_TAIPEI)
  );
  if (next.getTime() <= taipeiNow.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - taipeiNow.getTime();
}

export async function register() {
  // instrumentation 在 Node 跟 Edge 兩種 runtime 都會被呼叫，這個排程只能跑在 Node。
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // next dev 熱重載時 instrumentation 可能被重新呼叫，用全域旗標擋掉重複註冊，
  // 不然同一台伺服器裡會同時存在好幾個排程，變成一天備份好幾次。
  const g = globalThis as unknown as { __dailyBackupScheduled?: boolean };
  if (g.__dailyBackupScheduled) return;
  g.__dailyBackupScheduled = true;

  const { createBackupSnapshot } = await import("@/lib/backup");

  async function runBackup() {
    try {
      const backup = await createBackupSnapshot();
      console.log(`[backup] 每日自動備份完成，id=${backup.id}`);
    } catch (e) {
      console.error("[backup] 每日自動備份失敗", e);
    }
  }

  const delay = msUntilNextBackup();
  setTimeout(() => {
    runBackup();
    setInterval(runBackup, ONE_DAY_MS);
  }, delay);

  console.log(
    `[backup] 每日自動備份排程已註冊（每天台北時間 03:00 執行，下一次還要等 ${Math.round(delay / 60000)} 分鐘）`
  );
}
