'use client';

import { ethers } from 'ethers';
import { VOTE_CONTRACT_ABI, VOTE_CONTRACT_ADDRESS } from '@/lib/contractConfig';
import type { Election } from '@/types';

/** UUID를 uint256 범위 내 숫자로 변환 */
function uuidToContractId(uuid: string): number {
  // UUID에서 하이픈 제거하고 앞 8자리만 사용 (32비트)
  const hex = uuid.replace(/-/g, '').substring(0, 8);
  return parseInt(hex, 16);
}

/** electionId를 number로 강제 변환 */
function toNumericId(id: any): number {
  // UUID 형식이면 변환
  if (typeof id === 'string' && id.includes('-')) {
    return uuidToContractId(id);
  }
  
  const n = Number(id);
  if (!Number.isNaN(n) && Number.isSafeInteger(n)) return n;
  return parseInt(String(id).replace(/\D/g, ''), 10) || Date.now();
}

let voteContract: ethers.Contract | null = null;

// ───────────────────────────────────────────────
// 1) 로컬 득표수 업데이트
// ───────────────────────────────────────────────
function updateLocalElectionVotes(electionId: number, candidateIndex: number) {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem('elections');
    if (!stored) return;

    const elections: Election[] = JSON.parse(stored);

    const updated = elections.map((election) => {
      if (toNumericId(election.id) !== electionId) return election;

      const updatedCandidates = election.candidates.map((c, idx) =>
        idx === candidateIndex ? { ...c, voteCount: (c.voteCount ?? 0) + 1 } : c
      );

      return {
        ...election,
        candidates: updatedCandidates,
        totalVotes: (election.totalVotes ?? 0) + 1,
      };
    });

    localStorage.setItem('elections', JSON.stringify(updated));
  } catch (err) {
    console.error('localStorage elections 업데이트 실패:', err);
  }
}

// ───────────────────────────────────────────────
// 2) 컨트랙트 인스턴스 생성
// ───────────────────────────────────────────────
export async function getVoteContract(
  signer?: ethers.Signer
): Promise<ethers.Contract | null> {
  if (!VOTE_CONTRACT_ADDRESS) {
    console.warn('컨트랙트 주소가 없습니다.');
    return null;
  }

  try {
    if (!signer) {
      // 1. MetaMask가 있으면 우선 사용 (더 안정적 - RPC 노드 이슈 회피)
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          voteContract = new ethers.Contract(
            VOTE_CONTRACT_ADDRESS,
            VOTE_CONTRACT_ABI,
            provider
          );
          return voteContract;
        } catch (e) {
          console.warn('MetaMask provider init fail, falling back to RPC');
        }
      }

      // 2. Fallback: 읽기 전용 provider
      const infuraKey = process.env.NEXT_PUBLIC_INFURA_API_KEY;
      const rpcUrl = infuraKey
        ? `https://sepolia.infura.io/v3/${infuraKey}`
        : 'https://rpc2.sepolia.org';

      const provider = new ethers.JsonRpcProvider(rpcUrl);

      voteContract = new ethers.Contract(
        VOTE_CONTRACT_ADDRESS,
        VOTE_CONTRACT_ABI,
        provider
      );
    } else {
      voteContract = new ethers.Contract(
        VOTE_CONTRACT_ADDRESS,
        VOTE_CONTRACT_ABI,
        signer
      );
    }

    return voteContract;
  } catch (err) {
    console.warn('컨트랙트 연결 실패:', err);
    return null;
  }
}

// ───────────────────────────────────────────────
// Signer가 포함된 컨트랙트 가져오기
// ───────────────────────────────────────────────
export async function getContractWithSigner(): Promise<ethers.Contract> {
  if (!VOTE_CONTRACT_ADDRESS) {
    throw new Error('컨트랙트 주소가 설정되지 않았습니다.');
  }

  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask가 설치되지 않았습니다.');
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();

  return new ethers.Contract(
    VOTE_CONTRACT_ADDRESS,
    VOTE_CONTRACT_ABI,
    signer
  );
}

// ───────────────────────────────────────────────
// 3) hasVoted(electionId, voterAddress)
// ───────────────────────────────────────────────
export async function hasVoted(
  electionId: number | string,
  walletAddress: string
): Promise<boolean> {
  try {
    const contract = await getVoteContract();
    if (!contract) return false;

    const id = toNumericId(electionId);
    const result = await contract.hasVoted(id, walletAddress);

    return result;
  } catch (error) {
    console.warn('hasVoted() 조회 실패:', error);
    return false;
  }
}

// ───────────────────────────────────────────────
// 4) getCandidates(electionId)
// ───────────────────────────────────────────────
export async function getCandidatesFromContract(
  electionId?: number | string
): Promise<Array<{ name: string; voteCount: number }>> {
  try {
    const contract = await getVoteContract();
    if (!contract) return [];

    const id = electionId !== undefined ? toNumericId(electionId) : 0;
    const candidates = await contract.getCandidates(id);

    return candidates.map((c: any) => ({
      name: c.name,
      voteCount: Number(c.voteCount),
    }));
  } catch (error) {
    console.warn('후보 목록 조회 실패:', error);
    return [];
  }
}

// ───────────────────────────────────────────────
// 5) isVotingOpen(electionId)
// ───────────────────────────────────────────────
export async function isVotingOpen(
  electionId?: number | string
): Promise<boolean> {
  try {
    const contract = await getVoteContract();
    if (!contract) return true;

    const id = electionId !== undefined ? toNumericId(electionId) : 0;
    const result = await contract.isVotingOpen(id);

    return result;
  } catch (error) {
    console.warn('투표 상태 조회 실패:', error);
    return true;
  }
}

