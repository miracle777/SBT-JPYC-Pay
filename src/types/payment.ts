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
  description?: string
): PaymentPayload => {
  return {
    version: '1.0',
    type: 'payment',
    shopId,
    shopName,
    shopWallet,
    amount,
    currency: 'JPYC',
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

export const decodePaymentPayload = (encoded: string): PaymentPayload => {
  return JSON.parse(encoded);
};
