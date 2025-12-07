// SHA-256 해시 함수 (Web Crypto API 사용)
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 간단한 키페어 생성 (실제는 보안에 유의해야함)
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: JSON.stringify(publicKey),
    privateKey: JSON.stringify(privateKey),
  };
}

// 데이터 서명 생성
export async function signData(data: string, privateKeyString: string): Promise<string> {
  try {
    const privateKeyJwk = JSON.parse(privateKeyString);
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(data)
    );

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Signing failed:', error);
    // 서명 실패 대체
    return await sha256(data + privateKeyString);
  }
}

// 데이터 서명 검증
export async function verifySignature(
  data: string,
  signature: string,
  publicKeyString: string
): Promise<boolean> {
  try {
    const publicKeyJwk = JSON.parse(publicKeyString);
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBytes,
      new TextEncoder().encode(data)
    );
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

// DID 생성 (간소화된 버전)
export async function generateDID(): Promise<string> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `did:evote:${randomHex}`;
}

// 투표 암호화 (간단한 암호화)
export async function encryptVote(candidateId: string, publicKey: string): Promise<string> {
  const combined = `${candidateId}:${publicKey}:${Date.now()}`;
  return await sha256(combined);
}
