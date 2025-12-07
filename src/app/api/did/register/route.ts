//DID 발급 및 Metamask 매핑 API
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import crypto from 'crypto';

function generateServerDID() {
  const hex = crypto.randomBytes(16).toString('hex');
  return `did:evote:${hex}`;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }

    // 1) 이메일이 verified 인지 확인
    const { data: verifyRow, error: verifyErr } = await supabaseAdmin
      .from('email_verifications')
      .select('verified')
      .eq('email', email)
      .single();

    if (verifyErr || !verifyRow || !verifyRow.verified) {
      return NextResponse.json(
        { error: '이메일 인증이 완료되지 않았습니다.' },
        { status: 403 }
      );
    }

    // 2) 이미 DID가 있으면 그거 반환
    const { data: existing, error: voterErr } = await supabaseAdmin
      .from('voters')
      .select('did')
      .eq('email', email)
      .maybeSingle();

    if (voterErr) {
      console.error('[did/register] select error', voterErr);
      return NextResponse.json(
        { error: voterErr.message },
        { status: 500 }
      );
    }

    if (existing?.did) {
      return NextResponse.json({ did: existing.did, isNew: false });
    }

    // 3) 새 DID 발급
    const did = generateServerDID();

    const { error: insertErr } = await supabaseAdmin
      .from('voters')
      .insert({ email, did });

    if (insertErr) {
      console.error('[did/register] insert error', insertErr);
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ did, isNew: true });
  } catch (err: any) {
    console.error('[did/register] unexpected', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
