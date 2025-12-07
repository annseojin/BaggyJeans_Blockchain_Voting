'use client';

import { useEffect, useState } from 'react';
import { Election, Voter } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { getCandidatesFromContract } from '@/utils/smartContract';

/** election.id가 string/number 섞여서 들어올 수 있으므로 숫자로 통일 */
function toNumericId(id: any): number {
  const n = Number(id);
  if (!Number.isNaN(n)) return n;
  const extracted = parseInt(String(id).replace(/\D/g, ''), 10);
  return extracted || Date.now();
}

interface ElectionListProps {
  voter: Voter;
  onVote: (election: Election) => void;
  onCreateElection: () => void;
  onEditElection: (election: Election) => void;
}

export function ElectionList({
  voter,
  onVote,
  onCreateElection,
  onEditElection,
}: ElectionListProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  // ─────────────────────────────────────────────
  // ✅ Supabase DB에서 직접 조회
  // ─────────────────────────────────────────────
  /* ✅ 블록체인 데이터와 DB 메타데이터 결합 조회 */
  const fetchElections = async () => {
    // 1. DB에서 메타데이터 가져오기
    const { data, error } = await supabase
      .from('elections')
      .select(
        `
        *,
        candidates (
          id, election_id, name, description, image_url, order, metadata, created_at
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('elections 조회 에러:', error);
      return;
    }

    // 2. 초기 상태 설정 (로딩 전 0표 표시)
    const initialElections = (data || []).map((e: any) => ({
      ...e,
      accessCode: e.access_code, // ✅ access_code 매핑 추가
      isSecret: e.is_secret, // ✅ 매핑 추가
      enableNFTReceipt: e.enable_nft_receipt, // ✅ 매핑 추가
      candidates: e.candidates.map((c: any) => ({
        ...c,
        voteCount: 0,
      })),
    }));
    setElections(initialElections);

    // 3. 블록체인에서 실시간 득표수 조회 (비동기 병렬 처리)
    initialElections.forEach(async (election: Election) => {
      // contract_election_id가 있으면 그것을, 없으면 id 사용
      const targetId =
        election.contract_election_id ?? toNumericId(election.id);

      try {
        const onChainCandidates = await getCandidatesFromContract(targetId);

        if (onChainCandidates && onChainCandidates.length > 0) {
          setElections((prev) =>
            prev.map((prevElection) => {
              if (prevElection.id !== election.id) return prevElection;

              // ✅ 이름 기준으로 매핑 (순서 섞임 방지)
              const newCandidates = prevElection.candidates.map((c) => {
                const onChainData = onChainCandidates.find(
                  (oc) => oc.name === c.name
                );
                return onChainData
                  ? { ...c, voteCount: onChainData.voteCount }
                  : c;
              });

              // 총 투표수 재계산
              const newTotal = newCandidates.reduce(
                (acc, c) => acc + (c.voteCount || 0),
                0
              );

              return {
                ...prevElection,
                candidates: newCandidates,
                totalVotes: newTotal,
              };
            })
          );
        }
      } catch (err) {
        console.warn(`선거(ID:${targetId}) 블록체인 조회 실패:`, err);
      }
    });
  };

  useEffect(() => {
    fetchElections();
  }, []);

  // 현재 시간 1초마다 갱신
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 날짜 입력값을 안전하게 JS 타임스탬프(ms)로 변환
  const normalizeDateValue = (v: any): number => {
    if (v == null) return NaN;

    // 숫자인 경우: 초 단위(10자리)인지 밀리초(13자리)인지 확인
    if (typeof v === 'number') {
      const s = String(v);
      return s.length === 10 ? v * 1000 : v;
    }

    // Supabase나 기타에서 { seconds, nanos } 형태로 올 수 있음
    if (typeof v === 'object' && v.seconds != null) {
      return Number(v.seconds) * 1000;
    }

    // 문자열 처리: Date.parse로 파싱
    const parsed = Date.parse(String(v));
    return Number.isNaN(parsed) ? NaN : parsed;
  };

  // 진행 중일 때: 남은 시간 계산
  const getRemainingTimeText = (endDate: any) => {
    const end = normalizeDateValue(endDate);
    if (Number.isNaN(end)) return '시간 정보 없음';

    const diff = end - now;
    if (diff <= 0) return '종료됨';

    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}일`);
    if (hours > 0) parts.push(`${hours}시간`);
    if (minutes > 0) parts.push(`${minutes}분`);
    parts.push(`${seconds}초`);

    return parts.join(' ');
  };

  // 예정: D-DAY 계산
  const getDDayText = (startDate: any) => {
    const start = normalizeDateValue(startDate);
    if (Number.isNaN(start)) return '';

    const diff = start - now;
    if (diff <= 0) return 'D-Day';

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 0 ? 'D-Day' : `D-${days}`;
  };

  // ─────────────────────────────────────────────
  // 상태 우선순위 구하기 (정렬용)
  // 진행중(1) → 예정됨(2) → 완료됨(3) → 날짜 오류(4)
  // ─────────────────────────────────────────────
  const getStatusOrder = (election: Election): number => {
    const rawStart =
      election.startDate ??
      (election as any).start_time ??
      (election as any).start_date;
    const rawEnd =
      election.endDate ??
      (election as any).end_time ??
      (election as any).end_date;

    const start = normalizeDateValue(rawStart);
    const end = normalizeDateValue(rawEnd);

    if (Number.isNaN(start) || Number.isNaN(end)) {
      // 날짜 오류 제일 아래
      return 4;
    }

    if (now < start) {
      // 예정
      return 2;
    }

    if (now >= start && now <= end) {
      // 진행중 제일 위
      return 1;
    }

    // 완료
    return 3;
  };

  // 정렬된 투표 목록
  const sortedElections = [...elections].sort((a, b) => {
    const orderA = getStatusOrder(a);
    const orderB = getStatusOrder(b);
    if (orderA !== orderB) return orderA - orderB;

    // 같은 상태끼리는 시작 시간이 늦을수록 위로 (최신 순)
    const rawStartA =
      a.startDate ?? (a as any).start_time ?? (a as any).start_date;
    const rawStartB =
      b.startDate ?? (b as any).start_time ?? (b as any).start_date;

    const startA = normalizeDateValue(rawStartA);
    const startB = normalizeDateValue(rawStartB);

    return (startB || 0) - (startA || 0);
  });

  // ─────────────────────────────────────────────
  // 관리자 비밀번호 확인 → 수정 화면 이동
  // ─────────────────────────────────────────────
  const handleAdminEdit = async (election: Election) => {
    const input = window.prompt('이 투표의 관리자 비밀번호를 입력하세요.');
    if (input == null) return;

    try {
      const response = await fetch(
        `/api/elections/${election.id}/verify-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: input }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (
          response.status === 400 &&
          result.error?.includes('No admin password')
        ) {
          alert('이 투표에는 관리자 비밀번호가 설정되어 있지 않습니다.');
        } else {
          alert('비밀번호 확인 중 오류가 발생했습니다.');
        }
        return;
      }

      if (!result.valid) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }

      // 비밀번호가 일치하면 수정 화면으로
      onEditElection(election);
    } catch (error) {
      console.error('비밀번호 확인 에러:', error);
      alert('비밀번호 확인 중 오류가 발생했습니다.');
    }
  };

  // ─────────────────────────────────────────────
  // 렌더링 시작
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          투표 목록
          <span className="ml-2 text-base text-gray-500">
            ({elections.length}개)
          </span>
        </h1>

        <button
          onClick={onCreateElection}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          새 투표 생성
        </button>
      </div>

      {elections.length === 0 ? (
        <div className="bg-white p-8 rounded-lg text-center">
          <p className="text-gray-600">진행 중인 투표가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1400px] mx-auto">
          {sortedElections.map((election) => {
            const id = toNumericId(election.id);
            const totalVotes = election.totalVotes ?? 0;

            const rawStart =
              election.startDate ??
              (election as any).start_time ??
              (election as any).start_date;
            const rawEnd =
              election.endDate ??
              (election as any).end_time ??
              (election as any).end_date;

            const start = normalizeDateValue(rawStart);
            const end = normalizeDateValue(rawEnd);

            let statusLabel = '';
            let statusColor = '';
            let rightText = '';

            if (Number.isNaN(start) || Number.isNaN(end)) {
              statusLabel = '날짜 오류';
              statusColor = 'bg-red-600';
              rightText = '';
            } else if (now < start) {
              statusLabel = '예정됨';
              statusColor = 'bg-gray-600';
              rightText = getDDayText(rawStart);
            } else if (now >= start && now <= end) {
              statusLabel = '진행중';
              statusColor = 'bg-green-600';
              rightText = getRemainingTimeText(rawEnd);
            } else {
              statusLabel = '완료됨';
              statusColor = 'bg-blue-600';
              rightText = '';
            }

            return (
              <div
                key={id}
                className="min-w-[380px] bg-white p-0 rounded-lg border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                <div
                  className={`${statusColor} w-full py-2 px-4 text-white font-bold flex items-center justify-between text-xs`}
                >
                  <span>{statusLabel}</span>
                  {rightText && (
                    <span className="font-medium opacity-90">{rightText}</span>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold mb-2">{election.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {election.description}
                  </p>

                  {now > end &&
                    election.candidates &&
                    election.candidates.length > 0 && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-bold text-yellow-800 mb-1">
                          🏆 당선자
                        </p>
                        {(() => {
                          const maxVotes = Math.max(
                            ...election.candidates.map(
                              (c) => c.voteCount ?? 0
                            )
                          );

                          if (maxVotes === 0) {
                            return (
                              <p className="text-sm text-gray-500 font-bold">
                                투표자가 없습니다
                              </p>
                            );
                          }

                          const winners = election.candidates.filter(
                            (c) => (c.voteCount ?? 0) === maxVotes
                          );

                          if (winners.length > 1) {
                            return (
                              <p className="text-sm text-orange-600 font-bold">
                                동점으로 무승부
                              </p>
                            );
                          }

                          const winner = winners[0];
                          return (
                            <p className="text-sm text-yellow-900">
                              <span className="font-bold">{winner.name}</span>
                              <span className="text-xs ml-2">
                                ({winner.voteCount ?? 0}표)
                              </span>
                            </p>
                          );
                        })()}
                      </div>
                    )}

                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => onVote(election)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {now > end ? '결과 보기' : '투표하기'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdminEdit(election)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-xs"
                    >
                      관리자 수정
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
