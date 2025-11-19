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
    43113: 'avalanche-fuji'
  };
  
  // WeiからJPYC単位へ変換　
  const amountJPYC = (BigInt(payload.amount) / BigInt(10 ** 18)).toString();
  
  const jpycPayData = {
    type: 'JPYC_PAYMENT',  // 統一標準形式
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

// MetaMask QRコード規格：ethereum: スキーム形式
export const encodePaymentPayloadForMetaMask = (payload: PaymentPayload): string => {
  // EIP-681準拠のethereum: URIスキーム
  const value = payload.amount; // Wei単位
  const chainIdHex = `0x${payload.chainId.toString(16)}`;
  
  // ERC-20 transfer function
  const functionSignature = 'transfer(address,uint256)';
  const transferData = [
    payload.shopWallet.replace('0x', '').padStart(64, '0'), // to address (32 bytes)
    BigInt(value).toString(16).padStart(64, '0') // amount (32 bytes)
  ].join('');
  
  const params = new URLSearchParams({
    chainId: chainIdHex,
    gas: '65000', // ERC20転送の標準ガス量
    data: `0xa9059cbb${transferData}` // transfer function selector + data
  });
  
  return `ethereum:${payload.contractAddress}@${payload.chainId}?${params.toString()}`;
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
    
    // JPYC_PAYMENT統一標準形式の場合
    if (data.type === 'JPYC_PAYMENT') {
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
