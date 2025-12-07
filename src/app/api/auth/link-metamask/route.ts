//DID 발급 및 Metamask 매핑 API
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { did, address } = await req.json();

    if (!did || !address) {
      return NextResponse.json(
        { error: 'did and address are required' },
        { status: 400 }
      );
    }

    // DID 존재 확인
    const { data: voter, error } = await supabaseAdmin
      .from('voters')
      .select('id')
      .eq('did', did)
      .single();

    if (error || !voter) {
      return NextResponse.json(
        { error: '존재하지 않는 DID입니다.' },
        { status: 404 }
      );
    }

    // MetaMask 주소 매핑 (하나만 허용)
    const { error: updateErr } = await supabaseAdmin
      .from('voters')
      .update({ metamask_address: address })
      .eq('id', voter.id);

    if (updateErr) {
      console.error('[link-metamask] update error', updateErr);
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[link-metamask] unexpected', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
