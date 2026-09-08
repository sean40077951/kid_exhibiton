// 名額搶購壓力測試（PROJECT_SPEC.md 第 3.1 節）。
// 用 Node 內建 fetch 模擬大量併發請求同時搶同一場次的最後名額，
// 因為這台機器沒有 k6 / Apache Bench，改用這支腳本做一樣的事：
//   1. 對同一場次同時送出 N 筆併發預約請求（每筆都是不同的假姓名/電話/信箱，避免被去重機制擋下）
//   2. 全部完成後，直接查資料庫確認：成功筆數 + 剩餘名額 是否完全對得起來、有沒有超賣
//   3. 順便記錄每筆請求的回應時間，確認使用者體感可接受
//
// 用法：
//   DATABASE_URL="..." npx tsx scripts/load-test-booking.ts [baseUrl] [concurrency]
// 例如：
//   npx tsx scripts/load-test-booking.ts http://localhost:3000 200

import { PrismaClient } from "@prisma/client";

// tsx 不會自動載入 .env（跟 prisma/seed.ts 原本遇到的問題一樣），這裡直接用 Node 內建的
// loadEnvFile 讀取，這樣不管用什麼指令跑這支腳本，DATABASE_URL 都吃得到。
try {
  process.loadEnvFile();
} catch {
  // 沒有 .env 檔也沒關係，可能是直接在環境變數裡設定的（例如 Zeabur）。
}

const prisma = new PrismaClient();

const baseUrl = process.argv[2] || "http://localhost:3000";
const concurrency = Number(process.argv[3]) || 200;

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function main() {
  // 找一個「還沒開始」的未來場次來測，並先把它重設成乾淨的滿額狀態，
  // 這樣測完可以直接用「剩餘名額」反推「應該成功幾筆」，數學算得動。
  const session = await prisma.session.findFirst({
    where: { isOpen: true },
    orderBy: { date: "asc" }
  });

  if (!session) {
    console.error("找不到任何場次，請先執行 npm run prisma:seed。");
    process.exit(1);
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { remaining: session.capacity }
  });

  // 先把這場次過去測試留下的預約清掉，確保這次測試的成功筆數判讀乾淨。
  await prisma.booking.deleteMany({ where: { sessionId: session.id } });

  console.log(
    `目標場次：${session.date.toISOString().slice(0, 10)} ${session.timeSlot}（上限 ${session.capacity} 人，目前已重設為滿額）`
  );
  console.log(`併發送出 ${concurrency} 筆請求，每筆預約 1 人...\n`);

  const latencies: number[] = [];
  const statusCounts: Record<number, number> = {};

  const tasks = Array.from({ length: concurrency }, (_, i) => async () => {
    const start = Date.now();
    let status = 0;
    try {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          name: `壓測使用者${i}`,
          phone: `09${String(10000000 + i).padStart(8, "0")}`,
          email: `loadtest+${i}@example.com`,
          headcount: 1,
          consent: true
        })
      });
      status = res.status;
      await res.json().catch(() => null);
    } catch (e) {
      status = -1;
    }
    latencies.push(Date.now() - start);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  });

  const overallStart = Date.now();
  await Promise.all(tasks.map((t) => t()));
  const overallMs = Date.now() - overallStart;

  const sorted = [...latencies].sort((a, b) => a - b);
  const successCount = statusCounts[200] ?? 0;

  console.log("--- HTTP 狀態碼分佈 ---");
  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log(`  ${status}: ${count} 筆`);
  }

  console.log("\n--- 回應時間 ---");
  console.log(`  總耗時（${concurrency} 筆併發全部完成）：${overallMs}ms`);
  console.log(`  min: ${sorted[0]}ms  avg: ${Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)}ms  p95: ${percentile(sorted, 95)}ms  max: ${sorted[sorted.length - 1]}ms`);

  const finalSession = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
  const bookingCount = await prisma.booking.count({ where: { sessionId: session.id } });
  const headcountSum = await prisma.booking.aggregate({
    where: { sessionId: session.id },
    _sum: { headcount: true }
  });

  console.log("\n--- 資料庫實際狀態（驗證有沒有超賣） ---");
  console.log(`  場次人數上限：${session.capacity}`);
  console.log(`  HTTP 回 200（視為成功）筆數：${successCount}`);
  console.log(`  資料庫裡實際的 Booking 筆數：${bookingCount}`);
  console.log(`  資料庫裡 Booking 的 headcount 加總：${headcountSum._sum.headcount ?? 0}`);
  console.log(`  場次剩餘名額（remaining）：${finalSession.remaining}`);

  const expectedRemaining = session.capacity - bookingCount;
  const noOversell = finalSession.remaining >= 0 && bookingCount <= session.capacity;
  const remainingMatches = finalSession.remaining === expectedRemaining;
  const successMatchesRows = successCount === bookingCount;

  console.log("\n--- 判定 ---");
  console.log(
    noOversell
      ? "✓ 沒有超賣：Booking 筆數沒有超過場次上限，剩餘名額沒有變負數"
      : "✗ 超賣了！Booking 筆數超過場次上限，或剩餘名額變負數 — 這是嚴重問題"
  );
  console.log(
    remainingMatches
      ? "✓ 剩餘名額跟實際訂位筆數完全對得上（上限 - 訂位筆數 = 剩餘名額）"
      : `✗ 剩餘名額對不起來：預期 ${expectedRemaining}，實際 ${finalSession.remaining}`
  );
  console.log(
    successMatchesRows
      ? "✓ HTTP 回 200 的筆數跟資料庫實際寫入的筆數一致（沒有漏寫或多寫）"
      : `✗ HTTP 成功筆數（${successCount}）跟資料庫筆數（${bookingCount}）對不起來`
  );

  await prisma.$disconnect();
  process.exit(noOversell && remainingMatches && successMatchesRows ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
