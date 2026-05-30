export interface PaymentPayload {
  version: string; // QRコード仕様バージョン
  type: 'payment'; // トランザクションタイプ
  shopId: string; // 店舗ID
  shopName: string; // 店舗名
  shopWallet: string; // 受取人アドレス
  amount: string; // 支払い金額（Wei）
  currency: string; // 通貨記号（JPYC）
  chainId: number; // チェーンID
  paymentId: string; // 支払いID
  expiresAt: number; // 有効期限（UnixTimestamp）
  contractAddress: string; // JYPCコントラクトアドレス
  description?: string; // 支払い説明
}

export const createPaymentPayload = (
  shopId: string,
  shopName: string,
  shopWallet: string,
  amount: string,
  chainId: number,
  contractAddress: string,
  expiresAt: number,
  paymentId: string,
  description?: string,
  currencySymbol?: string // 追加: 通貨シンボル (JPYC または tJPYC)
): PaymentPayload => {
  return {
    version: '1.0',
    type: 'payment',
    shopId,
    shopName,
    shopWallet,
    amount,
    currency: currencySymbol || 'JPYC',
    chainId,
    paymentId,
    expiresAt,
    contractAddress,
    description,
  };
};

export const encodePaymentPayload = (payload: PaymentPayload): string => {
  return JSON.stringify(payload);
};

// jpyc-pay.app規格：JPYC_PAYMENT統一標準形式
export const encodePaymentPayloadForJPYCPay = (payload: PaymentPayload): string => {
  // 仕様書に準拠したJPYC_PAYMENT統一形式
  const networkMap: Record<number, string> = {
    1: 'ethereum',
    11155111: 'sepolia', 
    137: 'polygon',
    80002: 'polygon-amoy',
    43114: 'avalanche',
    43113: 'avalanche-fuji',
    8217: 'kaia'
  };
  
  // WeiからJPYC単位へ変換　
  const amountJPYC = (BigInt(payload.amount) / BigInt(10 ** 18)).toString();
  
  const jpycPayData = {
    type: 'MASARU21_PAYMENT',  // 統一標準形式（推奨）
    to: payload.shopWallet,        // 受取先アドレス
    amount: amountJPYC,            // JPYC単位の金額
    currency: payload.currency,    // 通貨シンボル (JPYC または tJPYC)
    network: networkMap[payload.chainId] || 'unknown',  // ネットワーク名
    chainId: payload.chainId,      // ネットワークID
    contractAddress: payload.contractAddress, // JPYCコントラクトアドレス
    merchant: {
      name: payload.shopName,
      id: payload.shopId,
      description: payload.description || `${payload.shopName}での支払い`
    },
    timestamp: Math.floor(Date.now() / 1000),
    expires: payload.expiresAt
  };
  
  return JSON.stringify(jpycPayData);
};

// MetaMask互換形式: EIP-681準拠のERC-20トークン送金URI
// MetaMaskアプリの標準QRスキャナーに対応
export const encodePaymentPayloadForMetaMask = (payload: PaymentPayload): string => {
  // EIP-681形式: ethereum:<contractAddress>@<chainId>/transfer?address=<recipient>&uint256=<amount>
  // 参考: https://eips.ethereum.org/EIPS/eip-681
  
  const { contractAddress, chainId, shopWallet, amount } = payload;
  
  // 🔧 MetaMaskアプリ向けの標準EIP-681形式
  // 方式1: 関数名形式（より互換性が高い）
  // ethereum:<contract>@<chainId>/transfer?address=<to>&uint256=<amount>
  
  const eip681Uri = `ethereum:${contractAddress}@${chainId}/transfer?address=${shopWallet}&uint256=${amount}`;
  
  console.log('🦊 MetaMask互換QRコード生成 (EIP-681標準形式):', {
    uri: eip681Uri,
    contractAddress,
    chainId,
    recipient: shopWallet,
    amountWei: amount,
    amountJPYC: (BigInt(amount) / BigInt(10 ** 18)).toString() + ' JPYC',
    standard: 'EIP-681',
    format: 'Function Name Format (transfer)',
    uriLength: eip681Uri.length
  });
  
  console.info('✅ EIP-681準拠（関数名形式）: MetaMaskで自動的にトランザクションが構築されます');
  console.warn('⚠️ MetaMaskアプリでスキャン後、トランザクション確認画面が表示されるか確認してください');
  
  return eip681Uri;
};

export const decodePaymentPayload = (encoded: string): PaymentPayload => {
  // ethereum: URIスキーム形式の場合（MetaMask）
  if (encoded.startsWith('ethereum:')) {
    // MetaMask用のデコードロジック（必要に応じて実装）
    throw new Error('MetaMask QRコードのデコードは未実装');
  }
  
  // JSON形式
  try {
    const data = JSON.parse(encoded);
    
    // MASARU21_PAYMENT統一標準形式の場合
    if (data.type === 'MASARU21_PAYMENT' || data.type === 'JPYC_PAYMENT') {
      // JPYC単位からWei単位へ変換
      const amountWei = (BigInt(data.amount || 0) * BigInt(10 ** 18)).toString();
      
      return {
        version: '1.0',
        type: 'payment',
        shopId: data.merchant?.id || '',
        shopName: data.merchant?.name || '',
        shopWallet: data.to || '',
        amount: amountWei,
        currency: 'JPYC',
        chainId: data.chainId || 0,
        paymentId: `PAY${Date.now()}`,
        expiresAt: data.expires || 0,
        contractAddress: data.contractAddress || '',
        description: data.merchant?.description
      };
    }
    
    // 旧型jpyc-payment形式
    if (data.type === 'jpyc-payment') {
      return {
        version: data.version || '1.0',
        type: 'payment',
        shopId: data.shopId || '',
        shopName: data.shopName || '',
        shopWallet: data.to || '',
        amount: data.amount || '0',
        currency: 'JPYC',
        chainId: data.chainId || 0,
        paymentId: data.paymentId || '',
        expiresAt: data.expiresAt || 0,
        contractAddress: data.token || '',
        description: data.description
      };
    }
    
    // 従来形式
    return data as PaymentPayload;
  } catch (error) {
    throw new Error('QRコードの形式が不正です');
  }
};
