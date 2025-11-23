// WalletConnect接続状態のデバッグ
export const debugWalletConnect = () => {
  const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '';
  
  console.log('🐛 WalletConnect Debug:');
  console.log('  Project ID:', projectId ? `${projectId.substring(0, 8)}...` : 'Not set');
  console.log('  Environment:', import.meta.env.MODE);
  console.log('  User Agent:', navigator.userAgent);
  console.log('  Mobile:', /Mobile|Android/i.test(navigator.userAgent));
  
  if (typeof window !== 'undefined' && window.ethereum) {
    console.log('  Wallet detected:', window.ethereum.isMetaMask ? 'MetaMask' : 'Other');
  }
};