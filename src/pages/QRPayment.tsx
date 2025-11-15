import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Trash2, AlertCircle, Clock, CheckCircle, Monitor, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrowserProvider } from 'ethers';
import { NETWORKS, JPYC, getContractAddress, getJpycContracts } from '../config/networks';
import { DEFAULT_SHOP_INFO, getShopWalletAddress } from '../config/shop';
import { createPaymentPayload, encodePaymentPayload } from '../types/payment';
import { useWallet } from '../context/WalletContext';
import QRCodeDisplay from '../components/QRCodeDisplay';
import QRCodeWindow from '../components/QRCodeWindow';
import { getNetworkGasPrice, formatGasCostPOL, formatGasPriceGwei, isLowCostNetwork } from '../utils/gasEstimation';

interface PaymentSession {
  id: string;
  amount: number;
  currency: string;
  chainId: number;
  chainName: string;
  qrCodeData: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
  expiresAtTimestamp: number;
  createdAtBlockNumber?: number; // セッション作成時のブロック番号
  timeRemainingSeconds?: number;
  transactionHash?: string;
  detectedAt?: string;
  payerAddress?: string; // 支払者のウォレットアドレス（SBT送付先）
}

const QRPayment: React.FC = () => {
  const { address: walletAddress, chainId: currentChainId } = useWallet();
  const [amount, setAmount] = useState('');
  const [selectedChainForPayment, setSelectedChainForPayment] = useState(
    Object.values(NETWORKS)[0].chainId
  );
  const [selectedJpycContract, setSelectedJpycContract] = useState<string>(''); // 選択されたJPYCコントラクトアドレス
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([]);
  const [expiryTimeMinutes, setExpiryTimeMinutes] = useState(15); // デフォルト15分
  const [selectedSessionForWindow, setSelectedSessionForWindow] = useState<string | null>(null);
  const [estimatedGasPOL, setEstimatedGasPOL] = useState<string>('0.002275'); // デフォルト値（Polygon 35 Gwei, 65000 gas）
  const [gasPrice, setGasPrice] = useState<string>('35.00'); // デフォルト値（Polygon標準）
  const [loadingGasEstimate, setLoadingGasEstimate] = useState(false);
  const [walletPolBalance, setWalletPolBalance] = useState<bigint | null>(null);
  const [hasInsufficientGas, setHasInsufficientGas] = useState(false);

  const shopWalletAddress = getShopWalletAddress(walletAddress);
  const paymentNetwork = Object.values(NETWORKS).find(
    (net) => net.chainId === selectedChainForPayment
  );
  
  // 利用可能なJPYCコントラクトアドレス
  const availableJpycContracts = getJpycContracts(selectedChainForPayment);
  
  // 選択されたコントラクトまたは最初のコントラクトを使用
  const paymentContractAddress = selectedJpycContract || availableJpycContracts[0] || getContractAddress(
    selectedChainForPayment,
    JPYC
  );
  
  // ネットワーク変更時にJPYCコントラクトを自動選択
  useEffect(() => {
    const contracts = getJpycContracts(selectedChainForPayment);
    if (contracts.length > 0) {
      setSelectedJpycContract(contracts[0]);
    }
  }, [selectedChainForPayment]);

  const isNetworkMismatch =
    currentChainId && currentChainId !== selectedChainForPayment;

  // ガス代を計算
  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        setLoadingGasEstimate(true);
        
        if (!window.ethereum) {
          // MetaMaskがない場合はデフォルト値を使用
          const defaultGwei = '35.00';
          const defaultPOL = '0.002275'; // 65000 gas * 35 Gwei / 1e9
          setGasPrice(defaultGwei);
          setEstimatedGasPOL(defaultPOL);
          setWalletPolBalance(null);
          setHasInsufficientGas(false);
          console.log('MetaMask not available, using default gas price');
          setLoadingGasEstimate(false);
          return;
        }

        const provider = new BrowserProvider(window.ethereum);
        const currentGasPrice = await getNetworkGasPrice(selectedChainForPayment, provider);
        
        // ガス価格をGwei単位で表示
        const gasPriceGwei = formatGasPriceGwei(currentGasPrice);
        setGasPrice(gasPriceGwei);

        // ERC20トークン転送のガス消費量（概算）
        // 一般的なERC20転送は65,000 gasユニット程度
        const estimatedGasUnits = BigInt(65000);
        const totalGasCostWei = estimatedGasUnits * currentGasPrice;
        const totalGasCostPOL = formatGasCostPOL(totalGasCostWei);
        
        setEstimatedGasPOL(totalGasCostPOL);
        console.log(`ガス代計算完了: ${totalGasCostPOL} POL (${gasPriceGwei} Gwei)`);

        // ウォレットのPOL残高を取得
        if (walletAddress) {
          const balance = await provider.getBalance(walletAddress);
          setWalletPolBalance(balance);
          
          // ガス代が足りるか確認
          const hasEnoughGas = balance >= totalGasCostWei;
          setHasInsufficientGas(!hasEnoughGas);
          
          if (!hasEnoughGas) {
            const shortfall = totalGasCostWei - balance;
            console.warn(`ガス代不足: ${formatGasCostPOL(shortfall)} POL が必要です`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch gas price:', error);
        // エラーの場合はデフォルト値を設定（Polygon標準）
        const defaultGwei = '35.00';
        const defaultPOL = '0.002275'; // 65000 gas * 35 Gwei / 1e9
        setGasPrice(defaultGwei);
        setEstimatedGasPOL(defaultPOL);
        setHasInsufficientGas(false);
        console.log('Using default gas price due to error');
      } finally {
        setLoadingGasEstimate(false);
      }
    };

    // 初期ロード時とネットワーク選択時、ウォレットアドレス変更時に実行
    if (selectedChainForPayment) {
      fetchGasPrice();
    }
  }, [selectedChainForPayment, walletAddress]);
  useEffect(() => {
    const interval = setInterval(() => {
      setPaymentSessions((prev) =>
        prev.map((session) => {
          const now = Math.floor(Date.now() / 1000);
          const timeRemaining = session.expiresAtTimestamp - now;
          const newStatus =
            session.status === 'completed'
              ? ('completed' as const)
              : timeRemaining <= 0
              ? ('expired' as const)
              : session.status;
          return {
            ...session,
            status: newStatus,
            timeRemainingSeconds: Math.max(0, timeRemaining),
          };
        })
      );
    }, 1000); // 1秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  // 完了したセッション情報を LocalStorage に保存
  useEffect(() => {
    const completedSessions = paymentSessions.filter(s => s.status === 'completed' && s.payerAddress);
    if (completedSessions.length > 0) {
      localStorage.setItem('completedPaymentSessions', JSON.stringify(completedSessions));
    }
  }, [paymentSessions]);

  // トランザクション監視 - pending セッションのトランザクションを検知
  useEffect(() => {
    const monitorTransactions = async () => {
      try {
        if (!window.ethereum) return;

        // pending セッションのみ監視
        const pendingSessions = paymentSessions.filter(
          (s) => s.status === 'pending' && !s.transactionHash
        );

        if (pendingSessions.length === 0) return;

        const provider = new BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        
        console.log(`🔍 トランザクション監視中 - 接続ネットワーク: ChainID ${chainId}`);
        console.log(`   Pendingセッション数: ${pendingSessions.length}`);

        // 各 pending セッション向けのトランザクション検索
        for (const session of pendingSessions) {
          console.log(`   セッション ${session.id.slice(0, 8)}... - 期待ChainID: ${session.chainId}, 現在ChainID: ${chainId}`);
          if (session.chainId !== chainId) {
            console.warn(`   ⚠️ ネットワーク不一致: MetaMaskを ${session.chainName} (ChainID: ${session.chainId}) に切り替えてください`);
            continue; // ネットワークが一致するもののみ
          }

          try {
            // ブロックを取得してトランザクションを検索
            const latestBlockNumber = await provider.getBlockNumber();
            // セッション作成時のブロック番号以降のみを検索（過去のトランザクションを除外）
            const searchFromBlock = session.createdAtBlockNumber || Math.max(0, latestBlockNumber - 10);

            // 複数のJPYCコントラクトアドレスに対応
            const jpycContracts = getJpycContracts(chainId);
            console.log(`監視中のJPYCコントラクト (${chainId}):`, jpycContracts);

            // ERC20のTransferイベントシグネチャ: Transfer(address,address,uint256)
            const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
            
            // 店舗ウォレットアドレスをパディング（32バイト）
            const paddedShopAddress = '0x' + '0'.repeat(24) + shopWalletAddress.slice(2).toLowerCase();

            let foundTransaction = false;

            // 各JPYCコントラクトについてTransferイベントを検索
            for (const contractAddress of jpycContracts) {
              const filter = {
                address: contractAddress, // JPYCコントラクトアドレス
                fromBlock: searchFromBlock,
                toBlock: 'latest',
                topics: [
                  transferEventSignature, // Transfer event
                  null, // from (任意のアドレス)
                  paddedShopAddress, // to (店舗ウォレットアドレス)
                ],
              };

              const logs = await provider.getLogs(filter);

              // トランザクションが見つかった場合は完了とする
              if (logs.length > 0) {
                const txHash = logs[0].transactionHash;
                
                // トランザクションの詳細情報を取得
                const txDetails = await provider.getTransaction(txHash);
                const payerAddress = txDetails?.from; // トランザクション送信者（支払者）のアドレス
                
                console.log(`✓ JPYC決済検知: ${contractAddress}`);
                console.log(`  Tx: ${txHash}`);
                console.log(`  支払者: ${payerAddress}`);
                console.log(`  受取: ${shopWalletAddress}`);
                
                setPaymentSessions((prev) =>
                  prev.map((s) =>
                    s.id === session.id
                      ? {
                          ...s,
                          status: 'completed',
                          transactionHash: txHash,
                          detectedAt: new Date().toLocaleString('ja-JP'),
                          payerAddress: payerAddress, // 支払者アドレスを保存
                        }
                      : s
                  )
                );
                toast.success(`✓ 決済完了 (Tx: ${txHash.slice(0, 10)}...)`);
                foundTransaction = true;
                break; // 見つかったらループを抜ける
              }
            }

            if (!foundTransaction) {
              console.log(`監視中 (Session: ${session.id.slice(-8)}, Block: ${latestBlockNumber})`);
            }
          } catch (error) {
            console.error(`Transaction monitoring error for ${session.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Transaction monitoring error:', error);
      }
    };

    // 初回実行（即座に開始）
    monitorTransactions();
    
    const monitorInterval = setInterval(monitorTransactions, 5000); // 5秒ごとに監視
    return () => clearInterval(monitorInterval);
  }, [paymentSessions, shopWalletAddress]);

  const generateQRCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('有効な金額を入力してください');
      return;
    }

    if (!shopWalletAddress) {
      toast.error('ウォレットアドレスが設定されていません');
      return;
    }

    if (!paymentNetwork) {
      toast.error('ネットワークを選択してください');
      return;
    }

    if (!paymentContractAddress) {
      toast.error('このネットワークのコントラクトアドレスが見つかりません');
      return;
    }

    try {
      const paymentId = `PAY${Date.now()}`;
      const expiresAtTimestamp = Math.floor(Date.now() / 1000) + expiryTimeMinutes * 60;

      // 現在のブロック番号を取得
      let currentBlockNumber: number | undefined;
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          currentBlockNumber = await provider.getBlockNumber();
          console.log(`QRコード生成時のブロック番号: ${currentBlockNumber}`);
        } catch (error) {
          console.warn('ブロック番号取得エラー:', error);
        }
      }

      // Wei単位に変換（18小数点、整数値に変換）
      // JPYCは1JPYCが1円で固定されているため、小数点は不要
      const amountNum = parseInt(amount) || parseFloat(amount);
      const amountInWei = (BigInt(amountNum) * BigInt(10 ** 18)).toString();

      const payload = createPaymentPayload(
        DEFAULT_SHOP_INFO.id,
        DEFAULT_SHOP_INFO.name,
        shopWalletAddress,
        amountInWei,
        selectedChainForPayment,
        paymentContractAddress,
        expiresAtTimestamp,
        paymentId,
        `Payment from ${DEFAULT_SHOP_INFO.name}`
      );

      const encodedPayload = encodePaymentPayload(payload);

      const newSession: PaymentSession = {
        id: paymentId,
        amount: amountNum,
        currency: 'JPYC',
        chainId: selectedChainForPayment,
        chainName: paymentNetwork.displayName,
        qrCodeData: encodedPayload,
        status: 'pending',
        createdAt: new Date().toLocaleString('ja-JP'),
        expiresAt: new Date(expiresAtTimestamp * 1000).toLocaleString('ja-JP'),
        expiresAtTimestamp,
        createdAtBlockNumber: currentBlockNumber, // セッション作成時のブロック番号
        timeRemainingSeconds: expiryTimeMinutes * 60,
        transactionHash: undefined,
        detectedAt: undefined,
        payerAddress: undefined, // トランザクション検知時に設定される
      };

      setPaymentSessions([newSession, ...paymentSessions]);
      setAmount('');
      toast.success('QRコードを生成しました');
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      toast.error('QRコード生成に失敗しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('コピーしました');
  };

  const downloadQR = (paymentId: string) => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      paymentId
    )}`;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `payment-qr-${paymentId}.png`;
    link.click();
    toast.success('QRコードをダウンロードしました');
  };

  const deleteSession = (id: string) => {
    setPaymentSessions(paymentSessions.filter((s) => s.id !== id));
    toast.success('削除しました');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '待機中' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: '完了' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', label: '期限切れ' },
    };
    const s = statusMap[status as keyof typeof statusMap];
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const networkList = Object.values(NETWORKS);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <QrCode className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">QR決済</h1>
          </div>
          <p className="text-sm md:text-base text-gray-600">JPYC対応のQRコード決済を生成・管理します</p>
        </div>

        {/* メインコンテナ: QRコード表示エリアが最優先 */}
        <div className="space-y-4">
          {/* QRコード表示エリア（上部） */}
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 text-center">
              現在のQRコード
            </h2>
            
            {paymentSessions.length === 0 || !paymentSessions.some(s => s.status === 'pending') ? (
              <div className="text-center py-12">
                <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">まだQRコードを生成していません</p>
                <p className="text-xs text-gray-400">下の「設定」でQRコードを生成してください</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                {paymentSessions
                  .filter(s => s.status === 'pending')
                  .slice(0, 1)
                  .map((session) => (
                    <div key={session.id} className="w-full">
                      {/* 決済情報 */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          <div>
                            <p className="text-xs text-gray-600">金額</p>
                            <p className="text-lg md:text-xl font-bold text-blue-600">{session.amount}</p>
                            <p className="text-xs text-gray-600">JPYC</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">ネットワーク</p>
                            <p className="text-sm font-semibold text-gray-900">{session.chainName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">残り時間</p>
                            <p className={`text-lg font-bold ${
                              (session.timeRemainingSeconds || 0) < 300
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}>
                              {Math.floor((session.timeRemainingSeconds || 0) / 60)}:{String((session.timeRemainingSeconds || 0) % 60).padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* QRコード表示 */}
                      <div className="flex flex-col items-center">
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          padding: '1rem',
                          background: 'white',
                          borderRadius: '0.5rem',
                          border: '2px solid #e5e7eb',
                        }}>
                          <QRCodeDisplay
                            data={session.qrCodeData}
                            size={280}
                            errorCorrectionLevel="H"
                            onDownload={(type) => {
                              toast.success(`QRコードを${type === 'png' ? 'PNG' : 'SVG'}でダウンロードしました`);
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          スマートフォンでスキャンしてください
                        </p>
                      </div>

                      {/* 操作ボタン */}
                      <div className="flex gap-2 mt-4 flex-wrap justify-center">
                        <button
                          onClick={() => setSelectedSessionForWindow(session.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-600 text-sm rounded-lg transition font-semibold"
                        >
                          <Monitor className="w-4 h-4" /> 新規ウィンドウ
                        </button>
                        <button
                          onClick={() => copyToClipboard(session.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition"
                        >
                          <Copy className="w-4 h-4" /> ID
                        </button>
                        <button
                          onClick={() => downloadQR(session.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition"
                        >
                          <Download className="w-4 h-4" /> DL
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" /> 削除
                        </button>
                      </div>

                      {/* トランザクション監視中表示 */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                        <p className="text-xs text-blue-700 font-semibold">
                          🔍 トランザクション監視中...
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          スマートフォンからの決済トランザクションを自動検知します
                        </p>
                      </div>

                      {/* ペイロード情報 */}
                      <div className="bg-gray-50 p-3 rounded-lg mt-4">
                        <p className="text-xs text-gray-600 mb-2">ペイロード:</p>
                        <p className="text-xs text-gray-500 break-all font-mono">
                          {session.qrCodeData.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 設定エリア（下部） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 生成フォーム */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">設定</h2>
                <form onSubmit={generateQRCode} className="space-y-3">
                  {/* 支払い用ネットワーク選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      支払いネットワーク
                    </label>
                    <select
                      value={selectedChainForPayment}
                      onChange={(e) =>
                        setSelectedChainForPayment(parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {Object.values(NETWORKS).map((network) => (
                        <option key={network.chainId} value={network.chainId}>
                          {network.displayName} {network.isTestnet ? '(T)' : ''}
                        </option>
                      ))}
                    </select>
                    {paymentNetwork && (
                      <p className="text-xs text-gray-500 mt-1">
                        ChainID: {paymentNetwork.chainId}
                      </p>
                    )}
                  </div>

                  {/* JPYCコントラクトアドレス選択（複数ある場合のみ表示） */}
                  {availableJpycContracts.length > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        JPYCコントラクトアドレス
                      </label>
                      <select
                        value={selectedJpycContract}
                        onChange={(e) => setSelectedJpycContract(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                      >
                        {availableJpycContracts.map((contractAddr, index) => (
                          <option key={contractAddr} value={contractAddr}>
                            {contractAddr.slice(0, 6)}...{contractAddr.slice(-4)} (Contract {index + 1})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        選択中: {selectedJpycContract}
                      </p>
                    </div>
                  )}

                  {/* ネットワーク不一致警告 */}
                  {isNetworkMismatch && (
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg flex gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-700">
                        <p className="font-semibold">ネットワーク不一致</p>
                        <p>ウォレット: {Object.values(NETWORKS).find(n => n.chainId === currentChainId)?.displayName}</p>
                        <p>QR: {paymentNetwork?.displayName}</p>
                      </div>
                    </div>
                  )}

                  {/* 金額入力 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      金額 (JPYC)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="例: 100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* ガス代表示 */}
                  {!loadingGasEstimate && (
                    <div className={`p-3 rounded-lg border-2 ${
                      isLowCostNetwork(selectedChainForPayment)
                        ? 'bg-green-50 border-green-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isLowCostNetwork(selectedChainForPayment)
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`} />
                        <div className="flex-1 text-xs">
                          <p className={`font-semibold ${
                            isLowCostNetwork(selectedChainForPayment)
                              ? 'text-green-900'
                              : 'text-orange-900'
                          }`}>
                            ガス代推定
                          </p>
                          <p className={`${
                            isLowCostNetwork(selectedChainForPayment)
                              ? 'text-green-800'
                              : 'text-orange-800'
                          }`}>
                            {estimatedGasPOL} POL
                            {gasPrice && <span className="ml-2 text-gray-600">（{gasPrice} Gwei）</span>}
                          </p>
                          {isLowCostNetwork(selectedChainForPayment) && (
                            <p className="text-green-700 mt-1">💡 Polygonは低ガス代ネットワークです</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ガス代不足警告 */}
                  {hasInsufficientGas && walletPolBalance !== null && (
                    <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-semibold text-red-900">⚠️ ガス代が不足しています</p>
                          <p className="text-red-800 mt-1">
                            必要: {estimatedGasPOL} POL<br />
                            現在: {(walletPolBalance / BigInt(10 ** 18)).toString()} POL
                          </p>
                          <p className="text-red-700 mt-2">
                            このネットワークでQR決済を実行するにはPOLが足りません。
                            <a 
                              href="https://faucet.polygon.technology/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline font-semibold hover:text-red-900"
                            >
                              Polygon Faucet
                            </a>
                            からPOLを取得してください。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ガス代読み込み中 */}
                  {loadingGasEstimate && (
                    <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="animate-spin">⏳</div>
                        ガス代を計算中...
                      </div>
                    </div>
                  )}

                  {/* 有効期限設定 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      有効期限
                    </label>
                    <select
                      value={expiryTimeMinutes}
                      onChange={(e) => setExpiryTimeMinutes(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value={5}>5分</option>
                      <option value={10}>10分</option>
                      <option value={15}>15分</option>
                      <option value={30}>30分</option>
                      <option value={60}>60分</option>
                    </select>
                  </div>

                  {/* 生成ボタン */}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm"
                  >
                    QRコード生成
                  </button>
                </form>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">統計</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 text-xs">総生成数</p>
                  <p className="text-2xl font-bold text-gray-900">{paymentSessions.length}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">完了</p>
                  <p className="text-2xl font-bold text-green-600">
                    {paymentSessions.filter((s) => s.status === 'completed').length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">待機中</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {paymentSessions.filter((s) => s.status === 'pending').length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">期限切れ</p>
                  <p className="text-2xl font-bold text-red-600">
                    {paymentSessions.filter((s) => s.status === 'expired').length}
                  </p>
                </div>
              </div>

              {/* 店舗情報 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">店舗情報</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-gray-600">店舗名</p>
                    <p className="font-semibold text-gray-900 truncate">{DEFAULT_SHOP_INFO.name}</p>
                  </div>
                  {shopWalletAddress && shopWalletAddress !== '0x0000000000000000000000000000000000000000' && (
                    <div>
                      <p className="text-gray-600">アドレス</p>
                      <p className="font-mono text-gray-900 break-all text-xs">
                        {shopWalletAddress.slice(0, 6)}...{shopWalletAddress.slice(-4)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* セッション履歴 */}
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">セッション履歴</h2>
            {paymentSessions.length === 0 ? (
              <p className="text-gray-500 text-sm">セッションはまだありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">金額</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">ネットワーク</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">作成時刻</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">状態</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">トランザクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSessions.map((session) => (
                      <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-mono text-xs text-gray-600">{session.id.slice(-8)}</td>
                        <td className="py-2 px-2 font-semibold text-gray-900">{session.amount}</td>
                        <td className="py-2 px-2 text-gray-600">{session.chainName}</td>
                        <td className="py-2 px-2 text-xs text-gray-600">{session.createdAt.split(' ')[1]}</td>
                        <td className="py-2 px-2">{getStatusBadge(session.status)}</td>
                        <td className="py-2 px-2">
                          {session.status === 'completed' && session.transactionHash ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-mono text-green-600">
                                {session.transactionHash.slice(0, 8)}...
                              </span>
                            </div>
                          ) : session.status === 'pending' ? (
                            <span className="text-xs text-blue-600 font-semibold">監視中...</span>
                          ) : session.status === 'expired' ? (
                            <span className="text-xs text-red-600">期限切れ</span>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QRコード新規ウィンドウ表示 */}
      {selectedSessionForWindow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-auto">
            {paymentSessions
              .filter((s) => s.id === selectedSessionForWindow)
              .map((session) => (
                <QRCodeWindow
                  key={session.id}
                  sessionId={session.id}
                  qrData={session.qrCodeData}
                  amount={session.amount}
                  shopName={DEFAULT_SHOP_INFO.name}
                  chainName={session.chainName}
                  onClose={() => setSelectedSessionForWindow(null)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRPayment;
