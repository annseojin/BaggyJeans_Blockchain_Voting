import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET: 특정 선거 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data: election, error } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[API] 선거 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!election) {
      return NextResponse.json(
        { error: '선거를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(election);
  } catch (error: any) {
    console.error('[API] GET /api/elections/[id] 오류:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 선거 정보 수정
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      description,
      start_time,
      end_time,
      admin_password,
      is_anonymous,
      candidates,
      current_password, // 비밀번호 확인용
      access_code, // ✅ 수신
      is_secret, // ✅ 추가
      enable_nft_receipt, // ✅ 추가
    } = body;

    // 현재 비밀번호 확인 (verify-password API로 이미 확인됨)
    if (!current_password) {
      return NextResponse.json(
        { error: '관리자 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 선거 정보 업데이트 (elections 테이블만)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (is_anonymous !== undefined) updateData.is_anonymous = is_anonymous;
    if (access_code !== undefined) updateData.access_code = access_code; // ✅ 업데이트
    if (is_secret !== undefined) updateData.is_secret = is_secret; // ✅ 업데이트
    if (enable_nft_receipt !== undefined) updateData.enable_nft_receipt = enable_nft_receipt; // ✅ 업데이트

    const { data: updatedElection, error: updateError } = await supabase
      .from('elections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] 선거 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // 후보자 업데이트 (candidates 테이블 - 별도 처리)
    if (candidates && Array.isArray(candidates)) {
      try {
        // 기존 후보자 삭제
        await supabase.from('candidates').delete().eq('election_id', id);

        // 새 후보자 삽입
        const candidateData = candidates.map((c: any, index: number) => ({
          election_id: id,
          name: c.name || c,
          description: c.description || null,
          image_url: c.image_url || null,
          order: index,
        }));

        const { error: candidatesError } = await supabase
          .from('candidates')
          .insert(candidateData);

        if (candidatesError) {
          console.error('[API] 후보자 업데이트 오류:', candidatesError);
        }
      } catch (candError) {
        console.error('[API] 후보자 처리 중 오류:', candError);
      }
    }

    console.log(`[API] ✅ 선거 수정 완료: id=${id}`);
    return NextResponse.json({
      message: '선거가 수정되었습니다.',
      election: updatedElection,
    });
  } catch (error: any) {
    console.error('[API] PUT /api/elections/[id] 오류:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 선거 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('elections')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('[API] 선거 삭제 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[API] ✅ 선거 삭제 완료: id=${id}`);
    return NextResponse.json({ message: '선거가 삭제되었습니다.' });
  } catch (error: any) {
    console.error('[API] DELETE /api/elections/[id] 오류:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
