# 怪獸放電場｜線上預約系統（雛形）

依 `PROJECT_SPEC.md` 產生的初步雛形，重點放在**流程與資料邏輯**（月曆選日期 → 場次與人數 → 填資料 → 完成，以及名額原子扣減與去重）。介面視覺目前用佔位色票，等拿到品牌風格圖片後再套用。

## 本機啟動

```bash
npm install
docker compose up -d          # 啟動本機 PostgreSQL
cp .env.example .env          # 依需要調整
npm run prisma:migrate        # 建表
npm run prisma:seed           # 灌入展會設定、場次樣板、展開展期內所有場次
npm run dev                   # http://localhost:3000
```

後台（需先登入）：`http://localhost:3000/admin/login`
（帳密＝ `.env` 的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`，執行過 `npm run prisma:seed` 才會建立這個帳號）

## 已實作

- 前台四步驟流程（對應線稿）：`src/components/booking/*`
- 名額**原子扣減**：`updateMany(... WHERE remaining >= headcount)` 包在同一個 `$transaction` 內，額滿時 rollback（`src/app/api/bookings/route.ts`）
- **去重**：email／電話正規化 + 資料庫唯一索引（`prisma/schema.prisma` 的 `Booking` model），命中唯一索引時回傳友善錯誤
- **分階段開放預約**：`event.phaseOpenRules` 設定化，月曆依規則鎖住未開放月份（`src/lib/phase-rules.ts`）
- Honeypot 欄位（CSS 隱藏，非 `display:none`）
- Turnstile 驗證骨架：後端已有驗證流程，`TURNSTILE_SECRET` 未設定時開發模式自動跳過（`verifyTurnstile`）
- **後台登入**：`/admin/*` 與 `/api/admin/*` 由 `src/middleware.ts` 統一擋下未登入請求；密碼 bcrypt 雜湊存資料庫，登入後發一個簽章 session cookie（`src/lib/admin-session.ts`，7 天效期，竄改／過期都會被拒絕）
- 輕量純邏輯測試：`npm run test:logic`（不需要資料庫，涵蓋正規化、分階段開放判斷、預約編號格式、時區換算、session 簽章驗證共 22 條斷言）

## 尚未實作／待確認事項（依 PROJECT_SPEC.md 第 11 節，動工前應詢問業主，不要自行假設）

1. **預約編號正式規則**（第 5 節）：目前用線稿上出現的格式 `M + YYMMDD + 隨機4碼`（如 `M261015-5912`）暫代，需業主確認正式規則。
2. **後台關閉已有預約場次的流程**（第 3.5 節）：規格未明訂，目前後台雛形不含此功能。
3. 前端 Cloudflare Turnstile widget 尚未實際掛載（`StepForm.tsx` 有預留位置），需要 `TURNSTILE_SITE_KEY` 後補上。
4. 發信服務（Resend/SES）尚未串接，`src/lib/mailer.ts` 目前只是 console.log 佔位，也尚未做成佇列非同步。
5. 後台名額管理、資料匯出（Excel/CSV）、通知信手動發送、前一日自動提醒排程、統計報表：規格第 7 節列出的後台功能，目前只做完「登入」跟「預約查詢」。
6. Rate limiting、資料保存期限自動銷毀、DB 靜態加密、Log 遮蔽個資：屬部署/維運層機制，尚未實作。
7. 上線前需壓力測試名額搶購情境（第 3.1 節），雛形尚未寫測試腳本。

## 介面視覺

`tailwind.config.ts` 內的 `brand.*` 色票是佔位色，之後你提供風格圖片後，我會依圖片重新設定色票／字型/元件樣式，不需要更動元件邏輯。
