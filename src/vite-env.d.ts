/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PINATA_API_KEY: string;
  readonly VITE_PINATA_API_SECRET: string;
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Ethereum window type extensions
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (args: any) => void) => void;
  removeListener: (event: string, handler: (args: any) => void) => void;
  isMetaMask?: boolean;
  isConnected?: () => boolean;
}

interface Window {
  ethereum?: EthereumProvider;
}