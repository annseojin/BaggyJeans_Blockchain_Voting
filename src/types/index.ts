// src/types/index.ts

// 블록체인 블록
export interface Block {
  index: number;
  timestamp: number;
  data: Transaction;
  previousHash: string;
  hash: string;
  nonce: number;
}

export type TransactionType =
  | 'VOTE'
  | 'ELECTION_CREATE'
  | 'VOTER_REGISTER'
  | 'NFT_MINT';

// 블록체인 트랜잭션
export interface Transaction {
  id: number; // 항상 number
  type: TransactionType;
  electionId: number;
  voterId: string;
  candidateId?: string; // 평문 후보 id 또는 해시
  nftTokenId?: string;
  timestamp: number;
  signature: string;
}

// 후보
export interface Candidate {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  voteCount: number;
}

export type ElectionStatus = 'upcoming' | 'active' | 'ended';

// 투표(선거)
export interface Election {
  id: number;
  title: string;
  description: string;
  candidates: Candidate[];
  startDate: string;
  endDate: string;
  status: ElectionStatus;
  createdBy: string;
  createdAt: string;
  totalVotes: number;
  isAnonymous: boolean;
  isSecret: boolean;
  requiresVerification: boolean;
  enableNFTReceipt: boolean;
  nftContractAddress?: string;
  nftMetadataURI?: string;
  adminPassword?: string;
  contract_election_id?: number; // 블록체인용 숫자 ID (uint256)
  accessCode?: string; // 투표 입장 코드
}

// NFT 영수증
export interface NFTReceipt {
  tokenId?: string;
  electionId: number;
  electionTitle: string;
  voterAddress: string;
  mintedAt: string;
  metadataURI: string;
  imageURI: string;
  transactionHash?: string;
}

// NFT 메타데이터
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  electionId: number;
  votedAt: string;
}

// 유권자
export interface Voter {
  id: string;
  did: string;
  publicKey: string;
  registeredAt: string;
  votedElections: number[];
  verified: boolean;
  nftTokens: NFTReceipt[]; // 보유 NFT 영수증
}

// 투표 기록(필요하면 사용)
export interface VoteRecord {
  id: string;
  electionId: number;
  voterId: string;
  blockIndex: number;
  timestamp: number;
  verified: boolean;
  isSecret: boolean;
  encryptedVote?: string;
}
