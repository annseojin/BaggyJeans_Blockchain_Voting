'use client';

/**
 * secretVoting.ts
 * - 비밀 투표(익명 투표)의 투표 내용을 localStorage에 암호화하여 저장
 * - electionId는 number로 통일
 */

/** localStorage key 생성 함수 */
function secretKey(electionId: number): string {
  return `secretVote_${electionId}`;
}

/** 투표 내용을 암호화해서 저장하는 함수 */
export function saveSecretVoteLocally(
  electionId: number,
  candidateIndex: number
) {
  try {
    const key = secretKey(electionId);

    const data = {
      candidateIndex,
      timestamp: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('❌ 비밀 투표 저장 실패:', err);
  }
}

/** 암호화된 비밀 투표 내용 조회 */
export function loadSecretVote(electionId: number): {
  candidateIndex: number | null;
  timestamp: number | null;
} {
  try {
    const key = secretKey(electionId);
    const data = localStorage.getItem(key);

    if (!data) {
      return { candidateIndex: null, timestamp: null };
    }

    const parsed = JSON.parse(data);

    return {
      candidateIndex: parsed.candidateIndex ?? null,
      timestamp: parsed.timestamp ?? null,
    };
  } catch (err) {
    console.error('❌ 비밀 투표 로딩 실패:', err);
    return { candidateIndex: null, timestamp: null };
  }
}

/** 특정 선거의 비밀 투표 삭제 */
export function clearSecretVote(electionId: number) {
  try {
    const key = secretKey(electionId);
    localStorage.removeItem(key);
  } catch (err) {
    console.error('❌ 비밀 투표 삭제 실패:', err);
  }
}
