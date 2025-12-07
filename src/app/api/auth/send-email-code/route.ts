// src/app/api/auth/send-email-code/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// 허용 이메일 도메인 처리
const ALLOWED_EMAIL_LIST = (process.env.ALLOWED_EMAIL_LIST || "@jmail.ac.kr")
  .split(",")
  .map((v) => v.trim().toLowerCase());

function isAllowedEmail(email: string) {
  return ALLOWED_EMAIL_LIST.some((suffix) =>
    email.toLowerCase().endsWith(suffix)
  );
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { error: "허용되지 않은 이메일 도메인입니다." },
        { status: 403 }
      );
    }

    // 이미 인증 완료된 이메일인지 확인
    const { data: exists } = await supabase
      .from("email_verifications")
      .select("verified")
      .eq("email", email)
      .single();

    if (exists?.verified === true) {
      return NextResponse.json(
        { error: "이미 인증 완료된 이메일입니다." },
        { status: 400 }
      );
    }

    // 인증코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5분 후 만료

    // DB 저장 (verified 유지, false로 덮어쓰지 않음)
    // Upsert ensures we update the code and expiration for a retry
    await supabase.from("email_verifications").upsert(
      {
        email,
        code,
        expires_at: expiresAt,
        // verified is NOT included, so it won't be reset if it was true (but we block that above anyway)
        // If new, it defaults to false (DB default)
      },
      { onConflict: "email" }
    );

    // 메일 전송 준비
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER!,
      to: email,
      subject: "전자투표 이메일 인증코드",
      html: `
        <h2>전자투표 이메일 인증</h2>
        <p>요청한 인증코드는 다음과 같습니다:</p>
        <h1 style="letter-spacing:8px">${code}</h1>
        <p>5분 안에 입력해주세요.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-email-code error", err);
    return NextResponse.json(
      { error: "이메일 발송 중 오류 발생" },
      { status: 500 }
    );
  }
}
