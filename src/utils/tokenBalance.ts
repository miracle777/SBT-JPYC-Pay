export const ON_CHAIN_BALANCE_NOTICE =
  '接続アドレスのERC-20オンチェーン残高です。預入・運用型ウォレットでは、サービス内残高と異なる場合があります。';

export const KAIA_DEPOSIT_WALLET_NOTICE =
  'Unifiを含む預入型ウォレットのサービス内残高は、この表示に含まれません。Unifiの残高表示・決済動作は未検証で、正式サポート対象外です。';


export interface OnChainTokenBalance {
  amountBaseUnits: bigint;
  source: 'on-chain';
}

/**
 * Reads only the ERC-20 balance held by the connected on-chain address.
 * Deposited, pooled, vaulted, or otherwise off-address balances are never
 * inferred or added here.
 */
export const readOnChainTokenBalance = async (
  balanceOf: (account: string) => Promise<bigint>,
  account: string
): Promise<OnChainTokenBalance> => {
  const amountBaseUnits = await balanceOf(account);
  if (amountBaseUnits < 0n) {
    throw new Error('ERC-20 balance cannot be negative');
  }

  return { amountBaseUnits, source: 'on-chain' };
};