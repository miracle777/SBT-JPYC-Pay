import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Trash2, AlertCircle, Clock, CheckCircle, Monitor, Zap, User, Award, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrowserProvider, ethers } from 'ethers';
import { NETWORKS, JPYC, getContractAddress, getJpycContracts, getJpycContractMeta } from '../config/networks';
import { DEFAULT_SHOP_INFO, getShopWalletAddress, getShopInfo } from '../config/shop';
import { createPaymentPayload, encodePaymentPayload, encodePaymentPayloadForJPYCPay, encodePaymentPayloadForMetaMask } from '../types/payment';
import { useWallet } from '../context/WalletContext';
import QRCodeDisplay from '../components/QRCodeDisplay';
import QRCodeWindow from '../components/QRCodeWindow';
import WalletSelector from '../components/WalletSelector';
import { getNetworkGasPrice, formatGasCostPOL, formatGasPriceGwei, isLowCostNetwork } from '../utils/gasEstimation';
import { sbtStorage } from '../utils/storage';

// SBTテンプレート型定義
interface SBTTemplate {
  id: string;
  shopId: number;
  name: string;
  description: string;
  issuePattern: 'per_payment' | 'after_count' | 'time_period' | 'period_range';
  maxStamps: number;
  rewardDescription: string;
  imageUrl: string;
  status: 'active' | 'inactive';
}

