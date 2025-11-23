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
    console.log('  Ethereum object available:', !!window.ethereum);
    console.log('  Request method:', typeof window.ethereum.request === 'function' ? '✅ Available' : '❌ No request method');
  } else {
    console.log('  ❌ No wallet detected');
  }

  // RainbowKit接続状態の確認
  console.log('🔄 Connection Status Check:');
  try {
    console.log('  Document ready:', document.readyState);
    console.log('  Window loaded:', document.readyState === 'complete');
  } catch (e) {
    console.log('  Document check error:', e);
  }
};

// MetaMask接続のテストヘルパー
export const testMetaMaskConnection = async () => {
  console.log('🧪 Testing MetaMask Connection...');
  
  if (!window.ethereum) {
    console.error('❌ No ethereum provider found');
    return false;
  }

  try {
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    console.log('✅ MetaMask connected:', accounts[0]);
    return true;
  } catch (error) {
    console.error('❌ MetaMask connection failed:', error);
    return false;
  }
};