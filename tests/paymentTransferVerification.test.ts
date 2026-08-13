import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ERC20_TRANSFER_EVENT_TOPIC,
  collectUsedPaymentTransactionHashes,
  comparePaymentSessionPriority,
  compareTransferLogOrder,
  isVerifiedPaymentSession,
  parseUsedPaymentTransactionHashes,
  serializeUsedPaymentTransactionHashes,
  verifyPaymentReceipt,
  verifyPaymentTransfer,
  type TransferLogLike,
} from '../src/utils/paymentTransferVerification.ts';

const TOKEN = '0x1111111111111111111111111111111111111111';
const SHOP = '0x2222222222222222222222222222222222222222';
const PAYER = '0x3333333333333333333333333333333333333333';
const OTHER = '0x4444444444444444444444444444444444444444';
const RELAYER = '0x5555555555555555555555555555555555555555';
const TX_HASH = `0x${'ab'.repeat(32)}`;
const SECOND_TX_HASH = `0x${'cd'.repeat(32)}`;
const EXPECTED_AMOUNT = 25n * 10n ** 18n;

const addressTopic = (address: string) =>
  `0x${'0'.repeat(24)}${address.slice(2).toLowerCase()}`;

const uint256Data = (value: bigint) => `0x${value.toString(16).padStart(64, '0')}`;

const transferLog = (overrides: Partial<TransferLogLike> = {}): TransferLogLike => ({
  address: TOKEN,
  blockNumber: 101,
  index: 0,
  transactionHash: TX_HASH,
  topics: [ERC20_TRANSFER_EVENT_TOPIC, addressTopic(PAYER), addressTopic(SHOP)],
  data: uint256Data(EXPECTED_AMOUNT),
  ...overrides,
});

const expectation = (usedTransactionHashes: ReadonlySet<string> = new Set()) => ({
  tokenContractAddress: TOKEN,
  recipientAddress: SHOP,
  amountBaseUnits: EXPECTED_AMOUNT.toString(),
  usedTransactionHashes,
});

const verifiedSession = (overrides: Record<string, unknown> = {}) => ({
  status: 'completed',
  verificationStatus: 'verified',
  transactionHash: TX_HASH,
  payerAddress: PAYER,
  tokenContractAddress: TOKEN,
  recipientAddress: SHOP,
  expectedAmountBaseUnits: EXPECTED_AMOUNT.toString(),
  ...overrides,
});

test('accepts only an exact Transfer for the configured token, recipient, and amount', () => {
  const result = verifyPaymentTransfer(transferLog(), expectation());

  assert.deepEqual(result, {
    valid: true,
    payerAddress: PAYER,
    amountBaseUnits: EXPECTED_AMOUNT.toString(),
    transactionHash: TX_HASH,
  });
});

test('rejects an underpayment', () => {
  const result = verifyPaymentTransfer(
    transferLog({ data: uint256Data(EXPECTED_AMOUNT - 1n) }),
    expectation()
  );

  assert.deepEqual(result, { valid: false, reason: 'amount_mismatch' });
});

test('rejects an overpayment when the session requires an exact amount', () => {
  const result = verifyPaymentTransfer(
    transferLog({ data: uint256Data(EXPECTED_AMOUNT + 1n) }),
    expectation()
  );

  assert.deepEqual(result, { valid: false, reason: 'amount_mismatch' });
});

test('rejects a Transfer emitted by a different token contract', () => {
  assert.deepEqual(
    verifyPaymentTransfer(transferLog({ address: OTHER }), expectation()),
    { valid: false, reason: 'wrong_token_contract' }
  );
});

test('rejects a Transfer to a different recipient', () => {
  assert.deepEqual(
    verifyPaymentTransfer(
      transferLog({
        topics: [ERC20_TRANSFER_EVENT_TOPIC, addressTopic(PAYER), addressTopic(OTHER)],
      }),
      expectation()
    ),
    { valid: false, reason: 'wrong_recipient' }
  );
});

