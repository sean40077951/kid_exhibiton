import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "請輸入帳號與密碼" }, { status: 400 });
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    // 帳號不存在或密碼錯誤都回同一句話，避免讓人用錯誤訊息猜出帳號是否存在。
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const token = await createSessionToken(admin.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
    });
    return res;
  } catch (e) {
    console.error("[admin/login] 登入失敗", e);
    return NextResponse.json({ error: "系統忙碌中，請稍後再試一次" }, { status: 500 });
  }
}
