// ========================================
// Network & Blockchain Types
// ========================================

export type ChainId = number;

export interface NetworkConfig {
  chainId: ChainId;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  jpycAddress?: string;
}

export interface ContractConfig {
  address: string;
  abi: any[];
}

// ========================================
// Shop & SBT Types
// ========================================

export interface ShopInfo {
  id: number;
  name: string;
  description: string;
  owner: string;
  requiredVisits: number;
  active: boolean;
  createdAt: string;
}

export interface SBTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface SBTToken {
  tokenId: number;
  shopId: number;
  tokenURI: string;
  owner: string;
  metadata?: SBTMetadata;
  imageUrl?: string;
}

export interface StampCard {
  shopId: number;
  shopName: string;
  currentVisits: number;
  requiredVisits: number;
  sbtTokens: SBTToken[];
  lastVisit?: Date;
}

// ========================================
// Wallet Types
// ========================================

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: ChainId | null;
  balance: string;
  provider: any;
}

export interface WalletError {
  code: number;
  message: string;
  data?: any;
}

// ========================================
// Pinata Types
// ========================================

export interface PinataConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface PinataMetadata {
  name?: string;
  description?: string;
}

// ========================================
// Payment & QR Types  
// ========================================

export interface PaymentRequest {
  amount: string;
  currency: 'JPYC' | 'ETH' | 'MATIC' | 'AVAX';
  recipient: string;
  memo?: string;
  expiryTime?: number;
  shopId?: number;
}

export interface QRCodeData {
  version: string;
  type: 'payment' | 'stamp';
  data: PaymentRequest | StampData;
  signature?: string;
}

export interface StampData {
  shopId: number;
  shopName: string;
  userAddress: string;
  timestamp: number;
  visitCount?: number;
}

// ========================================
// UI State Types
// ========================================

export interface AppState {
  wallet: WalletState;
  currentShop: ShopInfo | null;
  shops: ShopInfo[];
  stampCards: StampCard[];
  isLoading: boolean;
  error: string | null;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
  duration?: number;
}

// ========================================
// Component Props Types
// ========================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface CardProps extends BaseComponentProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: boolean;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// ========================================
// Form Types
// ========================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'file';
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
  options?: Array<{ value: string | number; label: string }>;
}

export interface ShopRegistrationForm {
  name: string;
  description: string;
  requiredVisits: number;
  stampImage: File | null;
  previewUrl?: string;
}

export interface SBTMintForm {
  recipientAddress: string;
  shopId: number;
  customMetadata?: Partial<SBTMetadata>;
}

// ========================================
// API Response Types
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

export interface TransactionResponse {
  hash: string;
  blockNumber?: number;
  gasUsed?: string;
  status: 'pending' | 'success' | 'failed';
}

// ========================================
// Utility Types
// ========================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// ========================================
// Constants Types
// ========================================

export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  POLYGON: 137,
  AVALANCHE: 43114,
  // テストネット
  SEPOLIA: 11155111,
  POLYGON_MUMBAI: 80001,
  AVALANCHE_FUJI: 43113,
} as const;

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

// ========================================
// Event Types
// ========================================

export interface SBTMintedEvent {
  to: string;
  tokenId: number;
  shopId: number;
  tokenURI: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface ShopRegisteredEvent {
  shopId: number;
  name: string;
  owner: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}