test('accepts a successful receipt from a block after session creation', () => {
  assert.deepEqual(
    verifyPaymentReceipt({ hash: TX_HASH, status: 1, blockNumber: 101 }, TX_HASH, 101),
    { valid: true, blockNumber: 101 }
  );
});
test('rejects a failed transaction receipt', () => {
  assert.deepEqual(
    verifyPaymentReceipt({ hash: TX_HASH, status: 0, blockNumber: 101 }, TX_HASH, 100),
    { valid: false, reason: 'failed_transaction' }
  );
});

test('rejects a receipt from before the payment session block', () => {
  assert.deepEqual(
    verifyPaymentReceipt({ hash: TX_HASH, status: 1, blockNumber: 100 }, TX_HASH, 101),
    { valid: false, reason: 'before_session' }
  );
});

test('orders matching sessions and logs oldest first for deterministic allocation', () => {
  const sessions = [
    { id: 'PAY-B', createdAtBlockNumber: 101 },
    { id: 'PAY-C', createdAtBlockNumber: 100 },
    { id: 'PAY-A', createdAtBlockNumber: 101 },
  ].sort(comparePaymentSessionPriority);
  const logs = [
    { blockNumber: 102, index: 0 },
    { blockNumber: 101, index: 2 },
    { blockNumber: 101, index: 1 },
  ].sort(compareTransferLogOrder);

  assert.deepEqual(sessions.map((session) => session.id), ['PAY-C', 'PAY-A', 'PAY-B']);
  assert.deepEqual(logs, [
    { blockNumber: 101, index: 1 },
    { blockNumber: 101, index: 2 },
    { blockNumber: 102, index: 0 },
  ]);
});
test('allows one transaction to complete only one of multiple matching sessions', () => {
  const usedHashes = new Set<string>();
  const first = verifyPaymentTransfer(transferLog(), expectation(usedHashes));
  assert.equal(first.valid, true);
  if (first.valid) usedHashes.add(first.transactionHash);

  assert.deepEqual(
    verifyPaymentTransfer(transferLog(), expectation(usedHashes)),
    { valid: false, reason: 'transaction_already_used' }
  );
});

test('normalizes hashes so case differences cannot bypass duplicate prevention', () => {
  const uppercaseHash = TX_HASH.toUpperCase().replace('0X', '0x');
  assert.deepEqual(
    verifyPaymentTransfer(transferLog(), expectation(new Set([uppercaseHash]))),
    { valid: false, reason: 'transaction_already_used' }
  );
});

test('restored completed sessions contribute their hashes to duplicate prevention', () => {
  const restoredSessions = JSON.parse(
    JSON.stringify([{ transactionHash: TX_HASH }, { transactionHash: SECOND_TX_HASH }])
  );
  const hashes = collectUsedPaymentTransactionHashes(restoredSessions);
  const reloadedHashes = parseUsedPaymentTransactionHashes(
    serializeUsedPaymentTransactionHashes(hashes)
  );

  assert.deepEqual([...reloadedHashes], [TX_HASH, SECOND_TX_HASH]);
  assert.deepEqual(
    verifyPaymentTransfer(transferLog(), expectation(reloadedHashes)),
    { valid: false, reason: 'transaction_already_used' }
  );
});

test('uses Transfer.from as payer when tx.from is a different relayer', () => {
  const transactionFrom = RELAYER;
  const result = verifyPaymentTransfer(transferLog(), expectation());

  assert.notEqual(transactionFrom, PAYER);
  assert.equal(result.valid, true);
  if (result.valid) assert.equal(result.payerAddress, PAYER);
});

test('rejects mint-like Transfer events without an actual payer', () => {
  const result = verifyPaymentTransfer(
    transferLog({
      topics: [
        ERC20_TRANSFER_EVENT_TOPIC,
        addressTopic('0x0000000000000000000000000000000000000000'),
        addressTopic(SHOP),
      ],
    }),
    expectation()
  );

  assert.deepEqual(result, { valid: false, reason: 'zero_payer' });
});

test('permits SBT issuance only for a fully verified payment session', () => {
  assert.equal(isVerifiedPaymentSession(verifiedSession()), true);
  assert.equal(isVerifiedPaymentSession(verifiedSession({ verificationStatus: undefined })), false);
  assert.equal(isVerifiedPaymentSession(verifiedSession({ status: 'pending' })), false);
  assert.equal(isVerifiedPaymentSession(verifiedSession({ transactionHash: undefined })), false);
});