'use client';

import { useState, useEffect } from 'react';
import { Voter, Election, Candidate } from '@/types';
import { getBlockchain, saveBlockchain } from '@/utils/blockchain';
import { createElectionOnContract } from '@/utils/smartContract';

function toNumericId(id: any): number {
  const n = Number(id);
  if (!Number.isNaN(n)) return n;
  const extracted = parseInt(String(id).replace(/\D/g, ''), 10);
  return extracted || Date.now();
}

interface CreateElectionProps {
  voter: Voter;
  onBack: () => void;
  initialElection?: Election | null;
}

export function CreateElection({
  voter,
  onBack,
  initialElection,
}: CreateElectionProps) {
  const isEditMode = !!initialElection;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [candidates, setCandidates] = useState<string[]>(['', '']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSecret, setIsSecret] = useState(false);
  const [enableNFTReceipt, setEnableNFTReceipt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialElection) return;

    setTitle(initialElection.title || '');
    setDescription(initialElection.description || '');
    setCandidates(initialElection.candidates.map((c: Candidate) => c.name));
    setStartDate(initialElection.startDate || '');
    setEndDate(initialElection.endDate || '');
    setIsAnonymous(initialElection.isAnonymous ?? true);
    setIsSecret(initialElection.isSecret ?? false);
    setEnableNFTReceipt(initialElection.enableNFTReceipt ?? false);
    setAdminPassword(initialElection.adminPassword ?? '');
    setAccessCode(initialElection.accessCode ?? '');
  }, [initialElection]);

  const handleAddCandidate = () => setCandidates([...candidates, '']);
  const handleRemoveCandidate = (idx: number) =>
    candidates.length > 2 &&
    setCandidates(candidates.filter((_, i) => i !== idx));

  const handleCandidateChange = (idx: number, val: string) => {
    const arr = [...candidates];
    arr[idx] = val;
    setCandidates(arr);
  };

  const finishError = (msg: string) => {
    setError(msg);
    setLoading(false);
    return;
  };

  /* ✅ 관리자용 투표 삭제 */
  const handleDelete = async () => {
    if (!isEditMode || !initialElection) return;

    if (
      !window.confirm(
        '정말 이 투표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return;
    }

    // 비밀번호 확인
    if (!adminPassword.trim()) {
      return finishError('투표를 삭제하려면 관리자 비밀번호를 입력하세요.');
    }

    try {
      setError(null);
      setLoading(true);

      // 비밀번호 확인 API 호출
      const verifyResponse = await fetch(
        `/api/elections/${initialElection.id}/verify-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPassword }),
        }
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        return finishError(errorData.error || '비밀번호 확인 실패');
      }

      const verifyResult = await verifyResponse.json();
      if (!verifyResult.valid) {
        return finishError('관리자 비밀번호가 일치하지 않습니다.');
      }

      // 백엔드에서 삭제
      const deleteResponse = await fetch(`/api/elections/${initialElection.id}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        return finishError(errorData.error || '투표 삭제 실패');
      }

      alert('투표가 삭제되었습니다.');
      onBack();
    } catch (err: any) {
      console.error('투표 삭제 중 에러:', err);
      setError(err.message || '투표 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!title.trim()) return finishError('투표 제목을 입력해주세요.');
      if (!description.trim()) return finishError('투표 설명을 입력해주세요.');

      const validCandidates = candidates.filter((c) => c.trim());
      if (validCandidates.length < 2)
        return finishError('최소 2명의 후보자를 입력해주세요.');

      if (!startDate || !endDate)
        return finishError('시작/종료 날짜를 입력해주세요.');

      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const now = Date.now();

      if (end <= start)
        return finishError('종료 시간은 시작 시간보다 늦어야 합니다.');

      if (!adminPassword.trim())
        return finishError('관리자 비밀번호를 입력해주세요.');

      /* ✅ 비밀번호 복잡성 검사: 최소 8자 + 소문자 + 숫자 + 특수문자 */
      const password = adminPassword.trim();
      if (password.length < 8) {
        return finishError('관리자 비밀번호는 최소 8자리 이상이어야 합니다.');
      }
      if (!/[a-z]/.test(password)) {
        return finishError(
          '관리자 비밀번호에는 영문 소문자가 최소 1자 이상 포함되어야 합니다.'
        );
      }
      if (!/[0-9]/.test(password)) {
        return finishError(
          '관리자 비밀번호에는 숫자가 최소 1자 이상 포함되어야 합니다.'
        );
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        return finishError(
          '관리자 비밀번호에는 특수문자가 최소 1자 이상 포함되어야 합니다.'
        );
      }

      const electionId = isEditMode
        ? toNumericId(initialElection!.id)
        : Date.now();

      /* ✅ Supabase API 저장 */
      if (isEditMode) {
        // 수정 모드: 먼저 비밀번호 확인
        try {
          const verifyResponse = await fetch(
            `/api/elections/${initialElection!.id}/verify-password`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: adminPassword }),
            }
          );

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            return finishError(errorData.error || '비밀번호 확인 실패');
          }

          const verifyResult = await verifyResponse.json();
          if (!verifyResult.valid) {
            return finishError('관리자 비밀번호가 일치하지 않습니다.');
          }
        } catch (verifyErr) {
          console.error('비밀번호 확인 에러:', verifyErr);
          return finishError('비밀번호 확인 중 오류가 발생했습니다.');
        }

        // 비밀번호가 확인되면 PUT 요청
        // 로컬 시간을 ISO 8601 UTC 형식으로 변환
        const startISO = new Date(startDate).toISOString();
        const endISO = new Date(endDate).toISOString();

        const apiPayload = {
          title,
          description,
          start_time: startISO,
          end_time: endISO,
          admin_password: adminPassword,
          is_anonymous: isAnonymous,
          is_secret: isSecret, // ✅ 추가
          enable_nft_receipt: enableNFTReceipt, // ✅ 추가
          candidates: validCandidates.map((name) => ({ name })),
          access_code: accessCode, // ✅ access_code 추가
          current_password: adminPassword, // 확인된 비밀번호를 다시 전송
        };

        try {
          const response = await fetch(
            `/api/elections/${initialElection!.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiPayload),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error('API 응답 에러:', errorData);
            return finishError(errorData.error || 'Supabase 수정 실패');
          }

          const result = await response.json();
          console.log('[수정] API 응답:', result);
        } catch (apiErr) {
          console.error('API 호출 중 에러:', apiErr);
          return finishError(
            '네트워크 오류가 발생했습니다. 다시 시도해주세요.'
          );
        }
      } else {
        // 신규 생성: POST 요청
        // 로컬 시간을 ISO 8601 UTC 형식으로 변환
        const startISO = new Date(startDate).toISOString();
        const endISO = new Date(endDate).toISOString();

        const apiPayload = {
          title,
          description,
          start_time: startISO,
          end_time: endISO,
          voting_method: 'single',
          admin_password: adminPassword,
          is_anonymous: isAnonymous,
          is_secret: isSecret, // ✅ 추가
          enable_nft_receipt: enableNFTReceipt, // ✅ 추가
          candidates: validCandidates.map((name) => ({ name })),
          access_code: accessCode, // ✅ access_code 추가
        };

        try {
          const response = await fetch('/api/elections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('API 응답 에러:', errorData);
            return finishError(errorData.error || 'Supabase 저장 실패');
          }

          // 🔥 서버에서 생성된 contract_election_id 받아오기
          const result = await response.json();
          const serverSuccess = result.blockchainResult?.success;

          if (result.data && result.data.contract_election_id) {
            // 서버가 contract_election_id를 생성해서 줬다면 그것을 사용
            console.log(
              '✅ 서버로부터 contract_election_id 수신:',
              result.data.contract_election_id
            );
            
            if (serverSuccess) {
                 console.log('✅ 서버가 블록체인 등록 성공:', result.blockchainResult.txHash);
            } else {
                 console.warn('⚠️ 서버 블록체인 등록 실패:', result.blockchainResult?.error);
            }

            // newElection 객체 구성을 위해 변수에 저장
            (window as any)._tempServerContractId =
              result.data.contract_election_id;
            (window as any)._tempServerSuccess = serverSuccess;
          }
        } catch (apiErr) {
          console.error('API 호출 중 에러:', apiErr);
          return finishError(
            '네트워크 오류가 발생했습니다. 다시 시도해주세요.'
          );
        }
      }

      const finalCandidates: Candidate[] = validCandidates.map((name, idx) => {
        const existing = initialElection?.candidates[idx];
        return {
          id: existing?.id ?? `candidate-${electionId}-${idx}`,
          name,
          description: existing?.description ?? '',
          imageUrl: existing?.imageUrl,
          voteCount: existing?.voteCount ?? 0,
        };
      });

      const serverContractId = (window as any)._tempServerContractId;
      const serverSuccess = (window as any)._tempServerSuccess;
      
      // 임시 변수 청소
      delete (window as any)._tempServerContractId;
      delete (window as any)._tempServerSuccess;

      const newElection: Election = {
        id: electionId, // 로컬용 ID (Timestamp) 혹은 수정 시 기존 ID
        title,
        description,
        candidates: finalCandidates,
        startDate,
        endDate,
        status: now < start ? 'upcoming' : now > end ? 'ended' : 'active',
        createdBy: initialElection?.createdBy ?? voter.id,
        createdAt: initialElection?.createdAt ?? new Date().toISOString(),
        totalVotes: initialElection?.totalVotes ?? 0,
        isAnonymous,
        isSecret,
        requiresVerification: initialElection?.requiresVerification ?? false,
        enableNFTReceipt,
        adminPassword,
        accessCode: accessCode || undefined,
        contract_election_id: serverContractId, // 🔥 서버 ID 연동
      };

      /* ✅ 로컬 저장 */
      const stored = localStorage.getItem('elections');
      const arr: Election[] = stored ? JSON.parse(stored) : [];

      const updatedElections = isEditMode
        ? arr.map((e) => (e.id === electionId ? newElection : e))
        : [...arr, newElection];

      localStorage.setItem('elections', JSON.stringify(updatedElections));
      window.dispatchEvent(new Event('electionsUpdated'));

      /* ✅ 블록체인 기록 (신규 생성 시) */
      if (!isEditMode) {
        try {
          const blockchain = getBlockchain();
          await blockchain.mineBlock({
            id: Date.now(),
            type: 'ELECTION_CREATE',
            electionId,
            voterId: voter.id,
            timestamp: Date.now(),
            signature: `sig-${Date.now()}`,
          });
          saveBlockchain();
        } catch (blockchainErr) {
          console.warn('블록체인 저장 실패:', blockchainErr);
        }

        /* ✅ 스마트컨트랙트 */
        let clientSuccess = false;
        try {
          // 서버 ID가 있으면 그것을, 없으면 로컬 ID 사용
          const targetId = serverContractId ?? electionId;
          
          if (!serverSuccess) {
              console.log('🔗 서버 등록 실패로 클라이언트에서 컨트랙트 생성 시도 ID:', targetId);
              const txResult = await createElectionOnContract(targetId, validCandidates);
              if (txResult.success) {
                  clientSuccess = true;
                  console.log('✅ 클라이언트 블록체인 등록 성공');
              } else {
                  console.warn('⚠️ 클라이언트 블록체인 등록 실패:', txResult.error);
              }
          } else {
              console.log('✅ 이미 서버에서 등록 완료됨 (클라이언트 스킵)');
              clientSuccess = true; // 서버 성공을 클라이언트 성공으로 간주 (투표 가능)
          }
        } catch (contractErr) {
          console.warn('스마트 컨트랙트 생성 실패:', contractErr);
        }
        
        if (!serverSuccess && !clientSuccess) {
            alert('⚠️ [주의] 블록체인에 선거가 등록되지 않았습니다!\n\n서버와 클라이언트 모두 트랜잭션 처리에 실패했습니다.\n이 상태로는 투표 시 "Election not found" 에러가 발생합니다.\n\n관리자 지갑 설정(.env)을 확인하거나, MetaMask가 컨트랙트 소유자인지 확인해주세요.');
        } else if (isEditMode) {
           alert('투표가 수정되었습니다.');
        } else {
           alert('투표가 생성되었습니다.');
        } 
        onBack();
        setLoading(false);
        return; // 종료
      }

      alert(isEditMode ? '투표가 수정되었습니다.' : '투표가 생성되었습니다.');
      onBack();
      setLoading(false);
    } catch (err: any) {
      console.error('예상치 못한 에러:', err);
      finishError(err.message || '알 수 없는 오류가 발생했습니다.');
    }
  };

  /* ✅ JSX */
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        {isEditMode ? '투표 수정' : '투표 생성'}
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 탭 네비게이션 */}
        <div className="flex gap-4 border-b">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-bold border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            기본 정보
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 font-bold border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            고급 설정
          </button>
        </div>

        {/* 기본 정보 탭 */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                투표 제목 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2024 학급 회장 선거"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                투표 설명 *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="투표에 대한 상세한 설명을 입력하세요"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 후보자 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                후보자 이름 * (최소 2명)
              </label>
              <div className="space-y-2">
                {candidates.map((candidate, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={candidate}
                      onChange={(e) =>
                        handleCandidateChange(idx, e.target.value)
                      }
                      placeholder={`후보자 ${idx + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {candidates.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(idx)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        제거
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddCandidate}
                className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                + 후보자 추가
              </button>
            </div>

            {/* 날짜 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작 일시 *
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 일시 *
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 관리자 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관리자 비밀번호 *
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="투표 수정/삭제 시 필요합니다 (소문자+숫자+특수문자 포함)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* 고급 설정 탭 */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            {/* 익명 투표 */}
            <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <p className="font-medium text-gray-700">익명 투표</p>
                <p className="text-sm text-gray-500">
                  투표자 정보를 공개하지 않습니다
                </p>
              </div>
            </label>

            {/* 비밀 투표 */}
            <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <p className="font-medium text-gray-700">비밀 투표</p>
                <p className="text-sm text-gray-500">
                  누가 누구에게 투표했는지 공개하지 않습니다
                </p>
              </div>
            </label>

            {/* NFT 영수증 */}
            <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={enableNFTReceipt}
                onChange={(e) => setEnableNFTReceipt(e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <p className="font-medium text-gray-700">NFT 투표 영수증</p>
                <p className="text-sm text-gray-500">
                  투표 완료 시 NFT 영수증을 발급합니다
                </p>
              </div>
            </label>

            {/* 입장 코드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                입장 코드 (선택)
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="투표 참여 시 입력해야 할 코드"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* 버튼들 */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '처리중...' : '투표 삭제'}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리중...' : isEditMode ? '투표 수정' : '투표 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
