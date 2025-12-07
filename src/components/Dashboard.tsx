'use client';

import Image from 'next/image';
import { Voter } from '@/types';
import { motion, type Variants } from 'framer-motion';

interface DashboardProps {
  voter: Voter;
  onCreateElection: () => void;
  onViewElections: () => void;
}

// framer-motion Variants 타입 사용
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export function Dashboard({
  voter,
  onCreateElection,
  onViewElections,
}: DashboardProps) {
  return (
    <div className="space-y-12">
      {/* ================================================= */}
      {/* 상단 배너 & 버튼 (고정) */}
      {/* ================================================= */}

      {/* 상단 환영 배너 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-2xl font-bold mb-2">환영합니다!</h2>
        <p className="text-blue-100 mb-4">
          블록체인 기반 전자투표 시스템에 접속하셨습니다. 아자스!
        </p>
      </div>

      {/* 투표 참여 / 생성 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onViewElections}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group text-left"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <span className="text-2xl">🗳️</span>
          </div>
          <div>
            <h3 className="text-gray-900 mb-1">투표 참여하기</h3>
            <p className="text-gray-600 text-sm">진행 중인 선거에 참여하세요</p>
          </div>
        </button>

        <button
          onClick={onCreateElection}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all group text-left"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <span className="text-2xl">➕</span>
          </div>
          <div>
            <h3 className="text-gray-900 mb-1">투표 생성하기</h3>
            <p className="text-gray-600 text-sm">새로운 선거를 만드세요</p>
          </div>
        </button>
      </div>

      {/* ================================================= */}
      {/* 여기서부터 애니메이션 적용 (motion.div + Variants) */}
      {/* ================================================= */}

      {/* 섹션 1 (프로젝트 소개) */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-white rounded-2xl p-10"
      >
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 flex items-center justify-center order-1">
            <Image
              src="/1.png"
              alt="프로젝트 소개 이미지"
              width={600}
              height={400}
              className="w-full max-w-[250px] h-auto object-contain"
            />
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 order-2">
            <h3 className="text-3xl font-bold text-gray-900 flex justify-center items-center gap-3">
              <span>💡</span>
              <span>프로젝트 소개</span>
            </h3>

            <div className="text-lg text-gray-700 space-y-4 leading-relaxed max-w-lg">
              <p>
                선거 조작 및 부정선거 논란으로 “내 표가 올바르게
                반영되었는가?”에 대한 신뢰 문제가 전 세계적으로 제기되고
                있습니다.
              </p>
              <p>
                이 프로젝트는 블록체인 기반 전자투표 시스템을 구축하여, 누구나
                검증 가능한 투표 기록과 특정 기관에 과도하게 의존하지 않는 투표
                신뢰를 실현하는 것을 목표로 합니다.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 섹션 2 (목표) */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-white/70 rounded-2xl border border-gray-100 shadow-sm px-10 py-12"
      >
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 flex flex-col justify-center items-center space-y-6 order-2 lg:order-1">
            <h3 className="text-3xl font-bold text-gray-900 flex justify-center items-center gap-2">
              <span>🎯</span>
              <span>목표</span>
            </h3>

            <ul className="w-fit list-disc pl-5 text-lg text-gray-700 text-left space-y-3 leading-relaxed">
              <li>조작이 어려운 투표 시스템 구축</li>
              <li>투표 결과의 검증 가능성 제공</li>
              <li>사용자 친화적인 UI 및 접근성 제공</li>
              <li>사회적/기술적 신뢰 동시 확보</li>
            </ul>
          </div>

          <div className="flex-1 flex items-center justify-center order-1 lg:order-2">
            <Image
              src="/2.png"
              alt="목표 이미지"
              width={600}
              height={400}
              className="w-full max-w-[420px] h-auto object-contain drop-shadow-md"
            />
          </div>
        </div>
      </motion.div>

      {/* 섹션 3 (핵심 가치) */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-white rounded-2xl p-10"
      >
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 flex items-center justify-center order-1">
            <Image
              src="/3.png"
              alt="핵심 가치 이미지"
              width={600}
              height={400}
              className="w-full max-w-[400px] h-auto object-contain"
            />
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 order-2">
            <h3 className="text-3xl font-bold text-gray-900 flex justify-center items-center gap-3">
              <span>🔑 </span>
              <span>핵심 가치</span>
            </h3>

            <div className="text-lg text-gray-700 space-y-4 leading-relaxed max-w-lg">
              <ul className="w-fit list-disc pl-5 text-lg text-gray-700 text-left space-y-3 leading-relaxed">
                <li>
                  탈중앙화(Decentralization): 중앙 서버에 대한 신뢰 의존을
                  최소화하는 구조 설계
                </li>
                <li>
                  무결성(Integrity): 투표 기록을 블록체인에 저장하여 위·변조를
                  방지
                </li>
                <li>
                  익명성(Anonymity): 신원 인증과 투표 데이터를 분리하여
                  프라이버시를 보호
                </li>
                <li>
                  접근성(Accessibility): 웹 기반 플랫폼으로 누구나 쉽게 투표에
                  참여할 수 있는 환경 제공
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 섹션 4 (주요 기능) */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-white/70 rounded-2xl border border-gray-100 shadow-sm px-10 py-12"
      >
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
          {/* 기능 목록 (왼쪽) */}
          <div className="flex-2 bg-white rounded-2xl p-10 order-2 lg:order-1">
            <h3 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-8 pb-4 border-b border-gray-200">
              <span>🛠️</span>
              <span>주요 기능</span>
            </h3>

            <div className="space-y-8 text-gray-800">
              {/* 기능 1 */}
              <div>
                <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="text-blue-600">1.</span> 유권자 인증 및
                  로그인
                </h4>
                <ul className="list-disc list-inside pl-6 text-gray-600 space-y-1">
                  <li>DID 로그인 및 MetaMask 로그인 중 선택 가능</li>
                  <li>신원 인증은 투표 데이터와 분리되어 익명성 유지</li>
                </ul>
              </div>
              {/* 기능 2 */}
              <div>
                <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="text-blue-600">2.</span> 투표 생성 및 참여
                </h4>
                <ul className="list-disc list-inside pl-6 text-gray-600 space-y-1">
                  <li>관리자 UI를 통한 투표 생성 및 후보/기간 설정</li>
                  <li>
                    투표 참여 → 결과 집계 → 기록 검증까지 한 화면에서 제공
                  </li>
                </ul>
              </div>
              {/* 기능 3 */}
              <div>
                <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="text-blue-600">3.</span> 블록체인 기록 및
                  검증
                </h4>
                <ul className="list-disc list-inside pl-6 text-gray-600 space-y-1">
                  <li>
                    투표 생성·참여 이벤트를 스마트 컨트랙트를 통해 블록체인에
                    기록
                  </li>
                  <li>블록 익스플로러를 통해 결과를 외부에서 검증 가능</li>
                </ul>
              </div>
              {/* 기능 4 */}
              <div>
                <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="text-blue-600">4.</span> 보안 강화
                </h4>
                <ul className="list-disc list-inside pl-6 text-gray-600 space-y-1">
                  <li>
                    관리자 비밀번호 복잡도 정책(소문자+숫자+특수문자) 적용
                  </li>
                  <li>투표 수정/삭제 시 비밀번호 + DID/지갑 인증 요구</li>
                  <li>로그인 방식을 분리하여 익명성과 접근성을 동시에 확보</li>
                </ul>
              </div>
              {/* 기능 5 */}
              <div>
                <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="text-blue-600">5.</span> 모의 선거 및
                  시뮬레이션
                </h4>
                <ul className="list-disc list-inside pl-6 text-gray-600 space-y-1">
                  <li>
                    학습·연구용 데모 시나리오 및 기존 방식과의 비교 테스트 지원
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 이미지 (오른쪽) */}
          <div className="flex-1 flex items-center justify-center order-1 lg:order-2">
            <Image
              src="/4.png"
              alt="주요 기능 이미지"
              width={800}
              height={600}
              className="w-full max-w-[350px] h-auto object-contain drop-shadow-md"
            />
          </div>
        </div>
      </motion.div>

      {/* 섹션 5 (아키텍처) */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-white/70 rounded-2xl p-10 border border-gray-100 shadow-sm"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-60">
          {/* 왼쪽 : 아키텍처 개념 */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl md:text-3xl font-bold text-gray-900">
              <span className="text-3xl">🧩</span>
              <span>아키텍처 개념</span>
            </h3>

            <ul className="space-y-4 text-sm md:text-xl text-gray-700 leading-relaxed">
              <li>
                <span className="font-semibold">Frontend:</span> React / Next.js
                기반 웹 클라이언트 (TypeScript, Tailwind CSS 사용)
              </li>
              <li>
                <span className="font-semibold">Identity Layer:</span> DID 기반
                신원체계 및 MetaMask 지갑 인증, 투표 데이터와 분리된 인증 구조
              </li>
              <li>
                <span className="font-semibold">Smart Contract Layer:</span>{' '}
                Solidity 기반 투표/집계 로직, EVM 네트워크(Sepolia 등)와 연동
              </li>
              <li>
                <span className="font-semibold">Storage / Backend Layer:</span>{' '}
                Supabase 및 로컬 저장소를 활용한 투표 메타데이터 저장 및 조회
              </li>
              <li>
                <span className="font-semibold">설계 원칙:</span> 신원 정보와
                투표 행위를 분리하여 익명성과 검증 가능성을 동시에 확보
              </li>
            </ul>
          </div>

          {/* 오른쪽 : 기존 시스템과의 차별점 */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl md:text-3xl font-bold text-gray-900">
              <span>🆚 </span>
              <span>기존 시스템과의 차별점</span>
            </h3>

            <div className="space-y-3 text-sm md:text-xl text-gray-700 leading-relaxed">
              <p>기존 K-Voting, m-Voting 등은 전자투표 인프라를 제공하지만:</p>
              <ul className="list-disc pl-5 space-y-1 text-base md:text-lg text-gray-600">
                <li>중앙기관에 대한 높은 신뢰를 전제로 함</li>
                <li>내부 처리 과정이 일반 사용자에게 투명하게 공개되지 않음</li>
              </ul>

              <p className="font-semibold mt-4 text-gray-900">
                🚀 우리 팀의 방향
              </p>
              <ul className="list-disc pl-5 space-y-1 text-base md:text-lg text-gray-600">
                <li>블록체인 기록 기반으로 투표 결과를 검증 가능하게 제공</li>
                <li>DID 또는 MetaMask를 활용한 분산 신원 인증 구조 적용</li>
                <li>
                  투표 생성부터 검증까지의 전 과정을 UI로 시각화하여<br></br>{' '}
                  <span className="font-semibold text-blue-600">
                    보여지는 신뢰 + 설명 가능한 신뢰
                  </span>
                  를 동시에 추구
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
