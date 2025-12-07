// src/utils/blockchain.ts
import { Block, Transaction } from '../types'
import { sha256 } from './crypto'

export class Blockchain {
  private chain: Block[]
  private difficulty: number = 2

  constructor() {
    this.chain = [this.createGenesisBlock()]
  }

  // 제네시스 블록 – 타입 오류 안 나게 number 사용
  private createGenesisBlock(): Block {
    return {
      index: 0,
      timestamp: Date.now(),
      data: {
        id: 0,
        type: 'ELECTION_CREATE',
        electionId: 0,
        voterId: 'system',
        candidateId: undefined,
        nftTokenId: undefined,
        timestamp: Date.now(),
        signature: 'genesis-signature',
      },
      previousHash: '0',
      hash: '0',
      nonce: 0,
    }
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1]
  }

  // 새 블록 채굴
  async mineBlock(data: Transaction): Promise<Block> {
    const newBlock: Block = {
      index: this.chain.length,
      timestamp: Date.now(),
      data,
      previousHash: this.getLatestBlock().hash,
      hash: '',
      nonce: 0,
    }

    // Proof of Work
    while (true) {
      newBlock.hash = await this.calculateHash(newBlock)
      if (this.isValidProof(newBlock)) break
      newBlock.nonce++
    }

    this.chain.push(newBlock)
    return newBlock
  }

  private async calculateHash(block: Block): Promise<string> {
    const raw =
      block.index +
      block.timestamp +
      JSON.stringify(block.data) +
      block.previousHash +
      block.nonce

    return await sha256(raw)
  }

  private isValidProof(block: Block): boolean {
    return block.hash.startsWith('0'.repeat(this.difficulty))
  }

  async isChainValid(): Promise<boolean> {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i]
      const previous = this.chain[i - 1]

      const calculated = await this.calculateHash(current)
      if (current.hash !== calculated) return false

      if (current.previousHash !== previous.hash) return false

      if (!this.isValidProof(current)) return false
    }

    return true
  }

  getChain(): Block[] {
    return this.chain
  }

  getBlockByIndex(index: number): Block | undefined {
    return this.chain[index]
  }

  getTransactionsByElection(electionId: number): Transaction[] {
    return this.chain
      .map((block) => block.data)
      .filter((tx) => tx.electionId === electionId)
  }

  hasVoted(voterId: string, electionId: number): boolean {
    return this.chain.some(
      (block) =>
        block.data.type === 'VOTE' &&
        block.data.voterId === voterId &&
        block.data.electionId === electionId
    )
  }

  getChainLength(): number {
    return this.chain.length
  }

  exportChain(): string {
    return JSON.stringify(this.chain, null, 2)
  }

  importChain(chainData: string): boolean {
    try {
      const parsed = JSON.parse(chainData)

      this.chain = parsed.map((block: Block) => ({
        ...block,
        data: {
          ...block.data,
          electionId:
            typeof block.data.electionId === 'string'
              ? parseInt(
                  String(block.data.electionId).replace(/\D/g, ''),
                  10
                ) || 0
              : Number(block.data.electionId),
        },
      }))

      return true
    } catch (err) {
      console.error('Failed to import chain:', err)
      return false
    }
  }

  // 체인을 검증 불가 상태에서 복구(재마이닝)합니다.
  // 기존 블록의 timestamp와 data는 유지하고, 이전 해시와 nonce/hash를 재계산하여
  // 현재 difficulty 기준에 맞게 만듭니다. 주의: 블록체인 이력을 변경하므로
  // 원본 백업이 필요한 경우 exportChain()로 저장하세요.
  async repairChain(): Promise<void> {
    if (this.chain.length <= 1) return

    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i]
      const previous = this.chain[i - 1]

      // previousHash를 일치시킵니다.
      current.previousHash = previous.hash

      // nonce/hash 재계산 (재마이닝)
      current.nonce = 0
      while (true) {
        current.hash = await this.calculateHash(current)
        if (this.isValidProof(current)) break
        current.nonce++
      }
    }
  }
}

// 싱글톤 인스턴스
let blockchainInstance: Blockchain | null = null

export function getBlockchain(): Blockchain {
  if (!blockchainInstance) {
    blockchainInstance = new Blockchain()

    const saved = localStorage.getItem('blockchainData')
    if (saved) {
      blockchainInstance.importChain(saved)
    }
    // 비동기 백그라운드에서 체인 유효성 검사 후 필요 시 자동 복구 및 저장
    ;(async () => {
      try {
        const isValid = await blockchainInstance!.isChainValid()
        if (!isValid) {
          console.warn('로컬 체인이 유효하지 않습니다. 자동 복구를 시도합니다.')
          await blockchainInstance!.repairChain()
          const data = blockchainInstance!.exportChain()
          localStorage.setItem('blockchainData', data)
          console.info(
            '자동 복구 완료: 로컬 체인이 재마이닝되어 저장되었습니다.'
          )
        }
      } catch (err) {
        console.error('자동 복구 중 오류 발생:', err)
      }
    })()
  }
  return blockchainInstance
}

export function saveBlockchain(): void {
  if (blockchainInstance) {
    const data = blockchainInstance.exportChain()
    localStorage.setItem('blockchainData', data)
  }
}

// 로컬 체인을 재마이닝하여 유효하게 만듭니다. 성공하면 저장하고 true 반환.
export async function repairBlockchain(): Promise<boolean> {
  try {
    if (!blockchainInstance) getBlockchain()
    if (!blockchainInstance) return false

    await blockchainInstance.repairChain()
    const data = blockchainInstance.exportChain()
    localStorage.setItem('blockchainData', data)
    return true
  } catch (err) {
    console.error('repairBlockchain 실패:', err)
    return false
  }
}
