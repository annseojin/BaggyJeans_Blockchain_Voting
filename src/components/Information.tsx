'use client';

import { motion, type Variants } from 'framer-motion';
import Image from 'next/image';
import React from 'react';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export function Information() {
  return (
    <div className="space-y-10 md:space-y-12">
      {/* 프로젝트 소개 섹션 */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-100"
      >
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <span>👥</span>
            <span>팀 소개</span>
          </h2>

          <p className="text-base md:text-lg text-gray-700 leading-relaxed">
            강의명: 웹어플리케이션보안(캡스톤디자인) 01분반
            <br />
            담당 교수: 이병천 교수님
            <br />
            팀명: 배기진스(BaggyJeans) <br />
            팀원: 안서진, 백이랑, 이지원, 이태연, 백이랑
            <br />
            깃허브 :
            <a
              href="https://github.com/BaggyJeans3/blockchain-voting"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:text-blue-800 ml-1"
            >
              {/* 네모난 GitHub 아이콘 */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="4"
                  fill="currentColor"
                />
                <path
                  d="M12 3C7.03 3 3 7.03 3 12c0 3.99 2.58 7.36 6.16 8.56.45.08.62-.19.62-.43v-1.51c-2.51.54-3.04-1.08-3.04-1.08-.41-1.05-1-1.33-1-1.33-.81-.55.06-.54.06-.54.9.06 1.38.93 1.38.93.79 1.36 2.07.97 2.58.74.08-.57.31-.97.56-1.19-2-.23-4.12-1-4.12-4.46 0-.99.36-1.8.94-2.43-.1-.23-.4-1.16.09-2.42 0 0 .76-.24 2.48.93A8.6 8.6 0 0112 8.3c.77.01 1.54.1 2.26.3 1.71-1.18 2.48-.93 2.48-.93.49 1.26.18 2.19.09 2.42.58.63.94 1.44.94 2.43 0 3.47-2.12 4.23-4.14 4.45.32.28.63.85.63 1.72v2.55c0 .24.17.52.63.43C18.42 19.37 21 16 21 12c0-4.97-4.03-9-9-9z"
                  fill="#fff"
                />
              </svg>
            </a>
          </p>
        </div>
      </motion.div>

      {/* 팀원 소개 섹션 */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-white/80 rounded-2xl p-8 md:p-10 shadow-sm border border-gray-100"
      >
        <div className="flex flex-col gap-6">
          <div className="text-center space-y-3">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <span>🧩</span>
              <span>팀 구성</span>
            </h3>
            <p className="text-sm md:text-base text-gray-600">
              We are TEAM BaggyJeans(팀 배기진스)
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 팀장 안서진 */}
            <div className="h-full bg-white rounded-2xl border border-blue-100 p-6 shadow-sm flex flex-col items-center text-center gap-4">
              <Image
                src="/member1.png"
                alt="안서진"
                width={120}
                height={120}
                className="rounded-full object-cover shadow-md"
              />
              <p className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-xs font-medium text-blue-600">
                팀장 / PM & 스마트 컨트랙트
              </p>
              <h4 className="text-lg font-bold text-gray-900">
                안서진(92212893)
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 leading-relaxed list-disc list-inside text-left">
                <li>프로젝트 총괄 및 일정 관리</li>
                <li>Solidity 기반 핵심 로직 구현</li>
                <li>블록체인 기능 기획 및 통합</li>
              </ul>
            </div>

            {/* 팀원 백이랑 */}
            <div className="h-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center gap-4">
              <Image
                src="/member2.jpg"
                alt="백이랑"
                width={120}
                height={120}
                className="rounded-full object-cover shadow-md"
              />
              <p className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-xs font-medium text-indigo-600">
                팀원 / 프론트엔드
              </p>
              <h4 className="text-lg font-bold text-gray-900">
                백이랑(92113633)
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 leading-relaxed list-disc list-inside text-left">
                <li>메인 화면 및 대시보드 UI 구현</li>
                <li>디자인 시안 기반 컴포넌트 개발</li>
              </ul>
            </div>

            {/* 팀원 이지원 */}
            <div className="h-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center gap-4">
              <Image
                src="/member3.jpg"
                alt="이지원"
                width={120}
                height={120}
                className="rounded-full object-cover shadow-md"
              />
              <p className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-xs font-medium text-purple-600">
                팀원 / 백엔드
              </p>
              <h4 className="text-lg font-bold text-gray-900">
                이지원(92213017)
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 leading-relaxed list-disc list-inside text-left">
                <li>이메일 인증 기반 DID 로그인 구현</li>
              </ul>
            </div>

            {/* 팀원 이태연 */}
            <div className="h-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center gap-4">
              <Image
                src="/member4.jpg"
                alt="이태연"
                width={120}
                height={120}
                className="rounded-full object-cover shadow-md"
              />
              <p className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-600">
                팀원 / 백엔드
              </p>
              <h4 className="text-lg font-bold text-gray-900">
                이태연(92015374)
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 leading-relaxed list-disc list-inside text-left">
                <li>Supabase 등 백엔드 연동 설계 및 관리</li>
                <li>로그/모니터링 및 안정성 개선</li>
              </ul>
            </div>

            {/* 팀원 장재원 */}
            <div className="h-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center gap-4">
              <Image
                src="/member5.jpg"
                alt="장재원"
                width={120}
                height={120}
                className="rounded-full object-cover shadow-md"
              />
              <p className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-xs font-medium text-amber-600">
                팀원 / 프론트엔드
              </p>
              <h4 className="text-lg font-bold text-gray-900">
                장재원(92015415)
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 leading-relaxed list-disc list-inside text-left">
                <li>메인 화면 및 대시보드 UI 구현</li>
                <li>디자인 시안 기반 컴포넌트 개발</li>
              </ul>
            </div>
            {/* 로고 공간 */}
            <div className="h-full flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Team Logo"
                width={260}
                height={260}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
