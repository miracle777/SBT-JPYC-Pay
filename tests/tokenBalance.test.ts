import assert from 'node:assert/strict';
import test from 'node:test';

import { readOnChainTokenBalance } from '../src/utils/tokenBalance.ts';

const ACCOUNT = '0x1111111111111111111111111111111111111111';

test('preserves the standard wallet on-chain ERC-20 balance', async () => {
  let requestedAccount = '';
  const balanceOf = async (account: string) => {
    requestedAccount = account;
    return 123_450000000000000000n;
  };

  const result = await readOnChainTokenBalance(balanceOf, ACCOUNT);

  assert.equal(requestedAccount, ACCOUNT);
  assert.deepEqual(result, {
    amountBaseUnits: 123_450000000000000000n,
    source: 'on-chain',
  });
});

test('does not infer or add a deposited wallet balance', async () => {
  let depositedBalanceCalls = 0;
  const walletProvider = {
    async getErc20TokenBalanceWithDepositedBalance() {
      depositedBalanceCalls += 1;
      return 999n;
    },
  };
  const balanceOf = async () => 0n;

  const result = await readOnChainTokenBalance(balanceOf, ACCOUNT);

  assert.ok(walletProvider);
  assert.equal(result.amountBaseUnits, 0n);
  assert.equal(result.source, 'on-chain');
  assert.equal(depositedBalanceCalls, 0);
});

test('does not fabricate a balance when the on-chain query fails', async () => {
  const balanceOf = async (): Promise<bigint> => {
    throw new Error('RPC unavailable');
  };

  await assert.rejects(() => readOnChainTokenBalance(balanceOf, ACCOUNT), /RPC unavailable/);
});