export const ERC20_TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const TOPIC_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const UINT256_DATA_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export interface TransferLogLike {
  address: string;
  blockNumber?: number;
  index?: number;
  transactionHash: string;
  topics: readonly string[];
  data: string;
}

export interface PaymentTransferExpectation {
  tokenContractAddress: string;
  recipientAddress: string;
  amountBaseUnits: string;
  usedTransactionHashes: ReadonlySet<string>;
}

export interface TransactionReceiptLike {
  hash: string;
  status: number | null;
  blockNumber: number;
}

export type PaymentTransferRejectionReason =
  | 'invalid_expectation'
  | 'invalid_log'
  | 'wrong_token_contract'
  | 'wrong_recipient'
  | 'zero_payer'
  | 'amount_mismatch'
  | 'transaction_already_used';

export type PaymentTransferValidation =
  | {
      valid: true;
      payerAddress: string;
      amountBaseUnits: string;
      transactionHash: string;
    }
  | {
      valid: false;
      reason: PaymentTransferRejectionReason;
    };

export type PaymentReceiptValidation =
  | { valid: true; blockNumber: number }
  | {
      valid: false;
      reason: 'missing_receipt' | 'wrong_transaction' | 'failed_transaction' | 'before_session';
    };

export interface VerifiablePaymentSession {
  status?: string;
  verificationStatus?: string;
  transactionHash?: string;
  payerAddress?: string;
  tokenContractAddress?: string;
  recipientAddress?: string;
  expectedAmountBaseUnits?: string;
}

const normalizeAddress = (address: string): string | null => {
  if (!ADDRESS_PATTERN.test(address)) return null;
  return address.toLowerCase();
};

const addressFromTopic = (topic: string): string | null => {
  if (!TOPIC_PATTERN.test(topic)) return null;
  return normalizeAddress(`0x${topic.slice(-40)}`);
};

export const normalizePaymentTransactionHash = (hash: string): string | null => {
  if (!HASH_PATTERN.test(hash)) return null;
  return hash.toLowerCase();
};

export const comparePaymentSessionPriority = (
  left: { createdAtBlockNumber: number; id: string },
  right: { createdAtBlockNumber: number; id: string }
): number => left.createdAtBlockNumber - right.createdAtBlockNumber || left.id.localeCompare(right.id);

export const compareTransferLogOrder = (
  left: { blockNumber?: number; index?: number },
  right: { blockNumber?: number; index?: number }
): number =>
  (left.blockNumber ?? Number.MAX_SAFE_INTEGER) -
    (right.blockNumber ?? Number.MAX_SAFE_INTEGER) ||
  (left.index ?? Number.MAX_SAFE_INTEGER) - (right.index ?? Number.MAX_SAFE_INTEGER);
/**
 * Verifies the exact ERC-20 Transfer that is allowed to complete one payment
 * session. The payer is deliberately derived from Transfer.from, not tx.from,
 * because relayers and transferFrom calls can submit a payment for the owner.
 */
