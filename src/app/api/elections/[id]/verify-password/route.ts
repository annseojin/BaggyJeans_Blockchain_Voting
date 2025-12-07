import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import bcrypt from 'bcryptjs'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { password } = await req.json()
    const { id: electionId } = await context.params

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // 선거 조회
    const { data: election, error } = await supabaseAdmin
      .from('elections')
      .select('admin_password_hash')
      .eq('id', electionId)
      .single()

    if (error || !election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      )
    }

    if (!election.admin_password_hash) {
      return NextResponse.json(
        { error: 'No admin password set for this election' },
        { status: 400 }
      )
    }

    // 비밀번호 확인
    const isValid = bcrypt.compareSync(password, election.admin_password_hash)

    return NextResponse.json({ valid: isValid })
  } catch (err: any) {
    console.error('[API] Password verification error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
