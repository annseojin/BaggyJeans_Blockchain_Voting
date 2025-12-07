import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { candidateId } = body;

    if (!id || !candidateId) {
      return NextResponse.json(
        { error: 'Missing election ID or candidate ID' },
        { status: 400 }
      );
    }

    // 1. 선거 정보 가져오기 (Total Votes 업데이트용)
    const { data: election, error: electionError } = await supabaseAdmin
      .from('elections')
      .select('totalVotes, total_votes') // 컬럼명 혼용 가능성 대비
      .eq('id', id)
      .single();

    if (electionError) {
      console.error('Error fetching election:', electionError);
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    // 2. 후보자 정보 가져오기 (Vote Count 업데이트용)
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('vote_count')
      .eq('id', candidateId)
      .single();

    if (candidateError) {
      console.error('Error fetching candidate:', candidateError);
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // 3. 업데이트
    
    // CamelCase vs SnakeCase 대응
    const currentTotal = election.totalVotes ?? election.total_votes ?? 0;
    const currentCandidateVotes = candidate.vote_count ?? 0;

    // 선거 전체 투표수 +1
    const { error: updateElectionError } = await supabaseAdmin
      .from('elections')
      .update({ total_votes: currentTotal + 1 } as any)
      .eq('id', id);

    if (updateElectionError) {
      console.error('Error updating election:', updateElectionError);
    }

    // 후보자 득표수 +1
    const { error: updateCandidateError } = await supabaseAdmin
      .from('candidates')
      .update({ vote_count: currentCandidateVotes + 1 })
      .eq('id', candidateId);

    if (updateCandidateError) {
      console.error('Error updating candidate:', updateCandidateError);
      return NextResponse.json(
        { error: 'Failed to update candidate votes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, newVoteCount: currentCandidateVotes + 1 });
  } catch (err: any) {
    console.error('Vote API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
