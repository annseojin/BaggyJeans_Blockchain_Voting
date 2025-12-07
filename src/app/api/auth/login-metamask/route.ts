//DID 발급 및 Metamask 매핑 API
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('voters')
      .select('did')
      .eq('metamask_address', address)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '해당 MetaMask 계정에 매핑된 DID가 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ did: data.did });
  } catch (err: any) {
    console.error('[login-metamask] unexpected', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
