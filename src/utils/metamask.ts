// MetaMask 관련 유틸리티 함수

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface MetaMaskAccount {
  address: string;
  chainId: string;
}

// MetaMask 설치 여부 확인
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ethereum && window.ethereum.isMetaMask);
}

// MetaMask 연동
export async function connectMetaMask(): Promise<MetaMaskAccount> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask가 설치되어 있지 않습니다.');
  }

  try {
    // 계정 요청
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('계정을 가져올 수 없습니다.');
    }

    // 체인 ID 가져오기
    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    });

    return {
      address: accounts[0],
      chainId,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('사용자가 연동을 거부했습니다.');
    }
    throw error;
  }
}

// 현재 연동된 계정 가져오기
export async function getCurrentAccount(): Promise<string | null> {
  if (!isMetaMaskInstalled()) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Failed to get current account:', error);
    return null;
  }
}

// 메시지 서명
export async function signMessage(message: string, account: string): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask가 설치되어 있지 않습니다.');
  }

  try {
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, account],
    });
    return signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('사용자가 서명을 거부했습니다.');
    }
    throw error;
  }
}

// 계정 변경 리스너 등록
export function onAccountsChanged(callback: (accounts: string[]) => void): void {
  if (!isMetaMaskInstalled()) return;

  window.ethereum.on('accountsChanged', callback);
}

// 체인 변경 리스너 등록
export function onChainChanged(callback: (chainId: string) => void): void {
  if (!isMetaMaskInstalled()) return;

  window.ethereum.on('chainChanged', callback);
}

// 리스너 제거
export function removeListener(event: string, callback: any): void {
  if (!isMetaMaskInstalled()) return;

  window.ethereum.removeListener(event, callback);
}

// 체인 이름 가져오기
export function getChainName(chainId: string): string {
  const chains: { [key: string]: string } = {
    '0x1': 'Ethereum Mainnet',
    '0x5': 'Goerli Testnet',
    '0x89': 'Polygon Mainnet',
    '0x13881': 'Mumbai Testnet',
    '0xaa36a7': 'Sepolia Testnet',
  };
  return chains[chainId] || `Chain ${chainId}`;
}

// 주소 짧게 표시
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// 네트워크 전환
export async function switchNetwork(chainId: string): Promise<void> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask가 설치되어 있지 않습니다.');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
  } catch (error: any) {
    // 네트워크가 추가되지 않은 경우
    if (error.code === 4902) {
      throw new Error('해당 네트워크가 MetaMask에 추가되지 않았습니다.');
    }
    throw error;
  }
}
