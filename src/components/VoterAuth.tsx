'use client';

import { useState, useEffect } from 'react';
import { Shield, Key, UserCheck, Fingerprint, Wallet } from 'lucide-react';
import { Voter } from '@/types';
import { generateKeyPair } from '@/utils/crypto';
import { isMetaMaskInstalled, connectMetaMask } from '@/utils/metamask';

interface VoterAuthProps {
  onLogin: (voter: Voter) => void;
}

type AuthMode = 'choose' | 'did';

// ✅ 허용 이메일 도메인 리스트 (여기에 계속 추가하면 됨)
const ALLOWED_EMAIL_DOMAINS = [
  'jmail.ac.kr',
  // 'another.ac.kr',
  // 'something.edu',
];

function getEmailDomain(email: string): string | null {
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase().trim();
}

function isAllowedEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function VoterAuth({ onLogin }: VoterAuthProps) {
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('choose');
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 이메일 인증 관련 상태
  const [email, setEmail] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'code' | 'done'>('input');
  const [emailCode, setEmailCode] = useState('');
  const [emailInfo, setEmailInfo] = useState<string | null>(null);

  useEffect(() => {
    setHasMetaMask(isMetaMaskInstalled());
    setMounted(true);
  }, []);

  // ─────────────────────────────────────────────
  // 1) MetaMask 로그인 (이미 DID가 있는 경우)
  // ─────────────────────────────────────────────
  /* ─────────────────────────────────────────────
     1) MetaMask 임시 로그인 (DID 검증 우회 / 자동 생성)
     ───────────────────────────────────────────── */
  const handleConnectMetaMask = async () => {
    setError(null);
    setLoading(true);
    try {
      const account = await connectMetaMask();
      const address = account.address;

      // 1. 백엔드에 DID가 있는지 확인 시도 (로그용, 실제로는 무시하고 진행)
      let did = `did:metamask:${address}`;
      try {
        const res = await fetch('/api/auth/login-metamask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        if (res.ok) {
          const data = await res.json();
          did = data.did;
        }
      } catch (ignored) {
        // 백엔드 연결 실패해도 무시하고 임시 DID 사용
        console.warn('백엔드 DID 확인 실패, 임시 DID 사용:', did);
      }

      console.log('✅ 임시 로그인 진행: ', did);

      // 2. 키페어 생성 (로컬 암호화용)
      const keyPair = await generateKeyPair();

      // 3. Voter 객체 생성
      const voter: Voter = {
        id: `voter-${Date.now()}`, // 임시 ID
        did: did,
        publicKey: keyPair.publicKey,
        registeredAt: new Date().toISOString(),
        votedElections: [], // 새 세션이라 투표 기록은 로컬에 없지만, 블록체인에서 체크할 것임
        verified: true, // 임시로 verified 처리
        nftTokens: [],
      };

      // 4. 저장 및 로그인 처리
      localStorage.setItem('currentVoter', JSON.stringify(voter));
      localStorage.setItem(`privateKey_${voter.id}`, keyPair.privateKey);

      // voters 목록에도 저장 (로컬 통계용)
      const voters: Voter[] = JSON.parse(
        localStorage.getItem('voters') || '[]'
      );
      // 기존에 같은 DID가 있다면 업데이트, 없다면 추가
      const existingIdx = voters.findIndex((v) => v.did === did);
      if (existingIdx >= 0) {
        voters[existingIdx] = voter;
      } else {
        voters.push(voter);
      }
      localStorage.setItem('voters', JSON.stringify(voters));

      onLogin(voter);
    } catch (e: any) {
      console.error('MetaMask connection/login failed:', e);
      setError(e.message || 'MetaMask 연동에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 2) 이메일로 인증 코드 보내기
  // ─────────────────────────────────────────────
  const handleSendEmailCode = async () => {
    if (!email.trim()) {
      setEmailInfo('이메일을 입력해주세요.');
      return;
    }

    if (!isAllowedEmail(email)) {
      const domain = getEmailDomain(email);
      setEmailInfo(
        domain
          ? `허용되지 않은 이메일 도메인입니다. (현재 허용: ${ALLOWED_EMAIL_DOMAINS.join(
              ', ',
            )})`
          : '올바른 이메일 형식을 입력해주세요.',
      );
      return;
    }

    setLoading(true);
    setEmailInfo(null);
    setError(null);

    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || '인증 코드 발송에 실패했습니다.');
      }

      setEmailInfo('인증 코드가 발송되었습니다. 이메일을 확인하세요.');
      setEmailStep('code');
    } catch (e: any) {
      console.error('send-email-code error', e);
      setError(e.message || '인증 코드 발송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 3) 이메일 + 코드 검증
  // ─────────────────────────────────────────────
  const handleVerifyEmailCode = async () => {
    if (!emailCode.trim()) {
      setEmailInfo('인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setEmailInfo(null);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: emailCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || '인증에 실패했습니다.');
      }

      setEmailInfo('이메일 인증이 완료되었습니다.');
      setEmailStep('done');
    } catch (e: any) {
      console.error('verify-email-code error', e);
      setError(e.message || '이메일 인증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 4) DID 발급 + MetaMask 주소 매핑 (새 DID 생성 플로우)
  // ─────────────────────────────────────────────
  const handleCreateNewVoter = async () => {
    if (emailStep !== 'done') {
      setEmailInfo('먼저 이메일 인증을 완료해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 4-1) 서버에서 DID 발급 (또는 기존 DID 반환)
      const didRes = await fetch('/api/did/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const didData = await didRes.json();
      if (!didRes.ok) {
        throw new Error(didData?.error || 'DID 발급에 실패했습니다.');
      }

      const did = didData.did as string;

      // 4-2) MetaMask 연결 (계정 주소 가져오기)
      const account = await connectMetaMask();

      // 4-3) DID와 MetaMask 주소 매핑 요청
      const linkRes = await fetch('/api/auth/link-metamask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, address: account.address }),
      });

      const linkData = await linkRes.json();
      if (!linkRes.ok) {
        throw new Error(linkData?.error || 'MetaMask 주소 매핑에 실패했습니다.');
      }

      // 4-4) 클라이언트 키페어 생성 + Voter 객체 생성
      const keyPair = await generateKeyPair();

      const newVoter: Voter = {
        id: `voter-${Date.now()}`,
        did,
        publicKey: keyPair.publicKey,
        registeredAt: new Date().toISOString(),
        votedElections: [],
        verified: true,
        nftTokens: [],
      };

      localStorage.setItem('currentVoter', JSON.stringify(newVoter));
      localStorage.setItem(`privateKey_${newVoter.id}`, keyPair.privateKey);

      // (선택) 로컬에도 저장
      const voters: Voter[] = JSON.parse(localStorage.getItem('voters') || '[]');
      voters.push(newVoter);
      localStorage.setItem('voters', JSON.stringify(voters));

      onLogin(newVoter);
    } catch (e: any) {
      console.error('Failed to create voter:', e);
      setError(e.message || '유권자 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 5) UI
  // ─────────────────────────────────────────────
  return (
    <div className="max-w-4xl w-full">
      <div className="flex gap-10 items-stretch">
        {/* 왼쪽 설명 영역 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-gray-900 mb-2 text-3xl font-bold">
            블록체인 전자투표
          </h1>
          <p className="text-gray-600 mb-6">
            DID 및 MetaMask 기반 안전한 투표 시스템
          </p>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-indigo-500" />
              <span>블록체인 상에 모든 투표가 암호화되어 기록됩니다.</span>
            </div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>학교 이메일 + DID + MetaMask로 중복 투표를 방지합니다.</span>
            </div>
          </div>
        </div>

        {/* 오른쪽 카드 영역 */}
        <div className="w-[420px]">
          <div className="bg-white rounded-2xl shadow-xl p-6 h-full flex flex-col">
            {!mounted ? (
              <div className="text-center py-8">
                <p className="text-gray-600">로딩 중...</p>
              </div>
            ) : authMode === 'choose' ? (
              <>
                <div className="mb-5">
                  <h2 className="text-gray-900 text-lg font-semibold mb-1">
                    유권자 인증 방식 선택
                  </h2>
                  <p className="text-gray-600 text-sm">
                    선호하는 인증 방식을 선택하세요
                  </p>
                </div>

                <div className="space-y-3 mb-4">
                  {hasMetaMask && (
                    <button
                      onClick={handleConnectMetaMask}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:shadow-md transition-all text-left group disabled:opacity-50"
                    >
                      <div className="w-11 h-11 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">
                          MetaMask 로그인
                        </h3>
                        <p className="text-xs text-white/80">
                          이미 DID가 있다면 지갑 주소로 바로 로그인
                        </p>
                      </div>
                    </button>
                  )}

                  {!hasMetaMask && (
                    <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl mb-1">
                      <div className="flex items-start gap-3">
                        <Wallet className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <h3 className="text-gray-700 mb-1">
                            MetaMask 미설치
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            MetaMask를 설치하면 지갑으로 쉽게 인증할 수 있습니다.
                          </p>
                          <a
                            href="https://metamask.io/download/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            MetaMask 설치하기 →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setAuthMode('did')}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-all text-left disabled:opacity-50"
                  >
                    <div className="w-11 h-11 bg-indigo-500 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-medium mb-1">
                        새 DID 생성
                      </h3>
                      <p className="text-xs text-gray-600">
                        학교 이메일 인증 후 DID 발급 & MetaMask 매핑
                      </p>
                    </div>
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </>
            ) : (
              // authMode === 'did'
              <>
                <div className="mb-4 text-center">
                  <h2 className="text-gray-900 text-lg font-semibold">
                    새 DID 생성
                  </h2>
                  <p className="text-gray-600 text-sm">
                    학교 이메일 인증 후 DID를 발급받고 MetaMask와 연결합니다.
                  </p>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      이메일 주소
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@jmail.ac.kr"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={loading || emailStep !== 'input'}
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      허용 도메인:&nbsp;
                      {ALLOWED_EMAIL_DOMAINS.join(', ')}
                    </p>
                  </div>

                  {emailStep === 'input' && (
                    <button
                      onClick={handleSendEmailCode}
                      disabled={loading}
                      className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? '발송 중...' : '인증 코드 보내기'}
                    </button>
                  )}

                  {emailStep !== 'input' && (
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        이메일로 받은 인증 코드
                      </label>
                      <input
                        type="text"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        placeholder="6자리 숫자"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={loading || emailStep === 'done'}
                      />
                    </div>
                  )}

                  {emailStep === 'code' && (
                    <button
                      onClick={handleVerifyEmailCode}
                      disabled={loading}
                      className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? '확인 중...' : '인증 코드 확인'}
                    </button>
                  )}

                  {emailStep === 'done' && (
                    <div className="p-2 text-xs rounded bg-green-50 text-green-700 border border-green-200">
                      이메일 인증이 완료되었습니다. MetaMask와 연결하여 DID를 발급합니다.
                    </div>
                  )}

                  {emailInfo && (
                    <p className="text-xs text-gray-600">{emailInfo}</p>
                  )}

                  {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateNewVoter}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 mb-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>DID 발급 & MetaMask 연결</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setAuthMode('choose');
                    setEmailStep('input');
                    setEmail('');
                    setEmailCode('');
                    setEmailInfo(null);
                    setError(null);
                  }}
                  className="w-full px-6 py-2.5 bg-white text-gray-700 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                >
                  돌아가기
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
