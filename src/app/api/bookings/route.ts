import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { generateBookingCode } from "@/lib/booking-code";
import { sendConfirmationEmail } from "@/lib/mailer";
import { formatDate, isPastBookingCutoff } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sessionId: z.string({ required_error: "缺少場次資訊，請重新選擇" }).min(1, "缺少場次資訊，請重新選擇"),
  name: z
    .string({ required_error: "請填寫姓名" })
    .trim()
    .min(1, "請填寫姓名"),
  phone: z
    .string({ required_error: "請填寫聯絡電話" })
    .trim()
    .min(8, "請填寫正確的聯絡電話"),
  email: z
    .string({ required_error: "請填寫電子信箱" })
    .trim()
    .email("請填寫正確的電子信箱"),
  headcount: z
    .number({ required_error: "請選擇預約人數", invalid_type_error: "請選擇預約人數" })
    .int()
    .min(1, "預約人數至少 1 人")
    .max(5, "預約人數最多 5 人"),
  consent: z.literal(true, { errorMap: () => ({ message: "請勾選同意個資使用聲明" }) }),
  turnstileToken: z.string().optional(),
  // Honeypot：一般使用者看不到、不會填寫的欄位，機器人常會誤填。
  website: z.string().max(0, "invalid submission").optional()
});

class BookingError extends Error {
  code: "FULL" | "SESSION_NOT_FOUND" | "SESSION_CLOSED" | "PAST_CUTOFF";
  constructor(code: BookingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

async function verifyTurnstile(token: string | undefined, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET 未設定，開發模式跳過驗證");
    return true;
  }
  if (!token) return false;

  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token,
      ...(ip ? { remoteip: ip } : {})
    })
  });
  const data = await r.json();
  return Boolean(data.success);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "資料格式錯誤" },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Honeypot 命中：判定為機器人，直接拒絕。
  if (input.website && input.website.length > 0) {
    return NextResponse.json({ error: "送出失敗，請重新整理後再試一次" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for");
  const captchaOk = await verifyTurnstile(input.turnstileToken, ip);
  if (!captchaOk) {
    return NextResponse.json({ error: "人機驗證失敗，請重新整理後再試一次" }, { status: 400 });
  }

  const emailNormalized = normalizeEmail(input.email);
  const phoneNormalized = normalizePhone(input.phone);

  try {
    const session = await prisma.session.findUnique({ where: { id: input.sessionId } });
    if (!session) {
      return NextResponse.json({ error: "找不到此場次，請重新選擇" }, { status: 404 });
    }
    if (!session.isOpen) {
      return NextResponse.json({ error: "此場次已關閉，請重新選擇" }, { status: 409 });
    }
    // 場次開始前 15 分鐘自動停止預約（業主須知回覆 4-2），即時計算，不用排程改資料庫。
    if (isPastBookingCutoff(session.date, session.timeSlot)) {
      return NextResponse.json(
        { error: "此場次即將開始，已停止接受預約，請選擇其他場次" },
        { status: 409 }
      );
    }

    const booking = await prisma.$transaction(async (tx) => {
      // 原子扣減：單一 UPDATE + WHERE remaining >= headcount，
      // 影響列數為 0 代表名額不足，交由 catch 統一處理（見 PROJECT_SPEC.md 第 3.1 節）。
      const updated = await tx.session.updateMany({
        where: { id: session.id, remaining: { gte: input.headcount } },
        data: { remaining: { decrement: input.headcount } }
      });
      if (updated.count === 0) {
        throw new BookingError("FULL", "很抱歉，該場次名額剛剛額滿，請重新選擇場次");
      }

      const consentGivenAt = new Date();

      // 預約編號規則尚未經業主確認，先重試幾次避免極小機率的隨機碼碰撞。
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const bookingCode = generateBookingCode(session.date);
        try {
          return await tx.booking.create({
            data: {
              eventId: session.eventId,
              sessionId: session.id,
              bookingCode,
              name: input.name,
              phone: input.phone,
              email: input.email,
              phoneNormalized,
              emailNormalized,
              headcount: input.headcount,
              consentGivenAt,
              consentVersion: "v1",
              status: "confirmed",
              bookingDate: session.date
            }
          });
        } catch (e) {
          // 「每日每人限一次」去重已依業主指示取消（4-1），所以這裡唯一還可能撞到的
          // 只剩 bookingCode 本身的唯一索引（極小機率的隨機碼碰撞），重試即可。
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            lastError = e;
            continue;
          }
          throw e;
        }
      }
      throw lastError instanceof Error ? lastError : new Error("預約編號產生失敗，請再試一次");
    }, {
      // 預設 maxWait 只有 2000ms：短時間大量搶同一場次時，連線池來不及在 2 秒內排到這筆請求，
      // Prisma 會直接丟 「Unable to start a transaction in the given time」，變成使用者看到伺服器錯誤，
      // 而不是「已額滿」這種正常結果。拉長到 10 秒讓請求排隊等連線，而不是直接被打槍。
      maxWait: 10000,
      timeout: 10000
    });

    sendConfirmationEmail({
      to: booking.email,
      name: booking.name,
      bookingCode: booking.bookingCode,
      dateStr: formatDate(booking.bookingDate, "yyyy-MM-dd"),
      timeSlot: session.timeSlot,
      headcount: booking.headcount,
      noticeText: ""
    }).catch((e) => console.error("[mailer] 確認信寄送失敗", e));

    return NextResponse.json({
      bookingCode: booking.bookingCode,
      name: booking.name,
      email: booking.email,
      date: formatDate(booking.bookingDate, "yyyy-MM-dd"),
      timeSlot: session.timeSlot,
      headcount: booking.headcount
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    console.error("[bookings] 建立預約失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
