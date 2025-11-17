/**
 * セキュアな秘密鍵管理ユーティリティ
 */

import { ethers } from 'ethers';

/**
 * ローカルストレージから秘密鍵を取得
 */
export function getSavedPrivateKey(): string | null {
  try {
    const saved = localStorage.getItem('sbt-private-key');
    if (!saved) return null;
    
    // Base64デコード（簡易的な難読化）
    const decoded = atob(saved);
    return decoded;
  } catch (error) {
    console.error('秘密鍵取得エラー:', error);
    // 破損したデータを削除
    localStorage.removeItem('sbt-private-key');
    return null;
  }
}

/**
 * 秘密鍵をローカルストレージに保存
 */
export function savePrivateKey(privateKey: string): boolean {
  try {
    // 秘密鍵の形式を検証
    if (!isValidPrivateKey(privateKey)) {
      console.error('無効な秘密鍵形式');
      return false;
    }

    // Base64エンコード（簡易的な難読化）
    const encoded = btoa(privateKey);
    localStorage.setItem('sbt-private-key', encoded);
    return true;
  } catch (error) {
    console.error('秘密鍵保存エラー:', error);
    return false;
  }
}

/**
 * 秘密鍵を削除
 */
export function removePrivateKey(): void {
  localStorage.removeItem('sbt-private-key');
}

/**
 * 秘密鍵の形式を検証
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    const cleanKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`;
    new ethers.Wallet(cleanKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 秘密鍵から署名者（Signer）を作成
 */
export function createSignerFromPrivateKey(privateKey: string, provider: ethers.Provider): ethers.Wallet | null {
  try {
    if (!isValidPrivateKey(privateKey)) {
      console.error('無効な秘密鍵');
      return null;
    }

    const cleanKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`;
    return new ethers.Wallet(cleanKey, provider);
  } catch (error) {
    console.error('Signer作成エラー:', error);
    return null;
  }
}

/**
 * 秘密鍵からアドレスを取得
 */
export function getAddressFromPrivateKey(privateKey: string): string | null {
  try {
    if (!isValidPrivateKey(privateKey)) {
      return null;
    }

    const cleanKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`;
    const wallet = new ethers.Wallet(cleanKey);
    return wallet.address;
  } catch {
    return null;
  }
}

/**
 * 保存された秘密鍵でSBT発行が可能かチェック
 */
export function canMintSBT(): { canMint: boolean; reason?: string; address?: string } {
  const privateKey = getSavedPrivateKey();
  
  if (!privateKey) {
    return {
      canMint: false,
      reason: 'SBT発行用秘密鍵が設定されていません。設定画面で秘密鍵を入力してください。'
    };
  }

  if (!isValidPrivateKey(privateKey)) {
    return {
      canMint: false,
      reason: '保存された秘密鍵が無効です。設定画面で正しい秘密鍵を設定してください。'
    };
  }

  const address = getAddressFromPrivateKey(privateKey);
  if (!address) {
    return {
      canMint: false,
      reason: '秘密鍵からアドレスを取得できませんでした。'
    };
  }

  return {
    canMint: true,
    address
  };
}