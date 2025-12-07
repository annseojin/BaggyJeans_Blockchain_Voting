'use client'

import React, { useState, useEffect } from 'react'
import type { ReactElement, JSX } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface VoteRecord {
  electionId: string;
  candidateIndex: number;
  voter: string;
  timestamp: number;
}

interface ElectionInfo {
  electionId: string;
  exists: boolean;
  votingOpen: boolean;
  createdAt: number;
  candidateCount: number;
  totalVotes: number;
}

export function BlockchainExplorer() {
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([])
  const [elections, setElections] = useState<ElectionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  useEffect(() => {
    loadContractData()
  }, [])

  const loadContractData = async () => {
    try {
      setLoading(true)
      
      // Supabase에서 선거 정보 조회
      const { data: electionsData, error: electionsError } = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (electionsError) {
        console.error('선거 조회 오류:', electionsError)
      }

      // 각 선거의 후보자 수와 투표 수 조회
      const electionInfos: ElectionInfo[] = []
      
      if (electionsData) {
        for (const election of electionsData) {
          // 후보자 수 조회
          const { count: candidateCount } = await supabase
            .from('candidates')
            .select('*', { count: 'exact', head: true })
            .eq('election_id', election.id)
          
          // 투표 수 조회
          const { count: voteCount } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('election_id', election.id)
          
          // 현재 시간과 비교하여 투표 진행 여부 확인
          const now = new Date()
          const startTime = new Date(election.start_time)
          const endTime = new Date(election.end_time)
          const votingOpen = now >= startTime && now <= endTime
          
          electionInfos.push({
            electionId: election.id,
            exists: true,
            votingOpen,
            createdAt: Math.floor(new Date(election.created_at).getTime() / 1000),
            candidateCount: candidateCount || 0,
            totalVotes: voteCount || 0
          })
        }
      }
      
      setElections(electionInfos)
      
      // Supabase에서 투표 기록 조회
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('election_id, candidate_id, voter_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (votesError) {
        console.error('투표 기록 조회 오류:', votesError)
      }
      
      const records: VoteRecord[] = []
      if (votesData) {
        for (const vote of votesData) {
          // candidate_id를 숫자 인덱스로 변환 (후보자 order 조회)
          const { data: candidate } = await supabase
            .from('candidates')
            .select('order')
            .eq('id', vote.candidate_id)
            .single()
          
          records.push({
            electionId: vote.election_id,
            candidateIndex: candidate?.order ?? 0,
            voter: vote.voter_id || '익명',
            timestamp: Math.floor(new Date(vote.created_at).getTime() / 1000)
          })
        }
      }
      
      setVoteHistory(records)
      
    } catch (err) {
      console.error('데이터 로딩 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // 필터링된 선거 목록
  const filteredElections = elections.filter(election => {
    const matchesSearch = election.electionId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && election.votingOpen) ||
      (filterStatus === 'ended' && !election.votingOpen)
    return matchesSearch && matchesFilter
  })

  // 페이지네이션
  const totalPages = Math.ceil(filteredElections.length / itemsPerPage)
  const paginatedElections = filteredElections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">블록체인 탐색기</h1>
        <button
          onClick={loadContractData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          <span>{loading ? '⏳' : '🔄'}</span>
          <span>{loading ? '로딩 중...' : '새로고침'}</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">선거 데이터</h2>
            {!loading && elections.length > 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="선거 ID 검색..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-1 border rounded-lg text-sm"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as any)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-1 border rounded-lg text-sm"
                >
                  <option value="all">전체</option>
                  <option value="active">진행중</option>
                  <option value="ended">종료됨</option>
                </select>
              </div>
            )}
          </div>

          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-600">데이터 로딩 중...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* 통계 */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-600 text-sm mb-1">등록된 선거</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {elections.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">전체 선거</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-gray-600 text-sm mb-1">총 투표 수</p>
                  <p className="text-3xl font-bold text-green-600">
                    {voteHistory.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {elections.length > 0 ? `평균 ${(voteHistory.length / elections.length).toFixed(1)}표/선거` : '-'}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-gray-600 text-sm mb-1">진행 중인 선거</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {elections.filter(e => e.votingOpen).length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {elections.length > 0 ? `${((elections.filter(e => e.votingOpen).length / elections.length) * 100).toFixed(0)}% 활성` : '-'}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-gray-600 text-sm mb-1">종료된 선거</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {elections.filter(e => !e.votingOpen).length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {elections.filter(e => !e.votingOpen).length > 0 ? '아카이브' : '없음'}
                  </p>
                </div>
              </div>

              {/* 선거 목록 */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">📊 등록된 선거</h3>
                  {filteredElections.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {filteredElections.length}개의 선거 {elections.length !== filteredElections.length && `(전체 ${elections.length}개 중)`}
                    </span>
                  )}
                </div>
                {paginatedElections.length > 0 ? (
                  <>
                    {paginatedElections.map((election) => (
                      <div
                        key={election.electionId}
                        className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(election.electionId, `election-${election.electionId}`)}
                              className="font-bold hover:text-blue-600 flex items-center gap-1"
                              title="ID 복사"
                            >
                              선거 ID: {election.electionId}
                              {copiedText === `election-${election.electionId}` ? (
                                <span className="text-green-600 text-xs">✓</span>
                              ) : (
                                <span className="text-gray-400 text-xs">📋</span>
                              )}
                            </button>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              election.votingOpen 
                                ? 'bg-green-100 text-green-700 border border-green-300' 
                                : 'bg-gray-200 text-gray-700 border border-gray-300'
                            }`}>
                              {election.votingOpen ? '🟢 진행중' : '⚫ 종료됨'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {new Date(election.createdAt * 1000).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div className="bg-white p-2 rounded border">
                            <span className="text-gray-600 text-xs block">후보자</span>
                            <span className="font-bold text-lg">{election.candidateCount}</span>
                            <span className="text-xs text-gray-500">명</span>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <span className="text-gray-600 text-xs block">총 투표</span>
                            <span className="font-bold text-lg text-blue-600">{election.totalVotes}</span>
                            <span className="text-xs text-gray-500">표</span>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <span className="text-gray-600 text-xs block">평균 투표율</span>
                            <span className="font-bold text-lg text-purple-600">
                              {election.candidateCount > 0 ? (election.totalVotes / election.candidateCount).toFixed(1) : '0'}
                            </span>
                            <span className="text-xs text-gray-500">표/명</span>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <span className="text-gray-600 text-xs block">생성일</span>
                            <span className="font-bold text-sm">
                              {new Date(election.createdAt * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← 이전
                        </button>
                        <span className="text-sm text-gray-600">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          다음 →
                        </button>
                      </div>
                    )}
                  </>
                ) : elections.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    등록된 선거가 없습니다.
                  </p>
                ) : (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    검색 결과가 없습니다.
                  </p>
                )}
              </div>

              {/* 투표 기록 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">🔗 투표 기록</h3>
                  {voteHistory.length > 0 && (
                    <span className="text-sm text-gray-600">
                      최근 {Math.min(10, voteHistory.length)}건 표시
                    </span>
                  )}
                </div>
                {voteHistory.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {voteHistory.slice().reverse().slice(0, 10).map((record, idx) => {
                      const relatedElection = elections.find(e => e.electionId === record.electionId)
                      return (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-blue-700">투표 #{voteHistory.length - idx}</span>
                            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                              {new Date(record.timestamp * 1000).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-600 text-xs block mb-1">선거 ID</span>
                              <button
                                onClick={() => copyToClipboard(record.electionId, `vote-election-${idx}`)}
                                className="font-mono text-xs hover:text-blue-600 flex items-center gap-1"
                                title="복사"
                              >
                                {record.electionId}
                                {copiedText === `vote-election-${idx}` ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-gray-400">📋</span>
                                )}
                              </button>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-600 text-xs block mb-1">후보 번호</span>
                              <span className="font-bold text-lg text-purple-600">#{record.candidateIndex}</span>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <span className="text-gray-600 text-xs block mb-1">투표자 주소</span>
                            <button
                              onClick={() => copyToClipboard(record.voter, `voter-${idx}`)}
                              className="font-mono text-xs hover:text-blue-600 break-all flex items-center gap-1"
                              title="주소 복사"
                            >
                              {record.voter}
                              {copiedText === `voter-${idx}` ? (
                                <span className="text-green-600 ml-2">✓</span>
                              ) : (
                                <span className="text-gray-400 ml-2">📋</span>
                              )}
                            </button>
                          </div>
                          {relatedElection && (
                            <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
                              <span className="font-semibold">선거 상태:</span>{' '}
                              <span className={relatedElection.votingOpen ? 'text-green-600' : 'text-gray-600'}>
                                {relatedElection.votingOpen ? '진행중' : '종료됨'}
                              </span>
                              {' | '}
                              <span className="font-semibold">총 투표:</span> {relatedElection.totalVotes}표
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    기록된 투표가 없습니다.
                  </p>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-bold">ℹ️ 정보:</span> Supabase 데이터베이스에서 
                  실시간으로 선거 및 투표 데이터를 불러옵니다.
                  모든 투표는 동시에 Sepolia 블록체인에도 기록됩니다.
                </p>
              </div>
            </>
          )}
        </div>
    </div>
  )
}
