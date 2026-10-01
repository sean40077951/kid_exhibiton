import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { dateStringToUtcMidnight, formatDate } from "../src/lib/timezone";

const prisma = new PrismaClient();

// 隱私權條款全文（業主 2026-09-30 提供，逐字照貼）。
const CONSENT_TEXT = `最後更新：2026 年 9 月 30 日｜適用範圍：【怪獸放電場】網站及展覽體驗

第一條　前言與適用範圍
本隱私權條款（以下稱「本條款」）說明【怪獸放電場】（以下稱「本活動」）主辦單位（以下稱「我們」）在您使用本官方網站（以下稱「本網站」）及參與現場展覽互動體驗時，如何蒐集、處理及利用您的個人資料。
我們依據中華民國《個人資料保護法》及相關法規辦理，請您於使用本網站前詳閱本條款。

第二條　蒐集之個人資料種類
當您於本網站進行會員註冊或參與現場互動體驗時，我們可能蒐集以下資料：
．基本資料：暱稱
．聯絡資料：電子郵件地址（Email）
．帳號資料：您設定的會員帳號（Email）
我們僅蒐集提供本活動服務所必要之最少量個人資料，不會要求您提供身分證字號等非必要敏感資訊。

第三條　個人資料之利用目的
我們蒐集您的個人資料，將用於以下目的（依個人資料保護法第 16 條規定）：
．身分驗證
．提供現場展覽互動體驗之核驗及紀錄服務
．提升本活動服務品質之內部研究

第四條　個人資料之保存與刪除
您的個人資料將於活動結束後保存 12 個月，期限屆滿後予以刪除或匿名化處理，惟法律另有規定者從其規定。
您得隨時向我們提出請求，要求刪除您的個人資料。

第五條　個人資料之第三方揭露
我們不會出售、出租或以其他方式將您的個人資料提供給第三方，但以下情況除外：
．依法令規定或經主管機關、司法機關合法要求
．為保護我們、其他使用者或公眾之合法權益而有必要時
．經您明確同意授權
本網站可能使用第三方服務（如雲端主機、電子郵件寄送服務），上述服務提供商僅被授權在提供本活動服務之必要範圍內處理您的資料，不得另行使用。

第六條　Cookie 與網站紀錄
本網站使用 Cookie 技術以維持您的登入狀態及改善使用體驗。您可透過瀏覽器設定停用 Cookie，但部分功能可能因此受限。本網站伺服器日誌可能自動記錄 IP 位址、瀏覽器類型及存取時間等技術資訊，僅用於維護網站安全及統計目的。

第七條　您的個人資料權利
依據個人資料保護法第 3 條，您對於您的個人資料享有以下權利：
．查詢或請求閱覽
．請求製給複製本
．請求補充或更正
．請求停止蒐集、處理或利用
．請求刪除
如需行使上述權利，請透過本條款末尾之聯絡方式與我們聯繫，我們將於 15 個工作日內回覆。

第八條　資料安全
我們採取合理的技術及管理措施保護您的個人資料，包括 SSL 加密傳輸、密碼加密儲存，以及存取權限控管。若發生個人資料外洩事件，我們將依法通知受影響之當事人及主管機關。

第九條　本條款之修訂
我們保留修訂本條款之權利，修訂後將於本網站公告，並以電子郵件通知已註冊會員。若您於條款修訂後繼續使用本服務，視為您同意修訂後之條款內容。

第十條　聯絡我們
若您對本隱私權條款有任何疑問，請聯繫：
策展單位：沁人合業股份有限公司
聯絡信箱：hellomonster.ntpc@gmail.com`;

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
      // Step 4（預約完成頁）專用的完整入場注意事項清單，內容照線稿逐字打上。
      // 2026-10-01 業主提供新版入場注意事項，逐字照貼。
      noticeText:
        "1. 請於場次開始前 10 分鐘報到，逾時 15 分鐘未報到，名額將釋出給現場候補。\n2. 請出示本預約確認信（或預約成功畫面），至服務台核對姓名與預約編號後入場。\n3. 每場放電時間為 30 分鐘。\n4. 一組最多 5 人，需至少 1 位成人同行；身高 90 公分以下兒童請全程陪同。\n5. 進入 B 區球池請脫鞋、穿襪子入場（服務台可購買），入口旁設有脫鞋區與置物櫃，推車請停放於指定區域。\n6. 本預約不可取消或修改。",
      emailTemplate: "",
      // 隱私權條款（業主 2026-09-30 提供全文，逐字照貼，見前台登記表單的條款彈窗）。
      consentText: CONSENT_TEXT,
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
