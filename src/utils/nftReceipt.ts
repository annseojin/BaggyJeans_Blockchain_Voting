'use client';

import { NFTReceipt, NFTMetadata } from '@/types';
import { sha256 } from './crypto';
import { BrowserProvider, Contract } from 'ethers';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '@/lib/contractConfig';

function toBase64(str: string): string {
  return window.btoa(unescape(encodeURIComponent(str)));
}

/**
 * IPFS에 NFT 메타데이터 업로드 (시뮬레이션)
 * 실제 배포 시: Pinata, Web3.Storage 등의 IPFS 서비스 사용
 */
export async function uploadMetadataToIPFS(
  metadata: NFTMetadata
): Promise<string> {
  try {
    const metadataJson = JSON.stringify(metadata);
    const dataUri = `data:application/json;base64,${toBase64(metadataJson)}`;

    const metadataList = JSON.parse(
      localStorage.getItem('nftMetadata') || '[]'
    );
    metadataList.push({
      ...metadata,
      dataUri,
      timestamp: Date.now(),
    });
    localStorage.setItem('nftMetadata', JSON.stringify(metadataList));

    console.log('Metadata uploaded (local):', dataUri);
    return dataUri;
  } catch (error) {
    console.error('Failed to upload metadata to IPFS:', error);
    throw error;
  }
}

/**
 * NFT 이미지 생성 (SVG)
 */
export function generateNFTImage(
  electionTitle: string,
  candidateName: string
): string {
  const svg = `
    <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="500" height="500" fill="url(#grad)"/>
      <circle cx="250" cy="250" r="150" fill="rgba(255,255,255,0.1)" stroke="white" stroke-width="3"/>
      <text x="250" y="120" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
        투표 인증 NFT
      </text>
      <text x="250" y="200" font-size="20" fill="white" text-anchor="middle" font-weight="600">
        ${electionTitle.substring(0, 20)}
      </text>
      <text x="250" y="280" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        선택: ${candidateName}
      </text>
      <text x="250" y="370" font-size="14" fill="rgba(255,255,255,0.7)" text-anchor="middle">
        ${new Date().toLocaleDateString('ko-KR')}
      </text>
      <rect x="150" y="420" width="200" height="50" fill="rgba(255,255,255,0.1)" rx="5"/>
      <text x="250" y="450" font-size="14" fill="white" text-anchor="middle" font-weight="bold">
        블록체인 검증됨 ✓
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

/**
 * NFT 영수증 생성
 */
export async function generateNFTReceipt(
  electionId: number,
  electionTitle: string,
  candidateId: string,
  candidateName: string,
  voterAddress: string,
  voters: any[]
): Promise<NFTReceipt> {
  try {
    const tokenData = `${electionId}-${voterAddress}-${Date.now()}`;
    const tokenId = (await sha256(tokenData)).substring(0, 16);

    const imageURI = generateNFTImage(electionTitle, candidateName);

    const metadata: NFTMetadata = {
      name: `투표 인증 - ${electionTitle}`,
      description: `${electionTitle} 투표에 참여한 인증 NFT 영수증`,
      image: imageURI,
      attributes: [
        { trait_type: '선거', value: electionTitle },
        { trait_type: '투표 선택', value: candidateName },
        { trait_type: '투표자', value: voterAddress },
        { trait_type: '투표 일시', value: new Date().toISOString() },
        { trait_type: '검증 상태', value: '블록체인 검증됨' },
      ],
      electionId, // ✅ number
      votedAt: new Date().toISOString(),
    };

    const metadataURI = await uploadMetadataToIPFS(metadata);

    const receipt: NFTReceipt = {
      tokenId,
      electionId, // ✅ number
      electionTitle,
      voterAddress,
      mintedAt: new Date().toISOString(),
      metadataURI,
      imageURI,
    };

    return receipt;
  } catch (error) {
    console.error('Failed to generate NFT receipt:', error);
    throw error;
  }
}

/**
 * 유권자에게 NFT 영수증 저장
 */
export function saveNFTReceiptToVoter(
  voterId: string,
  receipt: NFTReceipt
): void {
  try {
    const voters: any[] = JSON.parse(localStorage.getItem('voters') || '[]');
    const voterIndex = voters.findIndex((v) => v.id === voterId);

    if (voterIndex !== -1) {
      if (!voters[voterIndex].nftTokens) {
        voters[voterIndex].nftTokens = [];
      }
      voters[voterIndex].nftTokens.push(receipt);
      localStorage.setItem('voters', JSON.stringify(voters));

      const currentVoter = JSON.parse(
        localStorage.getItem('currentVoter') || '{}'
      );
      if (currentVoter.id === voterId) {
        if (!currentVoter.nftTokens) {
          currentVoter.nftTokens = [];
        }
        currentVoter.nftTokens.push(receipt);
        localStorage.setItem('currentVoter', JSON.stringify(currentVoter));
      }
    }
  } catch (error) {
    console.error('Failed to save NFT receipt to voter:', error);
  }
}

/**
 * 유권자의 NFT 영수증 조회
 */
export function getVoterNFTReceipts(voterId: string): NFTReceipt[] {
  try {
    const voters: any[] = JSON.parse(localStorage.getItem('voters') || '[]');
    const voter = voters.find((v) => v.id === voterId);
    return voter?.nftTokens || [];
  } catch (error) {
    console.error('Failed to get NFT receipts:', error);
    return [];
  }
}

/**
 * 투표 시 NFT 영수증 발급 여부 확인
 */
export async function shouldMintNFTReceipt(
  electionId: number
): Promise<boolean> {
  try {
    const elections: any[] = JSON.parse(
      localStorage.getItem('elections') || '[]'
    );
    const election = elections.find((e) => e.id === electionId);
    return election?.enableNFTReceipt || false;
  } catch (error) {
    console.error('Failed to check NFT receipt setting:', error);
    return false;
  }
}

/**
 * 온체인 VotingReceiptNFT 컨트랙트에 실제 NFT 민트
 */
export async function mintOnChainNFTReceipt(
  electionId: number,
  metadataURI: string
): Promise<{ tokenId: string; txHash: string }> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask가 필요합니다.');
  }

  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();

  const contract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer);

  const tx = await contract.mintReceipt(electionId, metadataURI);
  const receipt = await tx.wait();

  const nextId = await contract.nextTokenId();
  const mintedTokenId = nextId.toString();

  console.log('NFT minted:', {
    tokenId: mintedTokenId,
    txHash: receipt.hash,
  });

  return {
    tokenId: mintedTokenId,
    txHash: receipt.hash,
  };
}
