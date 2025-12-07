import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import bcrypt from 'bcryptjs'
import { ethers } from 'ethers'
import { VOTE_CONTRACT_ABI, VOTE_CONTRACT_ADDRESS } from '@/lib/contractConfig'

export async function POST(req: Request) {
  try {
    const body: any = await req.json()

    // 간단한 입력 로깅 (민감 정보는 로깅하지 않음)
    console.log(
      '[API] POST /api/elections body summary:',
      JSON.stringify({
        title: body.title,
        candidatesCount: body.candidates?.length ?? 0,
        voting_method: body.voting_method,
      })
    )

    const {
      title,
      description,
      start_time,
      end_time,
      voting_method,
      voting_method_params,
      candidates,
      admin_password,
      is_anonymous,
      votes_per_voter,
      access_code, // ✅ 수신
      is_secret, // ✅ 추가
      enable_nft_receipt, // ✅ 추가
    } = body

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API] Missing SUPABASE_SERVICE_ROLE_KEY env')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // 해시 (비밀번호가 제공된 경우에만)
    let hash: string | null = null
    if (admin_password) {
      const salt = bcrypt.genSaltSync(10)
      hash = bcrypt.hashSync(admin_password, salt)
    }

    // contract_election_id 생성 (uint256 호환, 고유성 보장 위해 시간+난수 조합)
    // 32비트 정수 범위가 아니라 uint256 범위이므로 Date.now() 등 사용 가능
    // 단, JS Number는 2^53-1까지만 안전하므로 SafeInteger 범위 내에서 생성
    const contractId = Date.now() + Math.floor(Math.random() * 1000);

    const { data, error } = await supabaseAdmin
      .from('elections')
      .insert([
        {
          title,
          description,
          start_time,
          end_time,
          voting_method,
          voting_method_params,
          is_anonymous,
          votes_per_voter,
          admin_password_hash: hash,
          contract_election_id: contractId,
          access_code: access_code || null, // ✅ DB 저장 (없으면 null)
          is_secret: is_secret ?? false,
          enable_nft_receipt: enable_nft_receipt ?? false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[API] supabase insert error:', error)
      return NextResponse.json(
        { error: error.message ?? error },
        { status: 500 }
      )
    }

    // 후보자 일괄 삽입
    if (candidates && candidates.length) {
      const cands = candidates.map((c: any) => ({ ...c, election_id: data.id }))
      const { error: cErr } = await supabaseAdmin
        .from('candidates')
        .insert(cands)
      if (cErr) {
        console.error('[API] supabase candidates insert error:', cErr)
        // 후보자 삽입 실패여도 선거는 생성되었으므로 500 응답
        return NextResponse.json(
          { error: cErr.message ?? cErr },
          { status: 500 }
        )
      }
    }

    let blockchainResult = {
      success: false,
      txHash: null as string | null,
      error: null as string | null,
    };

    // 스마트 컨트랙트에 선거 등록
    try {
      const rpcUrl =
        process.env.SEPOLIA_RPC_URL ||
        'https://sepolia.infura.io/v3/7553e239fb2c4c2a9d9b9affb8422b4f';
      const privateKey = process.env.PRIVATE_KEY;

      console.log('[API] 환경변수 확인:', {
        hasPrivateKey: !!privateKey,
        hasContractAddress: !!VOTE_CONTRACT_ADDRESS,
        contractAddress: VOTE_CONTRACT_ADDRESS,
        rpcUrl: rpcUrl.substring(0, 50) + '...',
      });

      if (privateKey && VOTE_CONTRACT_ADDRESS) {
        console.log('[API] 컨트랙트 연결 시도...');
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(
          VOTE_CONTRACT_ADDRESS,
          VOTE_CONTRACT_ABI,
          wallet
        );

        // 중요: 생성해둔 contractId를 그대로 사용 (Supabase ID 변환 X)
        const electionId = contractId;

        // 후보자 이름 배열
        const candidateNames = candidates?.map((c: any) => c.name) || [];

        console.log(
          `[API] 컨트랙트에 선거 등록 시도: ContractID=${electionId} (SupabaseID=${data.id}), 후보자=${candidateNames.length}명`,
          candidateNames
        );

        const tx = await contract.createElection(electionId, candidateNames);
        console.log(`[API] 트랜잭션 전송 성공 (Mining 대기 생략): ${tx.hash}`);

        // await tx.wait(); // 타임아웃 방지를 위해 서버에서 기다리지 않음

        blockchainResult.success = true;
        blockchainResult.txHash = tx.hash;
      } else {
        console.warn('[API] ❌ 컨트랙트 등록 건너뜀: 키 설정 없음');
        blockchainResult.error = 'No server-side wallet configuration found';
      }
    } catch (contractErr: any) {
      console.error('[API] ❌ 컨트랙트 등록 실패:', contractErr.message);
      console.error('[API] 에러 상세:', contractErr);
      blockchainResult.error = contractErr.message || String(contractErr);
    }

    return NextResponse.json({ data, blockchainResult });
  } catch (err: any) {
    console.error('[API] Unexpected error in /api/elections:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
