// src/app/api/auth/verify-email-code/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "email and code are required" },
        { status: 400 }
      );
    }

    // 1. DB에서 이메일로 인증 정보 조회
    // Schema: email is unique
    const { data, error } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "인증 요청을 찾을 수 없습니다. 다시 시도해주세요." },
        { status: 404 }
      );
    }

    // 2. 이미 인증된 경우
    if (data.verified) {
      return NextResponse.json({ ok: true, message: "이미 인증되었습니다." });
    }

    // 3. 코드 불일치 등 검증
    if (String(data.code) !== String(code)) {
      return NextResponse.json(
        { error: "인증 코드가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 4. 만료 시간 확인
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "인증 코드가 만료되었습니다. 다시 요청해주세요." },
        { status: 400 }
      );
    }

    // 5. 인증 성공 처리
    const { error: updateError } = await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("email", email);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("verify-email-code error", err);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
