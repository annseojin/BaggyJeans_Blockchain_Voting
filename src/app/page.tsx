'use client';

import { useState, useEffect } from 'react';
import { Vote, Shield, BarChart3, Search, Wallet, Users } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { VoterAuth } from '@/components/VoterAuth';
import { ElectionList } from '@/components/ElectionList';
import { CreateElection } from '@/components/CreateElection';
import { VotingBooth } from '@/components/VotingBooth';
import { BlockchainExplorer } from '@/components/BlockchainExplorer';
import { Information } from '@/components/Information';
import { Voter, Election } from '@/types';
import {
  isMetaMaskInstalled,
  onAccountsChanged,
  removeListener,
  formatAddress,
} from '@/utils/metamask';

type View =
  | 'auth'
  | 'dashboard'
  | 'elections'
  | 'create'
  | 'edit'
  | 'vote'
  | 'explorer'
  | 'information';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('auth');
  const [currentVoter, setCurrentVoter] = useState<Voter | null>(null);
  const [selectedElection, setSelectedElection] = useState<Election | null>(
    null
  );

  useEffect(() => {
    // 저장된 유권자 정보 불러오기 (클라이언트에서만)
    if (typeof window === 'undefined') return;

    const savedVoter = localStorage.getItem('currentVoter');
    if (savedVoter) {
      try {
        setCurrentVoter(JSON.parse(savedVoter));
        setCurrentView('dashboard');
      } catch (e) {
        console.error('Failed to parse saved voter:', e);
      }
    }

    // MetaMask 계정 변경 감지
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // 계정이 제거됨
        handleLogout();
      } else {
        // 계정 변경됨
        const newDid = `did:metamask:${accounts[0]}`;
        const voters: Voter[] = JSON.parse(
          localStorage.getItem('voters') || '[]'
        );
        const voter = voters.find((v) => v.did === newDid);

        if (voter) {
          setCurrentVoter(voter);
          localStorage.setItem('currentVoter', JSON.stringify(voter));
        } else {
          handleLogout();
        }
      }
    };

    if (isMetaMaskInstalled()) {
      onAccountsChanged(handleAccountsChanged);
    }

    return () => {
      if (isMetaMaskInstalled()) {
        removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleLogin = (voter: Voter) => {
    setCurrentVoter(voter);
    localStorage.setItem('currentVoter', JSON.stringify(voter));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentVoter(null);
    localStorage.removeItem('currentVoter');
    setCurrentView('auth');
  };

  const handleVote = (election: Election) => {
    setSelectedElection(election);
    setCurrentView('vote');
  };

  const isMetaMaskUser = currentVoter?.did.startsWith('did:metamask:');

  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <VoterAuth onLogin={handleLogin} />
        </main>

        <footer className="border-t border-gray-200 bg-white/50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center text-gray-600 text-sm">
              <p className="mb-2">블록체인 기반 탈중앙화 전자투표 시스템</p>
              <p className="text-gray-500">
                Copyright ©BaggyJeans. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setCurrentView('dashboard')}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900 font-bold">블록체인 전자투표</h1>
                <p className="text-gray-600 text-sm">
                  탈중앙화 안전한 투표 시스템
                </p>
              </div>
            </div>

            {currentVoter && (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  {isMetaMaskUser && (
                    <Wallet className="w-4 h-4 text-orange-500" />
                  )}
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-700">
                    {isMetaMaskUser
                      ? formatAddress(
                          currentVoter.did.replace('did:metamask:', '')
                        )
                      : currentVoter.did.substring(0, 20) + '...'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 transition-colors relative ${
                currentView === 'dashboard'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              대시보드
              {currentView === 'dashboard' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setCurrentView('elections')}
              className={`flex items-center gap-2 px-4 py-3 transition-colors relative ${
                currentView === 'elections' ||
                currentView === 'create' ||
                currentView === 'edit'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Vote className="w-4 h-4" />
              투표 목록
              {(currentView === 'elections' ||
                currentView === 'create' ||
                currentView === 'edit') && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setCurrentView('explorer')}
              className={`flex items-center gap-2 px-4 py-3 transition-colors relative ${
                currentView === 'explorer'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="w-4 h-4" />
              블록체인 탐색
              {currentView === 'explorer' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setCurrentView('information')}
              className={`flex items-center gap-2 px-4 py-3 transition-colors relative ${
                currentView === 'information'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />팀 소개
              {currentView === 'information' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8">
        {currentView === 'dashboard' && currentVoter && (
          <Dashboard
            voter={currentVoter}
            onCreateElection={() => {
              setSelectedElection(null);
              setCurrentView('create');
            }}
            onViewElections={() => setCurrentView('elections')}
          />
        )}

        {currentView === 'elections' && currentVoter && (
          <ElectionList
            voter={currentVoter}
            onVote={handleVote}
            onCreateElection={() => {
              setSelectedElection(null);
              setCurrentView('create');
            }}
            onEditElection={(election) => {
              setSelectedElection(election);
              setCurrentView('edit');
            }}
          />
        )}

        {(currentView === 'create' || currentView === 'edit') &&
          currentVoter && (
            <CreateElection
              voter={currentVoter}
              onBack={() => {
                setSelectedElection(null);
                setCurrentView('elections');
              }}
              initialElection={currentView === 'edit' ? selectedElection : null}
            />
          )}

        {currentView === 'vote' && currentVoter && selectedElection && (
          <VotingBooth
            election={selectedElection}
            voter={currentVoter}
            onBack={() => setCurrentView('elections')}
          />
        )}

        {currentView === 'explorer' && <BlockchainExplorer />}

        {currentView === 'information' && <Information />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p className="mb-2">블록체인 기반 탈중앙화 전자투표 시스템</p>
            <p className="text-gray-500">
              Copyright ©BaggyJeans. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