interface SBTRecommendation {
  shouldIssue: boolean;
  milestone: number | null;
  message: string;
  matchedTemplates: SBTTemplate[];
}

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
    NETWORKS.POLYGON_AMOY.chainId  // デフォルトでPolygon Amoyを選択
  );
  const [selectedJpycContract, setSelectedJpycContract] = useState<string>(''); // 選択されたJPYCコントラクトアドレス
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([]);
  const [expiryTimeMinutes, setExpiryTimeMinutes] = useState(15); // デフォルト15分
  const [qrCodeFormat, setQrCodeFormat] = useState<'jpyc-payment' | 'metamask' | 'legacy'>('jpyc-payment'); // QRコード形式
  const [selectedSessionForWindow, setSelectedSessionForWindow] = useState<string | null>(null);
  const [estimatedGasPOL, setEstimatedGasPOL] = useState<string>('0.002275'); // デフォルト値（Polygon 35 Gwei, 65000 gas）
  const [gasPrice, setGasPrice] = useState<string>('35.00'); // デフォルト値（Polygon標準）
  const [loadingGasEstimate, setLoadingGasEstimate] = useState(false);
  const [walletPolBalance, setWalletPolBalance] = useState<bigint | null>(null);
  const [hasInsufficientGas, setHasInsufficientGas] = useState(false);
  const [customerPaymentStats, setCustomerPaymentStats] = useState<Map<string, number>>(new Map());
  const [jpycBalance, setJpycBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [lastBalanceCheck, setLastBalanceCheck] = useState<string>('');
  const [shopInfo, setShopInfo] = useState({ name: DEFAULT_SHOP_INFO.name, id: DEFAULT_SHOP_INFO.id });
  const [sbtTemplates, setSbtTemplates] = useState<SBTTemplate[]>([]);

  // 店舗情報をローカルストレージから読み込む
  useEffect(() => {
    try {
      const savedShopInfo = localStorage.getItem('shop-info');
      if (savedShopInfo) {
        const shop = JSON.parse(savedShopInfo);
        setShopInfo({
          name: shop.name || DEFAULT_SHOP_INFO.name,
          id: shop.id || DEFAULT_SHOP_INFO.id,
        });
        console.log('✅ 店舗情報読み込み完了:', shop);
      }
    } catch (error) {
      console.warn('店舗情報読み込みエラー:', error);
    }
  }, []);

  // SBTテンプレート一覧を取得
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await sbtStorage.getAllTemplates();
        // アクティブなafter_countパターンのみ抽出してmaxStampsでソート
        const activeTemplates = templates
          .filter((t: SBTTemplate) => t.status === 'active' && t.issuePattern === 'after_count')
          .sort((a: SBTTemplate, b: SBTTemplate) => a.maxStamps - b.maxStamps);
        setSbtTemplates(activeTemplates);
        console.log('📋 SBTテンプレート読み込み完了:', activeTemplates);
      } catch (error) {
        console.error('❌ SBTテンプレート取得エラー:', error);
        setSbtTemplates([]);
      }
    };
    loadTemplates();
  }, []);

  // JPYC残高を取得する関数
  const fetchJpycBalance = async () => {
    if (!walletAddress || !window.ethereum || !paymentContractAddress) {
      setJpycBalance(null);
      return;
    }

    try {
      setLoadingBalance(true);
      const provider = new BrowserProvider(window.ethereum);
      
      // ERC20コントラクトのインスタンスを作成
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
      ];
      
      const contract = new ethers.Contract(paymentContractAddress, erc20Abi, provider);
      const balance = await contract.balanceOf(walletAddress);
      const balanceContractMeta = getJpycContractMeta(selectedChainForPayment, paymentContractAddress);
      
      // Weiからトークン単位に変換
      const balanceFormatted = ethers.formatUnits(balance, balanceContractMeta.decimals);
      const balanceNumber = parseFloat(balanceFormatted);
      
      // 整数部分と小数部分を分けて表示（小数点以下2桁まで）
      setJpycBalance(balanceNumber.toLocaleString('ja-JP', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }));
      
      console.log(`${balanceContractMeta.symbol}残高: ${balanceFormatted}`);
      setLastBalanceCheck(new Date().toLocaleTimeString('ja-JP'));
    } catch (error) {
      console.error('JPYC残高取得エラー:', error);
      setJpycBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

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
  
  // 残高取得 - ウォレット、ネットワーク、コントラクトアドレス変更時に実行
  useEffect(() => {
    fetchJpycBalance();
  }, [walletAddress, selectedChainForPayment, paymentContractAddress]);

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

  // 完了したセッション情報を LocalStorage に保存と顧客統計の更新
  useEffect(() => {
    const completedSessions = paymentSessions.filter(s => s.status === 'completed' && s.payerAddress);
    if (completedSessions.length > 0) {
      localStorage.setItem('completedPaymentSessions', JSON.stringify(completedSessions));
      
      // 顧客別支払い回数を計算
      const stats = new Map<string, number>();
      completedSessions.forEach(session => {
        if (session.payerAddress) {
          const currentCount = stats.get(session.payerAddress) || 0;
          stats.set(session.payerAddress, currentCount + 1);
        }
      });
      setCustomerPaymentStats(stats);
    }
  }, [paymentSessions]);
  
  // ページロード時に保存された完了セッションから統計を復元
  useEffect(() => {
    const savedSessions = localStorage.getItem('completedPaymentSessions');
    if (savedSessions) {
      try {
        const sessions: PaymentSession[] = JSON.parse(savedSessions);
        const stats = new Map<string, number>();
        sessions.forEach(session => {
          if (session.payerAddress) {
            const currentCount = stats.get(session.payerAddress) || 0;
            stats.set(session.payerAddress, currentCount + 1);
          }
        });
        setCustomerPaymentStats(stats);
      } catch (error) {
        console.error('顧客統計の復元に失敗:', error);
      }
    }
  }, []);

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

            // 複数のJPYCコントラクトアドレスに対応（公式 + カスタムテスト用）
            const jpycContracts = getJpycContracts(chainId);
            console.log(`監視中のJPYCコントラクト (${chainId}):`, jpycContracts.map(addr => {
              const meta = getJpycContractMeta(chainId, addr);
              return `${addr} (${meta.label})`;
            }));

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
                const detectedContractMeta = getJpycContractMeta(chainId, contractAddress);
                
                console.log(`✓ JPYC決済検知: ${contractAddress} (${detectedContractMeta.label})`);
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
                
                // 決済完了音を再生（シンプルなビープ音）
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = 800; // 周波数 800Hz
                  oscillator.type = 'sine'; // サイン波
                  
                  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.3);
                } catch (error) {
                  // サウンド再生エラーは無視
                  console.log('決済音の再生に失敗:', error);
                }
                
                console.log(`🎉 決済完了通知: ${session.amount} ${(() => {
                  const contractMeta = getJpycContractMeta(chainId, contractAddress);
                  return contractMeta.symbol;
                })()} - Tx: ${txHash}`);
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
    
    const monitorInterval = setInterval(monitorTransactions, 3000); // 3秒ごとに監視（リアルタイム性向上）
    return () => clearInterval(monitorInterval);
  }, [paymentSessions, shopWalletAddress]);

  const generateQRCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('有効な金額を入力してください');
      return;
    }

    // 残高チェック（JPYC残高がある場合）
    if (jpycBalance !== null) {
      const requestAmount = parseFloat(amount);
      const currentBalance = parseFloat(jpycBalance.replace(/,/g, ''));
      
      if (requestAmount > currentBalance) {
        const contractMeta = getJpycContractMeta(selectedChainForPayment, paymentContractAddress);
        toast.error(`残高不足です。現在の${contractMeta.symbol}残高: ${jpycBalance}`);
        return;
      }
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
      // JPYCとtJPYCは1トークンが1円で固定されているため、小数点は不要
      const amountNum = parseInt(amount) || parseFloat(amount);
      const qrContractMeta = getJpycContractMeta(selectedChainForPayment, paymentContractAddress);
      const amountInWei = (BigInt(amountNum) * BigInt(10 ** qrContractMeta.decimals)).toString();

      const payload = createPaymentPayload(
        shopInfo.id,
        shopInfo.name,
        shopWalletAddress,
        amountInWei,
        selectedChainForPayment,
        paymentContractAddress,
        expiresAtTimestamp,
        paymentId,
        `Payment from ${shopInfo.name}`,
        qrContractMeta.symbol // 通貨シンボル (JPYC または tJPYC) を渡す
      );

      console.log('QRコード生成:', {
        selectedChain: selectedChainForPayment,
        networkName: paymentNetwork.displayName,
        contractAddress: paymentContractAddress,
        currencySymbol: qrContractMeta.symbol,
        amount: amountNum,
        payloadChainId: payload.chainId,
        payloadContractAddress: payload.contractAddress,
        payloadCurrency: payload.currency
      });

      // QRコード形式に応じてエンコード
      let encodedPayload: string;
      
      switch (qrCodeFormat) {
        case 'jpyc-payment':
          encodedPayload = encodePaymentPayloadForJPYCPay(payload);
          break;
        case 'metamask':
          encodedPayload = encodePaymentPayloadForMetaMask(payload);
          break;
        case 'legacy':
        default:
          encodedPayload = encodePaymentPayload(payload);
          break;
      }

      const newSession: PaymentSession = {
        id: paymentId,
        amount: amountNum,
        currency: qrContractMeta.symbol, // JPYC または tJPYC
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
      const selectedContractMeta = getJpycContractMeta(selectedChainForPayment, paymentContractAddress);
      toast.success(`QRコードを生成しました (${selectedContractMeta.label})`);
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

  // SBT発行推奨を判定する関数（動的テンプレート対応）
  const getSBTRecommendation = (paymentCount: number): SBTRecommendation => {
    if (sbtTemplates.length === 0) {
      return {
        shouldIssue: false,
        milestone: null,
        message: 'テンプレート未設定',
        matchedTemplates: []
      };
    }

    // 現在の支払回数で達成可能なテンプレートを検索
    const matchedTemplates = sbtTemplates.filter(t => t.maxStamps === paymentCount);
    
    if (matchedTemplates.length > 0) {
      return {
        shouldIssue: true,
        milestone: paymentCount,
        message: `🎊 ${paymentCount}回目達成！SBT発行可能`,
        matchedTemplates
      };
    }
    
    // 次のマイルストーンを検索
    const upcoming = sbtTemplates.find(t => t.maxStamps > paymentCount);
    if (upcoming) {
      const remaining = upcoming.maxStamps - paymentCount;
      return {
        shouldIssue: false,
        milestone: upcoming.maxStamps,
        message: `次回SBT: ${remaining}回後（${upcoming.maxStamps}回目）`,
        matchedTemplates: []
      };
    }
    
    return {
      shouldIssue: false,
      milestone: null,
      message: '🏆 全マイルストーン達成済み',
      matchedTemplates: []
    };
  };

  // 顧客アドレスの短縮表示
  const formatCustomerAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const networkList = Object.values(NETWORKS);

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
            <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">QR決済</h1>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">JPYC/tJPYC対応のQRコード決済を生成・管理します</p>
        </div>

        {/* ウォレット & ネットワーク管理 */}
        <div className="mb-6">
          <WalletSelector
            title="ウォレット & 決済ネットワーク"
            showChainSelector={true}
            onNetworkChange={(chainId) => {
              setSelectedChainForPayment(chainId);
              console.log(`🔄 決済ネットワークを変更: Chain ID ${chainId}`);
            }}
          />
        </div>
        
        {/* 2カラムレイアウト: PC/タブレットでは横並び、モバイルでは縦並び */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* QRコード表示エリア */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
              現在のQRコード
            </h2>
            
            {paymentSessions.length === 0 ? (
              <div className="text-center py-12">
                <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">まだQRコードを生成していません</p>
                <p className="text-xs text-gray-400">下の「設定」でQRコードを生成してください</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                {/* pending セッションがあればそれを表示、なければ最新のcompletedセッションを表示 */}
                {(() => {
                  const pendingSession = paymentSessions.find(s => s.status === 'pending');
                  const displaySession = pendingSession || paymentSessions.filter(s => s.status === 'completed').slice(-1)[0];
                  if (!displaySession) return null;
                  
                  return (
                    <div key={displaySession.id} className="w-full">
                      {/* 決済完了バナー（completedの場合のみ表示） */}
                      {displaySession.status === 'completed' && (
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-6 mb-4 text-center animate-pulse">
                          <div className="flex items-center justify-center gap-3 mb-2">
                            <CheckCircle className="w-8 h-8" />
                            <h3 className="text-2xl font-bold">🎉 決済完了！</h3>
                          </div>
                          <p className="text-lg font-semibold">
                            💰 {displaySession.amount} {(() => {
                              const contractMeta = getJpycContractMeta(displaySession.chainId, paymentContractAddress);
                              return contractMeta.symbol;
                            })()}
                          </p>
                          <p className="text-sm mt-2 opacity-90">
                            {displaySession.detectedAt}
                          </p>
                        </div>
                      )}

                      {(() => {
                        const session = displaySession;
                        return (<>
                      {/* 決済情報 */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                        <div className="grid grid-cols-3 gap-2 text-center mb-2 sm:mb-3">
                          <div>
                            <p className="text-xs text-gray-600">金額</p>
                            <p className="text-base sm:text-lg md:text-xl font-bold text-blue-600">{session.amount}</p>
                            <p className="text-xs text-gray-600">
                              {(() => {
                                const contractMeta = getJpycContractMeta(session.chainId, paymentContractAddress);
                                return contractMeta.symbol;
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">ネットワーク</p>
                            <p className="text-xs sm:text-sm font-semibold text-gray-900">{session.chainName}</p>
                            <p className="text-xs text-gray-500">ChainID: {session.chainId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">残り時間</p>
                            <p className={`text-base sm:text-lg font-bold ${
                              (session.timeRemainingSeconds || 0) < 300
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}>
                              {Math.floor((session.timeRemainingSeconds || 0) / 60)}:{String((session.timeRemainingSeconds || 0) % 60).padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                        {/* JPYCタイプ表示 */}
                        {(() => {
                          const contractMeta = getJpycContractMeta(session.chainId, paymentContractAddress);
                          return (
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                              <div className={`text-center text-xs px-3 py-1 rounded-full ${
                                contractMeta.type === 'official'
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-blue-100 text-blue-700 border border-blue-300'
                              }`}>
                                {contractMeta.label}
                              </div>
                              <div className={`text-center text-xs px-3 py-1 rounded-full ${
                                qrCodeFormat === 'jpyc-payment'
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : qrCodeFormat === 'metamask'
                                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                  : 'bg-gray-100 text-gray-700 border border-gray-300'
                              }`}>
                                {qrCodeFormat === 'jpyc-payment' ? '💰 masaru21QR_PAYMENT' : qrCodeFormat === 'metamask' ? '🦊 MetaMask' : '💻 Legacy'}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* QRコード表示 */}
                      <div className="flex flex-col items-center">
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          padding: '0.75rem',
                          background: 'white',
                          borderRadius: '0.5rem',
                          border: '2px solid #e5e7eb',
                        }}>
                          <QRCodeDisplay
                            data={session.qrCodeData}
                            size={Math.min(220, window.innerWidth - 160)}
                            errorCorrectionLevel="H"
                            onDownload={(type) => {
                              toast.success(`QRコードを${type === 'png' ? 'PNG' : 'SVG'}でダウンロードしました`);
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 sm:mt-3 text-center px-4">
                          {qrCodeFormat === 'jpyc-payment' ? (
                            <>
                              💰 <strong>JPYC対応アプリ</strong>でスキャンしてください<br />
                              <span className="text-gray-400">統一標準形式 | {paymentNetwork?.displayName} | {paymentContractAddress.slice(0, 8)}...</span>
                            </>
                          ) : qrCodeFormat === 'metamask' ? (
                            <>
                              🦊 <strong>MetaMaskアプリ</strong>のQRスキャンで読み取ってください<br />
                              <span className="text-gray-400">ethereum: URI形式 | ガス代: 65,000 gas</span>
                            </>
                          ) : (
                            '💻 レガシーQRコード（互換性維持用、新規非推奨）'
                          )}
                        </p>
                      </div>

                      {/* 操作ボタン */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-3 sm:mt-4 justify-center">
                        <button
                          onClick={() => setSelectedSessionForWindow(session.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-600 text-xs sm:text-sm rounded-lg transition font-semibold min-h-[44px]"
                        >
                          <Monitor className="w-4 h-4" /> <span className="hidden sm:inline">新規ウィンドウ</span><span className="sm:hidden">ウィンドウ</span>
                        </button>
                        <button
                          onClick={() => copyToClipboard(session.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg transition min-h-[44px]"
                        >
                          <Copy className="w-4 h-4" /> ID
                        </button>
                        <button
                          onClick={() => downloadQR(session.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg transition min-h-[44px]"
                        >
                          <Download className="w-4 h-4" /> DL
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs sm:text-sm rounded-lg transition min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4" /> 削除
                        </button>
                      </div>

                      {/* リアルタイム決済監視状態表示（pendingの場合のみ） */}
                      {session.status === 'pending' && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          <p className="text-sm text-blue-800 font-bold">
                            📡 リアルタイム決済監視中
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white rounded-lg p-2 border border-blue-100">
                            <p className="text-blue-600 font-semibold">監視対象</p>
                            <p className="text-blue-800">{(() => {
                              const contracts = getJpycContracts(session.chainId);
                              return `${contracts.length}個のJPYCコントラクト`;
                            })()}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-blue-100">
                            <p className="text-blue-600 font-semibold">チェック間隔</p>
                            <p className="text-blue-800">3秒ごと</p>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-700">
                            ✨ <strong>自動検知機能:</strong> スマートフォンからの決済が完了すると、
                            即座に通知・サウンドでお知らせします
                          </p>
                        </div>
                      </div>
                      )}

                      {/* ペイロード情報 */}
                      <div className="bg-gray-50 p-3 rounded-lg mt-4">
                        <p className="text-xs text-gray-600 mb-2">ペイロード詳細:</p>
                        {(() => {
                          try {
                            const payloadObj = JSON.parse(session.qrCodeData);
                            return (
                              <div className="text-xs text-gray-500 space-y-1">
                                <div><strong>ChainID:</strong> {payloadObj.chainId}</div>
                                <div><strong>Contract:</strong> {payloadObj.contractAddress.slice(0, 10)}...{payloadObj.contractAddress.slice(-8)}</div>
                                <div><strong>Shop:</strong> {payloadObj.shopWallet.slice(0, 8)}...{payloadObj.shopWallet.slice(-6)}</div>
                                <div><strong>Amount:</strong> {payloadObj.amount} Wei</div>
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-blue-600">完全なペイロード</summary>
                                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32 font-mono">
                                    {JSON.stringify(payloadObj, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            );
                          } catch (e) {
                            return (
                              <p className="text-xs text-gray-500 break-all font-mono">
                                {session.qrCodeData.substring(0, 80)}...
                              </p>
                            );
                          }
                        })()}
                      </div>
                      </>);
                      })()}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 設定エリア */}
          <div className="space-y-4">
            {/* 生成フォーム */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">設定</h2>
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
                          {network.displayName} {network.isTestnet ? '（テスト用）' : '（本番用）'}
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
                        JPYCトークンタイプ
                      </label>
                      <select
                        value={selectedJpycContract}
                        onChange={(e) => setSelectedJpycContract(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        {availableJpycContracts.map((contractAddr) => {
                          const meta = getJpycContractMeta(selectedChainForPayment, contractAddr);
                          return (
                            <option key={contractAddr} value={contractAddr}>
                              {meta.label} ({meta.symbol})
                            </option>
                          );
                        })}
                      </select>
                      {selectedJpycContract && (() => {
                        const meta = getJpycContractMeta(selectedChainForPayment, selectedJpycContract);
                        return (
                          <div className="mt-2 space-y-2">
                            {/* 基本情報 */}
                            <div className={`p-2 rounded-lg text-xs ${
                              meta.type === 'official' 
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-blue-50 border border-blue-200 text-blue-700'
                            }`}>
                              <p className="font-semibold">{meta.description}</p>
                              <p className="mt-1">
                                <span className="font-semibold">シンボル:</span> {meta.symbol} | 
                                <span className="font-semibold">小数点:</span> {meta.decimals}
                              </p>
                              <p className="font-mono text-xs mt-1 text-gray-600">
                                {selectedJpycContract}
                              </p>
                            </div>
                            
                            {/* デバッグ注意（カスタムテスト用の場合のみ） */}
                            {meta.debugNote && (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs text-yellow-800 font-semibold">
                                  {meta.debugNote}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                      金額 ({selectedJpycContract ? (() => {
                        const meta = getJpycContractMeta(selectedChainForPayment, selectedJpycContract);
                        return meta.symbol;
                      })() : 'JPYC'})
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

                  {/* QRコード形式選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      QRコード形式
                    </label>
                    <select
                      value={qrCodeFormat}
                      onChange={(e) => setQrCodeFormat(e.target.value as 'jpyc-payment' | 'metamask' | 'legacy')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="jpyc-payment">💰 masaru21QR_PAYMENT (統一標準形式)</option>
                      <option value="metamask">🦊 MetaMask QR対応 (ethereum: URI)</option>
                      <option value="legacy">💻 レガシー形式 (payment)</option>
                    </select>
                    <div className="mt-2">
                      {qrCodeFormat === 'jpyc-payment' ? (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                          <p className="font-semibold">💰 masaru21QR_PAYMENT 統一標準形式</p>
                          <p>jpyc-pay.app や全てのJPYCアプリで対応、テスト・本番統一</p>
                          <p className="mt-1">✅ ネットワーク: {paymentNetwork?.displayName}</p>
                          <p>✅ コントラクト: {paymentContractAddress.slice(0, 10)}...{paymentContractAddress.slice(-8)}</p>
                        </div>
                      ) : qrCodeFormat === 'metamask' ? (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                          <p className="font-semibold">🦊 MetaMask QR機能</p>
                          <p>MetaMaskアプリのQRスキャンで直接トランザクション実行</p>
                          <p className="mt-1 font-mono text-orange-600">ethereum:{paymentContractAddress.slice(0, 10)}...@{selectedChainForPayment}</p>
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                          <p className="font-semibold">💻 レガシー形式</p>
                          <p>互換性維持用の旧payment形式（新規開発非推奨）</p>
                        </div>
                      )}
                    </div>
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

              {/* 統計情報 */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">統計</h2>
                {jpycBalance !== null && (
                  <button
                    onClick={fetchJpycBalance}
                    disabled={loadingBalance}
                    className={`text-xs px-2 py-1 rounded-lg transition ${
                      loadingBalance 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                    }`}
                  >
                    {loadingBalance ? '更新中...' : '残高更新'}
                  </button>
                )}
              </div>
              
              {/* JPYC残高表示 */}
              {walletAddress && paymentContractAddress && (
                <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-600 font-semibold">
                      {(() => {
                        const meta = getJpycContractMeta(selectedChainForPayment, paymentContractAddress);
                        return `${meta.symbol}残高`;
                      })()} 💰
                    </p>
                    {lastBalanceCheck && (
                      <p className="text-xs text-gray-500">
                        {lastBalanceCheck}更新
                      </p>
                    )}
                  </div>
                  {loadingBalance ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin text-blue-600">⏳</div>
                      <p className="text-sm text-blue-600">残高確認中...</p>
                    </div>
                  ) : jpycBalance !== null ? (
                    <div>
                      <p className="text-2xl font-bold text-green-600 mb-1">
                        {jpycBalance}
                      </p>
                      <p className="text-xs text-gray-600">
                        {(() => {
                          const meta = getJpycContractMeta(selectedChainForPayment, paymentContractAddress);
                          const network = paymentNetwork;
                          
                          if (network?.isTestnet) {
                            return meta.type === 'custom-test' ? 'テスト用トークン（独自）' : '公式テストトークン';
                          } else {
                            return meta.type === 'custom-test' ? 'カスタムトークン' : '公式トークン';
                          }
                        })()} | {paymentNetwork?.displayName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">残高取得できません</p>
                  )}
                </div>
              )}
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
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
                    <p className="font-semibold text-gray-900 truncate">{shopInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">店舗ID</p>
                    <p className="font-semibold text-gray-900 truncate text-xs font-mono">{shopInfo.id}</p>
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
        </div>

        {/* セッション履歴 */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">💳 支払い完了一覧</h2>
              <div className="flex items-center gap-2">
                {paymentSessions.filter(s => s.status === 'completed').length > 0 && (
                  <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                    {paymentSessions.filter(s => s.status === 'completed').length} 件完了
                  </div>
                )}
                {paymentSessions.filter(s => s.status === 'pending').length > 0 && (
                  <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold animate-pulse">
                    {paymentSessions.filter(s => s.status === 'pending').length} 件監視中
                  </div>
                )}
              </div>
            </div>
            {paymentSessions.filter(s => s.status === 'completed').length === 0 ? (
              <p className="text-gray-500 text-sm">完了した支払いはまだありません</p>
            ) : (
              <div className="space-y-4">
                {/* 顧客別統計サマリー */}
                {customerPaymentStats.size > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                      <User className="w-4 h-4 text-purple-600" />
                      顧客別支払い統計
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from(customerPaymentStats.entries())
                        .sort(([,a], [,b]) => b - a) // 支払い回数の多い順
                        .slice(0, 6) // 上位6件まで表示
                        .map(([address, count]) => {
                          const recommendation = getSBTRecommendation(count);
                          return (
                            <div key={address} className={`p-3 rounded-lg border-2 ${
                              recommendation.shouldIssue 
                                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md' 
                                : 'bg-white border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-gray-600">
                                  {formatCustomerAddress(address)}
                                </span>
                                {recommendation.shouldIssue && (
                                  <Award className="w-5 h-5 text-green-600 animate-pulse" />
                                )}
                              </div>
                              <div className="text-lg font-bold text-gray-900 mb-1">
                                {count}回
                              </div>
                              <div className={`text-xs font-semibold mb-2 ${
                                recommendation.shouldIssue 
                                  ? 'text-green-700' 
                                  : 'text-gray-600'
                              }`}>
                                {recommendation.message}
                              </div>

                              {/* 達成したSBTテンプレートを表示 */}
                              {recommendation.shouldIssue && recommendation.matchedTemplates && recommendation.matchedTemplates.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {recommendation.matchedTemplates.map((template: SBTTemplate) => (
                                    <div key={template.id} className="bg-white rounded-lg border border-green-300 p-2">
                                      <div className="flex items-center gap-2 mb-2">
                                        {template.imageUrl && (
                                          <img 
                                            src={template.imageUrl} 
                                            alt={template.name}
                                            className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold text-gray-900 truncate">
                                            🎁 {template.name}
                                          </p>
                                          <p className="text-xs text-gray-600 truncate">
                                            {template.description}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          // SBT発行処理へ遷移（SBTManagementページへ）
                                          toast.success(`${template.name}の発行準備完了！`);
                                          window.location.href = `/sbt-management?template=${template.id}&recipient=${address}`;
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1"
                                      >
                                        <Award className="w-3 h-3" />
                                        SBT発行
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                    {customerPaymentStats.size > 6 && (
                      <p className="text-xs text-gray-600 mt-3 text-center">
                        他 {customerPaymentStats.size - 6} 名の顧客
                      </p>
                    )}
                  </div>
                )}
                
                {/* 詳細な支払い履歴テーブル */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <h3 className="bg-gray-50 px-4 py-3 font-semibold text-gray-900 border-b border-gray-200">
                    詳細履歴
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">
                            <Hash className="w-4 h-4 inline mr-1" />ID
                          </th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">金額</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">
                            <User className="w-4 h-4 inline mr-1" />顧客
                          </th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">支払回数</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">SBT推奨</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">完了時刻</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">Tx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentSessions
                          .filter(s => s.status === 'completed' && s.payerAddress)
                          .sort((a, b) => new Date(b.detectedAt || '').getTime() - new Date(a.detectedAt || '').getTime())
                          .map((session, index) => {
                            const paymentCount = customerPaymentStats.get(session.payerAddress!) || 0;
                            const recommendation = getSBTRecommendation(paymentCount);
                            const isRecent = index === 0; // 最新の決済を強調
                            
                            return (
                              <tr key={session.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                                recommendation.shouldIssue ? 'bg-green-50' : ''
                              } ${isRecent ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-l-orange-400' : ''}`}>
                                <td className="py-3 px-3 font-mono text-xs text-gray-600">
                                  {session.id.slice(-8)}
                                  {isRecent && (
                                    <div className="text-xs text-orange-600 font-bold mt-1">
                                      🆕 最新
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-semibold text-gray-900">
                                  {session.amount} {session.currency}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-mono text-xs text-gray-700">
                                    {formatCustomerAddress(session.payerAddress!)}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold ${
                                      recommendation.shouldIssue ? 'text-green-600' : 'text-gray-900'
                                    }`}>
                                      {paymentCount}
                                    </span>
                                    <span className="text-xs text-gray-600">回目</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  {recommendation.shouldIssue ? (
                                    <div className="flex items-center gap-1">
                                      <Award className="w-4 h-4 text-green-600" />
                                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                        {recommendation.milestone}回達成！
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      {recommendation.message.replace('次回SBT: ', '').replace('🏆 ', '')}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-xs text-gray-600">
                                  {session.detectedAt ? session.detectedAt.split(' ')[1] : session.createdAt.split(' ')[1]}
                                </td>
                                <td className="py-3 px-3">
                                  {session.transactionHash ? (
                                    <a
                                      href={`${paymentSessions.find(s => s.chainId === session.chainId) ? 
                                        Object.values(NETWORKS).find(n => n.chainId === session.chainId)?.blockExplorerUrl : 
                                        '#'
                                      }/tx/${session.transactionHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      {session.transactionHash.slice(0, 6)}...
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-500">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* セッション履歴（全ステータス） */}
                <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <summary className="bg-gray-50 px-4 py-3 font-semibold text-gray-900 cursor-pointer hover:bg-gray-100">
                    全セッション履歴 ({paymentSessions.length}件)
                  </summary>
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
                </details>
              </div>
            )}
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
                  shopName={shopInfo.name}
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
