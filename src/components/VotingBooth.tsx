// src/components/VotingBooth.tsx
'use client';

import { useState, useEffect } from 'react';
import { Election, Voter } from '@/types';
import { getBlockchain, saveBlockchain } from '@/utils/blockchain';
import {
  submitVoteToContract,
  hasVoted as checkHasVoted,
} from '@/utils/smartContract';
import {
  generateNFTReceipt,
  saveNFTReceiptToVoter,
  shouldMintNFTReceipt,
  mintOnChainNFTReceipt,
} from '@/utils/nftReceipt';
import { saveSecretVoteLocally } from '@/utils/secretVoting';
import { BrowserProvider } from 'ethers';

interface VotingBoothProps {
  election: Election;
  voter: Voter;
  onBack: () => void;
}

export function VotingBooth({ election, voter, onBack }: VotingBoothProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null
  );
  const [selectedCandidateName, setSelectedCandidateName] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [useSmartContract, setUseSmartContract] = useState(false);
  const [hasVotedOnContract, setHasVotedOnContract] = useState(false);

  const [nftReceipt, setNftReceipt] = useState<any | null>(null);
  const [showNFTInfo, setShowNFTInfo] = useState(false);
  const [hasVotedOnBlockchain, setHasVotedOnBlockchain] = useState(false);

  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [isAccessCodeVerified, setIsAccessCodeVerified] = useState(false);
  const [showAccessCodePrompt, setShowAccessCodePrompt] = useState(false);

  // MetaMask + 컨트랙트 상태 체크
  useEffect(() => {
    checkMetaMaskAndContractStatus();
    checkBlockchainVoteStatus();

    // 입장 코드가 설정되어 있으면 검증 필요
    if (election.accessCode && !isAccessCodeVerified) {
      setShowAccessCodePrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [election.id, voter.id]);

  const checkMetaMaskAndContractStatus = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new BrowserProvider((window as any).ethereum);
        const accounts = await provider.listAccounts();

        if (accounts && accounts.length > 0) {
          setUseSmartContract(true);

          try {
            const walletAddress = accounts[0].address;
            const hasVotedResult = await checkHasVoted(
              election.contract_election_id ?? election.id,
              walletAddress
            );
            setHasVotedOnContract(hasVotedResult);
          } catch (err) {
            console.warn('컨트랙트 투표 상태 확인 실패:', err);
            setHasVotedOnContract(false);
          }
        }
      }
    } catch (err) {
      console.warn('MetaMask 확인 실패:', err);
    }
  };

  const checkBlockchainVoteStatus = () => {
    try {
      const blockchain = getBlockchain();
      const hasVoted = blockchain.hasVoted(voter.id, election.id);
      setHasVotedOnBlockchain(hasVoted);
    } catch (err) {
      console.warn('블록체인 투표 상태 확인 실패:', err);
      setHasVotedOnBlockchain(false);
    }
  };

  // 다양한 날짜 포맷(startDate, start_time, epoch초/밀리, {seconds})을 안전하게 파싱
  const normalizeDateValue = (v: any): number => {
    if (v == null) return NaN;

    if (typeof v === 'number') {
      const s = String(v);
      return s.length === 10 ? v * 1000 : v;
    }

    if (typeof v === 'object' && v.seconds != null) {
      return Number(v.seconds) * 1000;
    }

    const parsed = Date.parse(String(v));
    return Number.isNaN(parsed) ? NaN : parsed;
  };

  const handleAccessCodeSubmit = () => {
    if (!election.accessCode) {
      setIsAccessCodeVerified(true);
      setShowAccessCodePrompt(false);
      return;
    }

    if (accessCodeInput.trim() === election.accessCode.trim()) {
      setIsAccessCodeVerified(true);
      setShowAccessCodePrompt(false);
      setError(null);
    } else {
      setError('입장 코드가 올바르지 않습니다.');
    }
  };

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedCandidateId) {
        setError('후보자를 선택해주세요.');
        setLoading(false);
        return;
      }

      const now = Date.now();
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

      if (now < start) {
        setError('투표가 아직 시작되지 않았습니다.');
        setLoading(false);
        return;
      }

      if (now > end) {
        setError('투표 기간이 종료되었습니다.');
        setLoading(false);
        return;
      }

      // 블록체인 기반 중복투표 체크 (DID/MetaMask 모두 적용)
      const blockchain = getBlockchain();
      if (blockchain.hasVoted(voter.id, election.id)) {
        setError('이미 이 투표에 참여했습니다. (블록체인 기록 확인됨)');
        setLoading(false);
        return;
      }

      // localStorage 중복투표 체크 (추가 안전장치)
      if (voter.votedElections.includes(election.id)) {
        setError('이미 이 투표에 참여했습니다.');
        setLoading(false);
        return;
      }

      const candidateIndex = election.candidates.findIndex(
        (c) => c.id === selectedCandidateId
      );

      // MetaMask 연결 확인 및 트랜잭션 실행
      let contractVoteSuccess = false;
      const isMetaMaskConnected =
        typeof window !== 'undefined' && (window as any).ethereum;

      if (isMetaMaskConnected) {
        try {
          const provider = new BrowserProvider((window as any).ethereum);
          const accounts = await provider.listAccounts();

          if (accounts && accounts.length > 0) {
            console.log('🔗 MetaMask 연결됨:', accounts[0].address);

            // 사용자에게 트랜잭션 확인 안내
            setError('MetaMask에서 트랜잭션을 확인해주세요...');

            // 🔥 수정: contract_election_id가 있으면 그것을 사용, 없으면 기존 로직(id) 사용
            // 하지만 이제 contract_election_id가 필수값에 가까움
            const voteElectionId =
              election.contract_election_id ?? election.id;

            console.log(
              '🗳️ 투표 시도: Election ID=',
              voteElectionId,
              '(contract_election_id=',
              election.contract_election_id,
              ')'
            );

            const result = await submitVoteToContract(
              voteElectionId,
              candidateIndex,
              provider
            );

            if (result.success) {
              contractVoteSuccess = true;
              console.log('✅ 스마트 컨트랙트 투표 성공:', result.txHash);
              setError(null);
            } else {
              // 모든 실패는 투표 중단
              if (
                result.error?.includes('user rejected') ||
                result.error?.includes('rejected') ||
                result.error?.includes('User denied')
              ) {
                setError('트랜잭션이 취소되었습니다.');
              } else if (result.error?.includes('Election not found')) {
                setError(
                  '⛔ 아직 블록체인에 선거가 등록되는 중입니다.\n1~2분 정도 기다렸다가 다시 시도해주세요.'
                );
              } else {
                setError(`트랜잭션 실패: ${result.error}`);
              }
              setLoading(false);
              return;
            }
          } else {
            setError('MetaMask 계정을 연결해주세요.');
            setLoading(false);
            return;
          }
        } catch (err: any) {
          if (
            err.code === 'ACTION_REJECTED' ||
            err.message?.includes('user rejected') ||
            err.message?.includes('rejected') ||
            err.message?.includes('User denied')
          ) {
            setError('트랜잭션이 취소되었습니다.');
          } else {
            setError(`트랜잭션 오류: ${err.message}`);
          }
          setLoading(false);
          return;
        }
      } else {
        setError('MetaMask를 설치하고 연결해주세요.');
        setLoading(false);
        return;
      }

      // 로컬 블록체인 기록 (블록체인 인스턴스는 위에서 이미 가져옴)
      if (election.isSecret) {
        saveSecretVoteLocally(election.id, candidateIndex);

        await blockchain.mineBlock({
          id: Date.now(),
          type: 'VOTE',
          electionId: election.id, // 🔥 number
          voterId: voter.id,
          candidateId: `secret-${candidateIndex}`,
          timestamp: Date.now(),
          signature: `sig-${Date.now()}`,
        });
      } else {
        await blockchain.mineBlock({
          id: Date.now(),
          type: 'VOTE',
          electionId: election.id,
          voterId: voter.id,
          candidateId: selectedCandidateId,
          timestamp: Date.now(),
          signature: `sig-${Date.now()}`,
        });
      }

      saveBlockchain();

      // 유권자 정보 업데이트
      const updatedVoter: Voter = {
        ...voter,
        votedElections: [...voter.votedElections, election.id],
      };
      localStorage.setItem('currentVoter', JSON.stringify(updatedVoter));

      const voters: Voter[] = JSON.parse(
        localStorage.getItem('voters') || '[]'
      );
      const updatedVoters = voters.map((v) =>
        v.id === voter.id
          ? { ...v, votedElections: [...v.votedElections, election.id] }
          : v
      );
      localStorage.setItem('voters', JSON.stringify(updatedVoters));

      // elections 득표수 업데이트
      try {
        const stored = localStorage.getItem('elections');
        if (stored) {
          const elections: Election[] = JSON.parse(stored);

          const updated = elections.map((el) => {
            if (el.id !== election.id) return el;

            const updatedCandidates = el.candidates.map((c, idx) =>
              idx === candidateIndex
                ? { ...c, voteCount: (c.voteCount ?? 0) + 1 }
                : c
            );

            return {
              ...el,
              candidates: updatedCandidates,
              totalVotes: (el.totalVotes ?? 0) + 1,
            };
          });

          localStorage.setItem('elections', JSON.stringify(updated));
          window.dispatchEvent(new Event('electionsUpdated'));

          // ✅ 탈중앙화 모드: DB 동기화 없이 블록체인 데이터만 신뢰
          console.log('✅ 블록체인 저장 완료. (DB 동기화 생략)');
        }
      } catch (err) {
        console.error('득표수 업데이트 실패:', err);
      }

      // NFT 영수증
      try {
        const mint = election.enableNFTReceipt;
        if (mint && selectedCandidateName) {
          const offchain = await generateNFTReceipt(
            election.id,
            election.title,
            selectedCandidateId,
            selectedCandidateName,
            voter.id,
            JSON.parse(localStorage.getItem('voters') || '[]')
          );

          let finalReceipt = offchain;

          if (
            useSmartContract &&
            typeof window !== 'undefined' &&
            (window as any).ethereum
          ) {
            try {
              const { tokenId } = await mintOnChainNFTReceipt(
                election.id,
                offchain.metadataURI
              );
              finalReceipt = { ...offchain, tokenId };
            } catch (err) {
              console.warn('온체인 NFT 발급 실패 → 오프체인만 사용:', err);
            }
          }

          await saveNFTReceiptToVoter(voter.id, finalReceipt);
          setNftReceipt(finalReceipt);
        }
      } catch (err) {
        console.warn('NFT 발급 실패(투표는 성공):', err);
      }

      // 투표 완료 메시지 설정
      if (contractVoteSuccess) {
        console.log('✅ 블록체인 투표 완료 (스마트 컨트랙트 + 로컬)');
        // MetaMask 사용자에게 성공 안내
        if (useSmartContract) {
          alert(
            '✅ 투표가 블록체인에 성공적으로 기록되었습니다!\n\nMetaMask에서 트랜잭션을 확인할 수 있습니다.'
          );
        }
      } else {
        console.log('✅ 로컬 투표 완료 (스마트 컨트랙트 실패 또는 미연결)');
      }

      setSubmitted(true);
      setError(null);
    } catch (err) {
      console.error('투표 오류:', err);
      setError('투표 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 투표 완료 화면
  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            투표가 완료되었습니다.
          </h2>

          {nftReceipt && (
            <div className="mt-8 max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple-500 relative">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                <h3 className="font-bold text-lg tracking-wider">
                  OFFICIAL RECEIPT
                </h3>
                <p className="text-xs opacity-80">Blockchain Verified Vote</p>
              </div>

              <div className="p-6 text-left space-y-4">
                <div className="flex justify-between items-end border-b pb-2">
                  <span className="text-gray-500 text-xs uppercase">
                    Election
                  </span>
                  <span className="font-bold text-right truncate ml-4">
                    {nftReceipt.electionTitle}
                  </span>
                </div>

                <div className="flex justify-between items-end border-b pb-2">
                  <span className="text-gray-500 text-xs uppercase">
                    Voter ID
                  </span>
                  <span className="font-mono text-sm">
                    {nftReceipt.voterAddress.substring(0, 8)}...
                    {nftReceipt.voterAddress.substring(36)}
                  </span>
                </div>

                <div className="bg-gray-50 p-3 rounded text-xs break-all border font-mono text-gray-600">
                  <p className="font-bold text-purple-600 mb-1">
                    Metadata URI:
                  </p>
                  <a
                    href={nftReceipt.metadataURI}
                    target="_blank"
                    className="hover:text-purple-800 underline"
                  >
                    {nftReceipt.metadataURI}
                  </a>
                </div>

                {nftReceipt.tokenId && (
                  <div className="text-center">
                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">
                      Token ID: #{nftReceipt.tokenId}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-2 text-center border-t text-[10px] text-gray-400">
                Authorized by MultiElectionVote Smart Contract
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
        >
          돌아가기
        </button>
      </div>
    );
  }

  // 진행 중 화면
  const now = Date.now();
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
  const isVotingOpen = now >= start && now <= end;
  const hasVotedLocally = voter.votedElections.includes(election.id);
  const isVotingClosed = now > end;

  // 당선자 계산
  const winner =
    isVotingClosed && election.candidates.length > 0
      ? election.candidates.reduce((prev, current) =>
          (current.voteCount ?? 0) > (prev.voteCount ?? 0) ? current : prev
        )
      : null;

  // 입장 코드 검증 화면
  if (showAccessCodePrompt && election.accessCode) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-lg shadow max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{election.title}</h1>
            <p className="text-gray-600">이 투표는 입장 코드가 필요합니다</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                입장 코드
              </label>
              <input
                type="text"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                placeholder="입장 코드를 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAccessCodeSubmit();
                  }
                }}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAccessCodeSubmit}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                확인
              </button>
              <button
                onClick={onBack}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-2">{election.title}</h1>

            {/* 투표 마감 후 결과 표시 */}
            {isVotingClosed && (
              <div className="mt-4 mb-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">🏆</span>
                  <div>
                    <h2 className="text-xl font-bold text-yellow-900">
                      투표 마감
                    </h2>
                    <p className="text-sm text-yellow-700">
                      최종 투표 결과입니다
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-yellow-200">
                  {(() => {
                    const maxVotes = Math.max(
                      ...election.candidates.map((c) => c.voteCount ?? 0)
                    );

                    if (maxVotes === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-lg font-bold text-gray-500">
                            투표자가 없습니다
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            (총 투표수: 0표)
                          </p>
                        </div>
                      );
                    }

                    const winners = election.candidates.filter(
                      (c) => (c.voteCount ?? 0) === maxVotes
                    );

                    if (winners.length > 1) {
                      return (
                        <div className="text-center py-2">
                          <p className="text-xl font-bold text-orange-600 mb-2">
                            동점으로 무승부가 났습니다
                          </p>
                          <p className="text-sm text-gray-600">
                            동점자:{' '}
                            {winners.map((w) => w.name).join(', ')}
                          </p>
                          <p className="text-sm font-semibold text-blue-600 mt-2">
                            각 {maxVotes}표
                          </p>
                        </div>
                      );
                    }

                    const winner = winners[0];
                    return (
                      <>
                        <p className="text-sm text-gray-600 mb-1">당선자</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {winner.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          득표수:{' '}
                          <span className="font-semibold text-blue-600">
                            {winner.voteCount ?? 0}
                          </span>
                          표
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

        <form onSubmit={handleVote} className="space-y-6 mt-6">
          <div>
            <h2 className="text-xl font-bold mb-3">후보자 선택</h2>
            <div className="space-y-3">
              {election.candidates.map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                  style={{
                    borderColor:
                      selectedCandidateId === candidate.id
                        ? '#2563eb'
                        : '#e5e7eb',
                    backgroundColor:
                      selectedCandidateId === candidate.id
                        ? '#eff6ff'
                        : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="candidate"
                    value={candidate.id}
                    checked={selectedCandidateId === candidate.id}
                    onChange={() => {
                      setSelectedCandidateId(candidate.id);
                      setSelectedCandidateName(candidate.name);
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium">{candidate.name}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-red-900 font-bold mb-2">오류 발생</h3>
                  <p className="text-red-700 whitespace-pre-line">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={
                loading ||
                isVotingClosed ||
                !isVotingOpen ||
                hasVotedLocally ||
                hasVotedOnContract ||
                hasVotedOnBlockchain
              }
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {loading
                ? '투표 중...'
                : isVotingClosed
                ? '투표가 마감되었습니다'
                : hasVotedOnBlockchain
                ? '이미 블록체인에 투표 완료'
                : hasVotedOnContract
                ? '이미 컨트랙트에서 투표 완료'
                : hasVotedLocally
                ? '이미 투표 완료'
                : !isVotingOpen
                ? '투표 기간 아님'
                : '투표하기'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
            >
              돌아가기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