export const verifyPaymentTransfer = (
  log: TransferLogLike,
  expectation: PaymentTransferExpectation
): PaymentTransferValidation => {
  const expectedContract = normalizeAddress(expectation.tokenContractAddress);
  const expectedRecipient = normalizeAddress(expectation.recipientAddress);

  let expectedAmount: bigint;
  try {
    expectedAmount = BigInt(expectation.amountBaseUnits);
  } catch {
    return { valid: false, reason: 'invalid_expectation' };
  }

  if (!expectedContract || !expectedRecipient || expectedAmount <= 0n) {
    return { valid: false, reason: 'invalid_expectation' };
  }

  const logContract = normalizeAddress(log.address);
  const transactionHash = normalizePaymentTransactionHash(log.transactionHash);
  if (
    !logContract ||
    !transactionHash ||
    log.topics.length < 3 ||
    log.topics[0]?.toLowerCase() !== ERC20_TRANSFER_EVENT_TOPIC ||
    !UINT256_DATA_PATTERN.test(log.data)
  ) {
    return { valid: false, reason: 'invalid_log' };
  }

  if (logContract !== expectedContract) {
    return { valid: false, reason: 'wrong_token_contract' };
  }

  const payerAddress = addressFromTopic(log.topics[1]);
  const recipientAddress = addressFromTopic(log.topics[2]);
  if (!payerAddress || !recipientAddress) {
    return { valid: false, reason: 'invalid_log' };
  }

  if (recipientAddress !== expectedRecipient) {
    return { valid: false, reason: 'wrong_recipient' };
  }

  if (payerAddress === ZERO_ADDRESS) {
    return { valid: false, reason: 'zero_payer' };
  }

  const transferredAmount = BigInt(log.data);
  if (transferredAmount !== expectedAmount) {
    return { valid: false, reason: 'amount_mismatch' };
  }

  const transactionAlreadyUsed = [...expectation.usedTransactionHashes].some(
    (usedHash) => normalizePaymentTransactionHash(usedHash) === transactionHash
  );
  if (transactionAlreadyUsed) {
    return { valid: false, reason: 'transaction_already_used' };
  }

  return {
    valid: true,
    payerAddress,
    amountBaseUnits: transferredAmount.toString(),
    transactionHash,
  };
};

export const verifyPaymentReceipt = (
  receipt: TransactionReceiptLike | null,
  expectedTransactionHash: string,
  minimumBlockNumber: number
): PaymentReceiptValidation => {
  if (!receipt) return { valid: false, reason: 'missing_receipt' };

  const receiptHash = normalizePaymentTransactionHash(receipt.hash);
  const expectedHash = normalizePaymentTransactionHash(expectedTransactionHash);
  if (!receiptHash || !expectedHash || receiptHash !== expectedHash) {
    return { valid: false, reason: 'wrong_transaction' };
  }

  if (receipt.status !== 1) {
    return { valid: false, reason: 'failed_transaction' };
  }

  if (!Number.isSafeInteger(minimumBlockNumber) || receipt.blockNumber < minimumBlockNumber) {
    return { valid: false, reason: 'before_session' };
  }

  return { valid: true, blockNumber: receipt.blockNumber };
};

export const collectUsedPaymentTransactionHashes = (
  sessions: ReadonlyArray<{ transactionHash?: string }>
): Set<string> => {
  const hashes = new Set<string>();

  sessions.forEach((session) => {
    if (!session.transactionHash) return;
    const normalizedHash = normalizePaymentTransactionHash(session.transactionHash);
    if (normalizedHash) hashes.add(normalizedHash);
  });

  return hashes;
};

export const parseUsedPaymentTransactionHashes = (serialized: string | null): Set<string> => {
  if (!serialized) return new Set();

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return new Set();
    return collectUsedPaymentTransactionHashes(
      parsed.map((transactionHash) => ({
        transactionHash: typeof transactionHash === 'string' ? transactionHash : undefined,
      }))
    );
  } catch {
    return new Set();
  }
};

export const serializeUsedPaymentTransactionHashes = (
  transactionHashes: ReadonlySet<string>
): string => JSON.stringify(
  [...transactionHashes]
    .map(normalizePaymentTransactionHash)
    .filter((hash): hash is string => Boolean(hash))
    .sort()
);
export const isVerifiedPaymentSession = (
  session: VerifiablePaymentSession | null | undefined
): boolean => {
  if (
    !session ||
    session.status !== 'completed' ||
    session.verificationStatus !== 'verified' ||
    !normalizePaymentTransactionHash(session.transactionHash || '') ||
    !normalizeAddress(session.payerAddress || '') ||
    !normalizeAddress(session.tokenContractAddress || '') ||
    !normalizeAddress(session.recipientAddress || '')
  ) {
    return false;
  }

  try {
    return BigInt(session.expectedAmountBaseUnits || '') > 0n;
  } catch {
    return false;
  }
};