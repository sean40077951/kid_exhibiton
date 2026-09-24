import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { dateStringToUtcMidnight, formatDate } from "../src/lib/timezone";

const prisma = new PrismaClient();

// 展期與場次時間依線稿雛形先行預填，正式資料以後台設定為準（PROJECT_SPEC.md 第 11 節：設定化優先）。
const TIME_SLOTS = [
  "10:00",
  "10:35",
  "11:10",
  "11:45",
  "13:30",
  "14:05",
  "14:40",
  "15:15",
  "15:50",
  "16:25"
];
const CAPACITY_PER_SLOT = 30;
const CLOSED_WEEKDAY = 1; // 週一

async function main() {
  const event = await prisma.event.upsert({
    where: { id: "seed-event-monsters" },
    update: {},
    create: {
      id: "seed-event-monsters",
      name: "體驗登記系統｜兒藝節秋季展期",
      themeSettings: {},
      dateRangeStart: dateStringToUtcMidnight("2026-10-10"),
      dateRangeEnd: dateStringToUtcMidnight("2026-12-27"),
      closedWeekday: CLOSED_WEEKDAY,
      phaseOpenRules: [
        { openDate: "2026-10-01", appliesToMonth: "2026-10" },
        { openDate: "2026-10-20", appliesToMonth: "2026-11" },
        { openDate: "2026-11-20", appliesToMonth: "2026-12" }
      ],
      bannerText: "怪獸來囉！10/10 正式開展，記得提前 10 分鐘到場報到唷。",
      // Step 4（預約完成頁）專用的完整入場注意事項清單，內容照線稿逐字打上。
      noticeText:
        "1. 請於場次開始前 10 分鐘報到，逾時 15 分鐘未報到，名額將釋出給現場候補。\n2. 出示確認信或預約憑證，服務台核對姓名與預約編號後入場。\n3. 每場放電 45 分鐘。\n4. 90 公分以下小朋友請家長全程陪同。\n5. 本展區設有球池，進入需脫鞋、穿襪子（服務台可購買）。\n6. 展區禁止飲食，可攜帶飲用水。\n7. 預約不可取消或修改。",
      emailTemplate: "",
      // Step 3（填寫預約資料頁）勾選框旁的個資同意聲明文字，同樣照線稿逐字打上。
      consentText:
        "勾選：於本網站或填寫之個人資料（包含姓名、聯絡電話、電子信箱）僅作為「體驗登記系統」展覽預約使用，不作為其他商業用途，亦不會提供於第三方。本活動結束後，相關個人資料將依法定予以銷毀。送出此預約表單，即視為同意本活動之個人資料使用方式。",
      consentVersion: "v1",
      dataRetentionDays: 365
    }
  });

  const template = await prisma.sessionTemplate.upsert({
    where: { id: "seed-template-monsters" },
    update: { timeSlots: TIME_SLOTS, capacityPerSlot: CAPACITY_PER_SLOT },
    create: {
      id: "seed-template-monsters",
      eventId: event.id,
      timeSlots: TIME_SLOTS,
      capacityPerSlot: CAPACITY_PER_SLOT
    }
  });

  const start = new Date(event.dateRangeStart);
  const end = new Date(event.dateRangeEnd);
  const slots = template.timeSlots as string[];

  let created = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = formatDate(d, "yyyy-MM-dd");
    const weekday = new Date(`${dateStr}T12:00:00+08:00`).getDay();
    if (weekday === CLOSED_WEEKDAY) continue;

    for (const timeSlot of slots) {
      await prisma.session.upsert({
        where: {
          eventId_date_timeSlot: {
            eventId: event.id,
            date: dateStringToUtcMidnight(dateStr),
            timeSlot
          }
        },
        update: {},
        create: {
          eventId: event.id,
          date: dateStringToUtcMidnight(dateStr),
          timeSlot,
          capacity: CAPACITY_PER_SLOT,
          remaining: CAPACITY_PER_SLOT,
          isOpen: true
        }
      });
      created += 1;
    }
  }

  console.log(`Seed 完成：event=${event.name}，展開場次 upsert 共 ${created} 筆。`);

  // 後台帳號：單一組帳號、不分權限（PROJECT_SPEC.md 第 7 節）。
  // 用 .env 的 ADMIN_EMAIL / ADMIN_PASSWORD 建立，方便本機開發登入；正式環境務必改掉預設密碼。
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash }
  });

  console.log(`後台帳號已建立／更新：${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