// ───────────────────────────────────────────────
// 6) vote(electionId, candidateIndex)
// ───────────────────────────────────────────────
export async function submitVoteToContract(
  electionId: number | string,
  candidateIndex: number,
  signerOrProvider: ethers.Signer | ethers.BrowserProvider
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    let signer: ethers.Signer;

    // BrowserProvider → signer 변환
    if (signerOrProvider instanceof ethers.BrowserProvider) {
      const accounts = await signerOrProvider.listAccounts();
      if (!accounts || accounts.length === 0) {
        return { success: false, error: '지갑이 연결되지 않았습니다.' };
      }
      signer = await signerOrProvider.getSigner();
    } else {
      signer = signerOrProvider as ethers.Signer;
    }

    const contract = await getVoteContract(signer);
    if (!contract) {
      return { success: false, error: '컨트랙트 연결 실패' };
    }

    const id = toNumericId(electionId);

    // 이미 투표했는지 확인
    try {
      const wallet = await signer.getAddress();
      const already = await contract.hasVoted(id, wallet);

      if (already) {
        return { success: false, error: '이미 이 선거에 투표했습니다.' };
      }
    } catch (err: any) {
      // Election not found 에러는 명확하게 처리
      if (err.message?.includes('Election not found')) {
        return { 
          success: false, 
          error: '이 선거는 블록체인에 등록되지 않았습니다. 관리자에게 문의하세요.' 
        };
      }
      console.warn('hasVoted 확인 실패:', err);
    }

    // 실제 투표 실행
    const tx = await contract.vote(id, candidateIndex);
    const receipt = await tx.wait();

    // 로컬 업데이트
    updateLocalElectionVotes(id, candidateIndex);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('electionsUpdated'));
    }

    return {
      success: true,
      txHash: receipt?.hash,
    };
  } catch (error: any) {
    // "Election not found" 오류는 일반적인 상황 (로컬 전용 선거)
    if (error.message?.includes('Election not found')) {
      console.log(
        'ℹ️ 로컬 전용 선거: 스마트 컨트랙트에 등록되지 않은 선거입니다. 로컬 투표로 진행합니다.'
      );
    } else {
      console.error('submitVoteToContract 오류:', error);
    }
    return {
      success: false,
      error: error.message ?? '투표 중 오류 발생',
    };
  }
}

// ───────────────────────────────────────────────
// 7) openVoting(electionId)
// ───────────────────────────────────────────────
export async function openVotingOnContract(
  electionId: number | string,
  signer: ethers.Signer
) {
  try {
    const contract = await getVoteContract(signer);
    if (!contract) return { success: false, error: '컨트랙트 연결 실패' };

    const id = toNumericId(electionId);
    const tx = await contract.openVoting(id);
    const receipt = await tx.wait();

    return { success: true, txHash: receipt?.hash };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ───────────────────────────────────────────────
// 8) closeVoting(electionId)
// ───────────────────────────────────────────────
export async function closeVotingOnContract(
  electionId: number | string,
  signer: ethers.Signer
) {
  try {
    const contract = await getVoteContract(signer);
    if (!contract) return { success: false, error: '컨트랙트 연결 실패' };

    const id = toNumericId(electionId);

    const tx = await contract.closeVoting(id);
    const receipt = await tx.wait();

    return { success: true, txHash: receipt?.hash };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ───────────────────────────────────────────────
// 9) createElection(electionId, candidateNames)
// ───────────────────────────────────────────────
export async function createElectionOnContract(
  electionId: number | string,
  candidateNames: string[],
  signerOrProvider?: ethers.Signer | ethers.BrowserProvider
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    let signer: ethers.Signer;

    if (!signerOrProvider) {
      // BrowserProvider에서 signer 가져오기
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.listAccounts();
        if (!accounts || accounts.length === 0) {
          return { success: false, error: '지갑이 연결되지 않았습니다.' };
        }
        signer = await provider.getSigner();
      } else {
        return { success: false, error: 'MetaMask가 설치되지 않았습니다.' };
      }
    } else if (signerOrProvider instanceof ethers.BrowserProvider) {
      const accounts = await signerOrProvider.listAccounts();
      if (!accounts || accounts.length === 0) {
        return { success: false, error: '지갑이 연결되지 않았습니다.' };
      }
      signer = await signerOrProvider.getSigner();
    } else {
      signer = signerOrProvider as ethers.Signer;
    }

    const contract = await getVoteContract(signer);
    if (!contract) {
      return { success: false, error: '컨트랙트 연결 실패' };
    }

    const id = toNumericId(electionId);

    // 컨트랙트에 선거 생성
    const tx = await contract.createElection(id, candidateNames);
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt?.hash,
    };
  } catch (error: any) {
    // "not the owner" 오류는 일반 사용자에게 정상 동작이므로 콘솔 경고만 표시
    if (error.message?.includes('not the owner')) {
      console.log(
        'ℹ️ 일반 사용자 모드: 컨트랙트 소유자만 온체인 선거를 생성할 수 있습니다.'
      );
    } else {
      console.error('createElectionOnContract 오류:', error);
    }
    return {
      success: false,
      error: error.message ?? '선거 생성 중 오류 발생',
    };
  }
}
