import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Trash2, AlertCircle, Clock, CheckCircle, Monitor, Zap, User, Award, Hash, Network, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrowserProvider, ethers } from 'ethers';
import { NETWORKS, JPYC, getContractAddress, getJpycContracts, getJpycContractMeta } from '../config/networks';
import { DEFAULT_SHOP_INFO, getShopWalletAddress, getShopInfo } from '../config/shop';
import { createPaymentPayload, encodePaymentPayload, encodePaymentPayloadForJPYCPay, encodePaymentPayloadForMetaMask } from '../types/payment';
import { useWallet } from '../context/WalletContext';
import { useAccount, useSwitchChain } from 'wagmi'; // RainbowKitのフックを追加
import QRCodeDisplay from '../components/QRCodeDisplay';
import WalletSelector from '../components/WalletSelector';
import { getNetworkGasPrice, formatGasCostPOL, formatGasPriceGwei, isLowCostNetwork } from '../utils/gasEstimation';
import { sbtStorage } from '../utils/storage';
import { isGaslessAvailable } from '../utils/gaslessPayment';

// ウォレットアドレスを省略表示する関数 (0x1234...5678 形式)
const shortenAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

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
  periodStartDate?: string; // 期間限定の開始日 (YYYY-MM-DD)
  periodEndDate?: string; // 期間限定の終了日 (YYYY-MM-DD)
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
  // RainbowKitのウォレット情報を優先的に使用
  const { address: rainbowAddress, chainId: rainbowChainId, isConnected: rainbowConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  
  // 独自のWalletContextもフォールバックとして保持
  const { address: contextAddress, chainId: contextChainId } = useWallet();
  
  // RainbowKitの情報を優先、なければWalletContextを使用
  const walletAddress = rainbowAddress || contextAddress;
  const currentChainId = rainbowChainId || contextChainId;
  
  const [amount, setAmount] = useState('');
  const [selectedChainForPayment, setSelectedChainForPayment] = useState(
    NETWORKS.ETHEREUM_SEPOLIA.chainId  // デフォルトでSepoliaテストネットを選択
  );
  const [selectedJpycContract, setSelectedJpycContract] = useState<string>(''); // 選択されたJPYCコントラクトアドレス
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([]);
  const [expiryTimeMinutes, setExpiryTimeMinutes] = useState(5); // デフォルト5分
  const [qrCodeFormat, setQrCodeFormat] = useState<'jpyc-payment' | 'metamask' | 'legacy'>('jpyc-payment'); // QRコード形式
  const [notificationVolume, setNotificationVolume] = useState(0.7); // 決済音の音量(0.0-1.0)
  const [qrWindowRef, setQrWindowRef] = useState<Window | null>(null); // 新規ウィンドウの参照
  const [dualScreenMode, setDualScreenMode] = useState(false); // 2画面モード(QRコード発行時に自動で新規ウィンドウを開く)
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('all'); // 'all' = 全テンプレート, それ以外 = 特定テンプレートID
  
  // 支払いセッションごとのSBT発行ステータス管理
  // Map<sessionId, Map<templateId, { status: 'issuing' | 'completed' | 'error', message: string, transactionHash?: string }>>
  const [paymentSBTStatus, setPaymentSBTStatus] = useState<Map<string, Map<string, { 
    status: 'issuing' | 'completed' | 'error'; 
    message: string; 
    transactionHash?: string 
  }>>>(new Map());

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
        console.log('📦 IndexedDBから取得した全テンプレート:', templates);
        
        // アクティブなテンプレートを抽出（全パターン対応）
        const activeTemplates = templates
          .filter((t: SBTTemplate) => {
            const isActive = t.status === 'active';
            
            if (!isActive) {
              console.log(`❌ フィルター除外 (非アクティブ): ${t.name} (ID: ${t.id})`);
            }
            
            return isActive;
          })
          .sort((a: SBTTemplate, b: SBTTemplate) => a.maxStamps - b.maxStamps);
        
        setSbtTemplates(activeTemplates);
        console.log('✅ QR決済ページで使用可能なテンプレート:', activeTemplates);
        console.log(`📊 全 ${templates.length} 件中 ${activeTemplates.length} 件が表示対象`);
      } catch (error) {
        console.error('❌ SBTテンプレート取得エラー:', error);
        setSbtTemplates([]);
      }
    };
    loadTemplates();

    // ページがフォーカスされたときにもテンプレートを再読み込み
    const handleFocus = () => {
      console.log('🔄 ページフォーカス検出 - テンプレート再読み込み');
      loadTemplates();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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

  const isNetworkMismatch = Boolean(
    currentChainId && currentChainId !== selectedChainForPayment
  );

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
  
  // ページロード時に保存された完了セッションと統計を復元
  useEffect(() => {
    const savedSessions = localStorage.getItem('completedPaymentSessions');
    if (savedSessions) {
      try {
        const sessions: PaymentSession[] = JSON.parse(savedSessions);
        
        // セッションを復元(既存のセッションとマージ)
        setPaymentSessions(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newSessions = sessions.filter(s => !existingIds.has(s.id));
          return [...prev, ...newSessions];
        });
        
        // 統計を復元
        const stats = new Map<string, number>();
        sessions.forEach(session => {
          if (session.payerAddress) {
            const currentCount = stats.get(session.payerAddress) || 0;
            stats.set(session.payerAddress, currentCount + 1);
          }
        });
        setCustomerPaymentStats(stats);
        
        console.log(`✅ 決済履歴を復元: ${sessions.length}件`);
      } catch (error) {
        console.error('決済履歴の復元に失敗:', error);
      }
    }
    
    // SBT発行ステータスを復元
    const savedSBTStatus = localStorage.getItem('payment-sbt-status');
    if (savedSBTStatus) {
      try {
        const data = JSON.parse(savedSBTStatus);
        const statusMap = new Map<string, Map<string, { status: 'issuing' | 'completed' | 'error'; message: string; transactionHash?: string }>>();
        
        Object.entries(data).forEach(([sessionId, templates]: [string, any]) => {
          const templateMap = new Map<string, { status: 'issuing' | 'completed' | 'error'; message: string; transactionHash?: string }>();
          Object.entries(templates).forEach(([templateId, status]: [string, any]) => {
            templateMap.set(templateId, status);
          });
          statusMap.set(sessionId, templateMap);
        });
        
        setPaymentSBTStatus(statusMap);
        console.log(`✅ SBT発行ステータスを復元: ${Object.keys(data).length}セッション`);
      } catch (error) {
        console.error('SBT発行ステータスの復元に失敗:', error);
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
                
                // 決済完了音を再生（音量調整可能）
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = 800; // 周波数 800Hz
                  oscillator.type = 'sine'; // サイン波
                  
                  gainNode.gain.setValueAtTime(notificationVolume, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.3);
                } catch (error) {
                  // サウンド再生エラーは無視
                  console.log('決済音の再生に失敗:', error);
                }
                
                // ブラウザ通知を表示
                try {
                  if ('Notification' in window && Notification.permission === 'granted') {
                    const contractMeta = getJpycContractMeta(chainId, contractAddress);
                    new Notification('💰 決済完了！', {
                      body: `${session.amount} ${contractMeta.symbol} の支払いを受け付けました`,
                      icon: '/images/jpyc-logo.svg',
                      tag: 'payment-complete',
                    });
                  } else if ('Notification' in window && Notification.permission === 'default') {
                    // 通知の許可をリクエスト
                    Notification.requestPermission();
                  }
                } catch (error) {
                  console.log('通知の表示に失敗:', error);
                }
                
                // 新規ウィンドウに通知を表示
                if (qrWindowRef && !qrWindowRef.closed) {
                  try {
                    const contractMeta = getJpycContractMeta(chainId, contractAddress);
                    const notification = qrWindowRef.document.createElement('div');
                    notification.style.cssText = `
                      position: fixed;
                      top: 20px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                      color: white;
                      padding: 20px 30px;
                      border-radius: 12px;
                      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                      font-size: 20px;
                      font-weight: bold;
                      z-index: 9999;
                      animation: slideDown 0.5s ease-out;
                    `;
                    notification.innerHTML = `🎉 決済完了！<br/><span style="font-size: 24px;">${session.amount} ${contractMeta.symbol}</span>`;
                    qrWindowRef.document.body.appendChild(notification);
                    
                    // 5秒後に自動的に削除
                    setTimeout(() => {
                      if (notification.parentNode) {
                        notification.remove();
                      }
                    }, 5000);
                  } catch (error) {
                    console.log('新規ウィンドウへの通知表示に失敗:', error);
                  }
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

    console.log('🎯 QRコード生成開始 - 現在の設定:', {
      selectedChainForPayment,
      selectedChainName: paymentNetwork?.displayName,
      currentChainId,
      currentChainName: Object.values(NETWORKS).find(n => n.chainId === currentChainId)?.displayName,
      paymentContractAddress,
      selectedJpycContract,
      isNetworkMismatch
    });

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('有効な金額を入力してください');
      return;
    }

    // 🔄 支払いを受ける側（店舗側）なので、残高チェックは不要
    // お客様が支払う時に、お客様の残高がチェックされます

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

    // ⚠️ ウォレットの接続ネットワークと支払いネットワークの一致確認
    if (currentChainId && currentChainId !== selectedChainForPayment) {
      const currentNet = Object.values(NETWORKS).find(n => n.chainId === currentChainId);
      const selectedNet = Object.values(NETWORKS).find(n => n.chainId === selectedChainForPayment);
      
      toast.error(
        `ネットワークが一致しません。\n現在のウォレット: ${currentNet?.displayName || 'Unknown'}\n選択された支払いネットワーク: ${selectedNet?.displayName || 'Unknown'}\n\nウォレットのネットワークを切り替えてください。`,
        { duration: 5000 }
      );
      
      console.error('❌ ネットワーク不一致:', {
        walletChainId: currentChainId,
        walletNetwork: currentNet?.displayName,
        selectedChainId: selectedChainForPayment,
        selectedNetwork: selectedNet?.displayName
      });
      
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

      // ⚠️ 重要: チェーン情報の一致確認
      if (payload.chainId !== selectedChainForPayment) {
        console.error('❌ チェーンID不一致エラー:', {
          expected: selectedChainForPayment,
          actual: payload.chainId
        });
        toast.error('ネットワーク設定エラー: チェーンIDが一致しません');
        return;
      }

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

      console.log('📋 エンコード後のペイロード:', {
        format: qrCodeFormat,
        payloadLength: encodedPayload?.length || 0,
        payload: encodedPayload,
        payloadPreview: encodedPayload?.substring(0, 100) + '...'
      });

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
      
      console.log('✅ QRコード生成完了:', {
        sessionId: newSession.id,
        chainId: newSession.chainId,
        chainName: newSession.chainName,
        amount: newSession.amount,
        currency: newSession.currency,
        format: qrCodeFormat,
        dualScreenMode
      });
      
      toast.success(`QRコードを生成しました (${selectedContractMeta.label})`);
      
      // 🖥️ 2画面モードがONの場合、自動で新規ウィンドウを開く
      if (dualScreenMode) {
        setTimeout(() => {
          openQRWindow(newSession);
        }, 300); // QRコード生成後少し待ってから開く
      }
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      toast.error('QRコード生成に失敗しました');
    }
  };

  // 新規ウィンドウでQRコードを開く関数
  const openQRWindow = (session: PaymentSession) => {
    console.log('🪟 新規ウィンドウ表示 - セッション情報:', {
      sessionId: session.id,
      chainId: session.chainId,
      chainName: session.chainName,
      amount: session.amount,
      currency: session.currency,
      contractAddress: (() => {
        try {
          const parsed = JSON.parse(session.qrCodeData);
          return parsed.contractAddress || parsed.contract_address || 'N/A';
        } catch {
          return 'parse error';
        }
      })()
    });
    
    // 新しいウィンドウで開く(別タブではなく別ウィンドウ)
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    
    // QRコード表示用HTMLを生成（JPYCロゴ入りQRコード）
    const qrWindow = window.open('', 'QRCodeWindow', features);
    if (qrWindow) {
      // HTMLを直接書き込み
      qrWindow.document.open();
      qrWindow.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QRコード - ${shopInfo.name}</title>
  <script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js"><\/script>
  <style>
    body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}
    .container{background:white;border-radius:20px;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;max-width:90%}
    h1{color:#333;margin:0 0 10px 0;font-size:24px}
    .shop-name{color:#667eea;font-size:18px;margin-bottom:20px}
    .qr-container{background:white;padding:20px;border-radius:15px;display:inline-block;margin:20px 0;min-width:350px;min-height:350px;display:flex;align-items:center;justify-content:center}
    .amount{font-size:32px;font-weight:bold;color:#667eea;margin:15px 0}
    .network{color:#666;font-size:14px;margin-top:10px}
    .close-btn{background:#ef4444;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}
    .close-btn:hover{background:#dc2626}
    #qrCanvas{border:1px solid #e5e7eb}
    .loading{color:#667eea;font-size:14px}
  </style>
</head>
<body>
  <div class="container">
    <h1>💰 QR決済</h1>
    <div class="shop-name">${shopInfo.name}</div>
    <div class="qr-container">
      <canvas id="qrCanvas"></canvas>
      <div id="loading" class="loading">QRコード生成中...</div>
    </div>
    <div class="amount">${session.amount} ${session.currency}</div>
    <div class="network">📡 ${session.chainName}</div>
    <button class="close-btn" onclick="window.close()">✕ 閉じる</button>
  </div>
  <script>
    window.addEventListener('load',function(){
      const qrData=${JSON.stringify(session.qrCodeData)};
      const canvas=document.getElementById('qrCanvas');
      const loading=document.getElementById('loading');
      if(!canvas){console.error('Canvas要素が見つかりません');return}
      if(typeof QRCode==='undefined'){console.error('QRCodeライブラリ未読み込み');if(loading){loading.textContent='エラー: ライブラリ未読み込み';loading.style.color='red'}return}
      try{
        const payloadObj=JSON.parse(qrData);
        console.log('📝QRペイロード:',{chainId:payloadObj.chainId,network:payloadObj.network,amount:payloadObj.amount,currency:payloadObj.currency,contract:payloadObj.contractAddress||payloadObj.token});
      }catch(e){console.log('QRデータ長:',qrData.length)}
      QRCode.toCanvas(canvas,qrData,{errorCorrectionLevel:'H',margin:2,width:350,color:{dark:'#000000',light:'#FFFFFF'}},function(error){
        if(error){console.error('QRコード生成エラー:',error);if(loading){loading.textContent='エラー: '+error.message;loading.style.color='red'}return}
        console.log('✅QRコード生成成功');
        if(loading)loading.style.display='none';
        const ctx=canvas.getContext('2d');
        const logo=new Image();
        logo.crossOrigin='anonymous';
        logo.onload=function(){
          const logoSize=canvas.width*0.2;
          const logoX=(canvas.width-logoSize)/2;
          const logoY=(canvas.height-logoSize)/2;
          const padding=logoSize*0.1;
          ctx.fillStyle='white';
          ctx.fillRect(logoX-padding,logoY-padding,logoSize+padding*2,logoSize+padding*2);
          ctx.drawImage(logo,logoX,logoY,logoSize,logoSize);
          console.log('✅JPYCロゴ追加完了');
        };
        logo.onerror=function(){console.warn('⚠️ロゴ読み込み失敗:',logo.src)};
        logo.src=(window.opener?window.opener.location.origin:window.location.origin)+'/images/jpyc-logo.svg';
        console.log('📥ロゴ読み込み:',logo.src);
      });
    });
  <\/script>
</body>
</html>`);
      qrWindow.document.close();
      
      // ウィンドウの参照を保存（通知表示用）
      setQrWindowRef(qrWindow);
      
      // ウィンドウが閉じられたら参照をクリア
      const checkClosed = setInterval(() => {
        if (qrWindow.closed) {
          setQrWindowRef(null);
          clearInterval(checkClosed);
        }
      }, 1000);
    }
  };
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
  // 期間限定テンプレートの有効期間チェック
  const isTemplateValid = (template: SBTTemplate): { valid: boolean; message?: string } => {
    if (template.issuePattern === 'period_range' && template.periodStartDate && template.periodEndDate) {
      const now = new Date();
      const start = new Date(template.periodStartDate);
      const end = new Date(template.periodEndDate);
      end.setHours(23, 59, 59, 999); // 終了日は23:59:59まで有効
      
      if (now < start) {
        return { 
          valid: false, 
          message: `⏰ ${template.periodStartDate}から開始` 
        };
      }
      if (now > end) {
        return { 
          valid: false, 
          message: `⏰ 期間終了(${template.periodEndDate}まで)` 
        };
      }
      return { valid: true };
    }
    return { valid: true };
  };

  const getSBTRecommendation = (paymentCount: number): SBTRecommendation => {
    // フィルタリングされたテンプレートを取得
    const filteredTemplates = selectedTemplateId === 'all' 
      ? sbtTemplates 
      : sbtTemplates.filter(t => t.id === selectedTemplateId);
    
    if (filteredTemplates.length === 0) {
      return {
        shouldIssue: false,
        milestone: null,
        message: '📋 SBTテンプレート未設定',
        matchedTemplates: []
      };
    }

    // 期間限定テンプレートのチェック（マッチする前に確認）
    const periodTemplates = filteredTemplates.filter(t => t.issuePattern === 'period_range');
    const periodMessages: string[] = [];
    
    for (const template of periodTemplates) {
      const validation = isTemplateValid(template);
      if (validation.valid && template.maxStamps === paymentCount) {
        periodMessages.push(`✨ 期間限定「${template.name}」発行可能！(${template.periodEndDate}まで)`);
      } else if (!validation.valid && template.maxStamps === paymentCount) {
        periodMessages.push(`${validation.message} - ${template.name}`);
      }
    }

    // 現在の支払回数で達成可能なテンプレートを検索（有効期間内のみ）
    const matchedTemplates = filteredTemplates.filter(t => {
      if (t.maxStamps !== paymentCount) return false;
      const validation = isTemplateValid(t);
      return validation.valid;
    });
    
    if (matchedTemplates.length > 0) {
      // 期間限定がある場合は特別メッセージ
      const hasPeriodLimited = matchedTemplates.some(t => t.issuePattern === 'period_range');
      const baseMessage = `🎊 ${paymentCount}回目達成！SBT発行可能`;
      const periodInfo = hasPeriodLimited ? ` (期間限定含む)` : '';
      
      return {
        shouldIssue: true,
        milestone: paymentCount,
        message: baseMessage + periodInfo,
        matchedTemplates
      };
    }
    
    // マッチしなかったが期間限定テンプレートのメッセージがある場合
    if (periodMessages.length > 0) {
      return {
        shouldIssue: false,
        milestone: paymentCount,
        message: periodMessages.join(' / '),
        matchedTemplates: []
      };
    }
    
    // 次のマイルストーンを検索（有効期間内のもの優先）
    const validUpcoming = filteredTemplates.filter(t => {
      if (t.maxStamps <= paymentCount) return false;
      return isTemplateValid(t).valid;
    }).sort((a, b) => a.maxStamps - b.maxStamps);
    
    if (validUpcoming.length > 0) {
      const upcoming = validUpcoming[0];
      const remaining = upcoming.maxStamps - paymentCount;
      const isPeriodLimited = upcoming.issuePattern === 'period_range';
      const periodInfo = isPeriodLimited ? ` ⏰${upcoming.periodEndDate}まで` : '';
      
      return {
        shouldIssue: false,
        milestone: upcoming.maxStamps,
        message: `次回SBT: ${remaining}回後（${upcoming.maxStamps}回目）${periodInfo}`,
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
            onNetworkChange={async (chainId) => {
              setSelectedChainForPayment(chainId);
              console.log(`🔄 決済ネットワークを変更: Chain ID ${chainId}`);
              
              // RainbowKitのswitchChainを使用してウォレットのネットワークも切り替え
              if (switchChain && rainbowConnected) {
                try {
                  await switchChain({ chainId });
                  console.log(`✅ RainbowKit経由でネットワーク切り替え完了: ${chainId}`);
                } catch (error) {
                  console.error('❌ RainbowKit ネットワーク切り替えエラー:', error);
                }
              }
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
                {/* 選択中のネットワークと一致するセッションのみ表示 */}
                {/* pending セッションがあればそれを表示、なければ最新のcompletedセッションを表示 */}
                {(() => {
                  // 選択中のネットワークと一致するセッションのみをフィルタ
                  const matchingNetworkSessions = paymentSessions.filter(s => s.chainId === selectedChainForPayment);
                  
                  const pendingSession = matchingNetworkSessions.find(s => s.status === 'pending');
                  const displaySession = pendingSession || matchingNetworkSessions.filter(s => s.status === 'completed').slice(-1)[0];
                  
                  if (!displaySession) {
                    return (
                      <div className="text-center py-8 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <Network className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2">
                          現在のネットワーク: <strong>{paymentNetwork?.displayName}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                          このネットワークでのQRコードはまだ生成されていません
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          下の「設定」でQRコードを生成してください
                        </p>
                      </div>
                    );
                  }
                  
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
                            size={Math.min(280, window.innerWidth - 120)}
                            errorCorrectionLevel="H"
                            logoUrl="/images/jpyc-logo.svg"
                            logoSize={0.2}
                            onDownload={(type) => {
                              toast.success(`QRコードを${type === 'png' ? 'PNG' : 'SVG'}でダウンロードしました`);
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 sm:mt-3 text-center px-4">
                          {qrCodeFormat === 'jpyc-payment' ? (
                            <>
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <img src="/images/jpyc-logo.svg" alt="JPYC" className="w-5 h-5" />
                                <span><strong>JPYC対応アプリ</strong>でスキャンしてください</span>
                              </div>
                              <span className="text-gray-600">金額・トークン・ネットワーク情報を含む完全な決済QRコード</span><br />
                              <span className="text-gray-400 text-xs">統一標準形式 | {paymentNetwork?.displayName} | {paymentContractAddress.slice(0, 8)}...</span>
                            </>
                          ) : qrCodeFormat === 'metamask' ? (
                            <>
                              📋 <strong>MetaMaskアプリ</strong>でスキャン → <strong className="text-red-600">金額を手入力</strong>してください<br />
                              <span className="text-gray-600">アドレス: {shopWalletAddress.slice(0, 8)}...{shopWalletAddress.slice(-6)}</span><br />
                              <span className="text-red-600 text-xs font-semibold">⚠️ 金額 {session.amount} JPYC とトークン選択を忘れずに！</span>
                            </>
                          ) : (
                            <>
                              💻 <strong>レガシーQRコード</strong>（互換性維持用、新規非推奨）<br />
                              <span className="text-gray-400 text-xs">payment形式</span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* 操作ボタン */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-3 sm:mt-4 justify-center">
                        <button
                          onClick={() => openQRWindow(session)}
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
                      onChange={(e) => {
                        const newChainId = parseInt(e.target.value);
                        const network = Object.values(NETWORKS).find(n => n.chainId === newChainId);
                        console.log('🔄 支払いネットワーク変更:', {
                          from: selectedChainForPayment,
                          fromName: paymentNetwork?.displayName,
                          to: newChainId,
                          toName: network?.displayName
                        });
                        setSelectedChainForPayment(newChainId);
                      }}
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
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <img src="/images/jpyc-logo.svg" alt="JPYC" className="w-4 h-4" />
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

                  {/* 2画面モード切替（目立つ位置に配置） */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-2 border-purple-300 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-purple-600" />
                      <div>
                        <label htmlFor="dualScreenMode" className="text-sm font-semibold text-gray-800 cursor-pointer">
                          🖥️ 2画面モード
                        </label>
                        <p className="text-xs text-gray-600 mt-0.5">
                          QRコード生成時に自動で新規ウィンドウを表示
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="dualScreenMode"
                        checked={dualScreenMode}
                        onChange={(e) => setDualScreenMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
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
                      <option value="jpyc-payment">💰 JPYC_PAYMENT (統一標準形式) 【推奨】</option>
                      <option value="metamask">🦊 MetaMask (EIP-681形式)</option>
                      <option value="legacy">💻 レガシー形式 (payment)</option>
                    </select>
                    <div className="mt-2">
                      {qrCodeFormat === 'jpyc-payment' ? (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                          <p className="font-semibold">✅ 💰 JPYC_PAYMENT 統一標準形式【推奨】</p>
                          <p>金額・トークン・ネットワーク情報を全て含む完全な決済QRコード</p>
                          <p className="mt-1">✅ jpyc-pay.app や全てのJPYCアプリで対応</p>
                          <p>✅ ネットワーク: {paymentNetwork?.displayName}</p>
                          <p>✅ コントラクト: {paymentContractAddress.slice(0, 10)}...{paymentContractAddress.slice(-8)}</p>
                        </div>
                      ) : qrCodeFormat === 'metamask' ? (
                        <div className="p-2 bg-blue-50 border border-blue-300 rounded-lg text-xs text-blue-800">
                          <p className="font-semibold mb-1">🦊 MetaMask (EIP-681形式)</p>
                          <p className="mb-2">✅ <strong>金額・トークン・ネットワーク情報が自動入力されます</strong></p>
                          <div className="bg-blue-100 border border-blue-400 rounded p-2 mb-2">
                            <p className="font-semibold text-blue-900">利用方法:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                              <li>MetaMaskアプリでQRコードをスキャン</li>
                              <li><strong>金額・受取アドレス・トークンが自動入力される</strong></li>
                              <li>内容を確認して送信実行</li>
                            </ol>
                          </div>
                          <p className="text-blue-900">💡 <strong>EIP-681標準準拠</strong></p>
                          <p className="mt-1 font-mono text-blue-700 text-[10px]">ChainID: {selectedChainForPayment} (0x{selectedChainForPayment.toString(16)})</p>
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

                  {/* 決済音の音量調整 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🔊 決済音の音量
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={notificationVolume}
                        onChange={(e) => setNotificationVolume(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${notificationVolume * 100}%, #e5e7eb ${notificationVolume * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
                        {Math.round(notificationVolume * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      決済完了時の通知音の音量を調整できます
                    </p>
                  </div>

                  {/* 生成ボタン */}
                  <button
                    type="submit"
                    disabled={isNetworkMismatch}
                    className={`w-full font-bold py-2 px-4 rounded-lg transition duration-200 text-sm ${
                      isNetworkMismatch
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    title={isNetworkMismatch ? 'ウォレットのネットワークを支払いネットワークに切り替えてください' : ''}
                  >
                    {isNetworkMismatch ? '⚠️ ネットワークを切り替えてください' : 'QRコード生成'}
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
                    <div className="flex items-center gap-2">
                      <img src="/images/jpyc-logo.svg" alt="JPYC" className="w-5 h-5" />
                      <p className="text-xs text-gray-600 font-semibold">
                        {(() => {
                          const meta = getJpycContractMeta(selectedChainForPayment, paymentContractAddress);
                          return `${meta.symbol}残高`;
                        })()}
                      </p>
                    </div>
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
              <div className="space-y-6">
                {/* 顧客別統計サマリー */}
                {customerPaymentStats.size > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                      <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                        <User className="w-4 h-4 text-purple-600" />
                        顧客別支払い統計
                      </h3>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* テンプレート選択ドロップダウン */}
                        {sbtTemplates.length > 0 && (
                          <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="flex-1 sm:flex-none text-xs px-3 py-1.5 border border-purple-300 bg-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="all">🎯 全テンプレート</option>
                            {sbtTemplates.map(template => (
                              <option key={template.id} value={template.id}>
                                {template.name} ({template.maxStamps}回)
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {sbtTemplates.length === 0 && (
                          <a
                            href="/sbt-management"
                            className="flex items-center gap-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg transition font-semibold whitespace-nowrap"
                          >
                            <Award className="w-3 h-3" />
                            SBTテンプレート設定
                          </a>
                        )}
                        
                        {/* デバッグ: テンプレート情報確認ボタン */}
                        <button
                          onClick={() => {
                            console.log('=== SBTテンプレート情報 ===');
                            console.log('読み込み済みテンプレート数:', sbtTemplates.length);
                            console.log('テンプレート詳細:', sbtTemplates);
                            console.log('選択中のテンプレートID:', selectedTemplateId);
                            toast.success(`テンプレート ${sbtTemplates.length} 件読み込み済み (コンソール確認)`);
                          }}
                          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded-lg transition whitespace-nowrap"
                          title="コンソールにテンプレート情報を表示"
                        >
                          📋 {sbtTemplates.length}件
                        </button>
                      </div>
                    </div>
                    
                    {sbtTemplates.length === 0 ? (
                      <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs text-orange-700">
                          ⚠️ <strong>SBTテンプレートが未設定です。</strong><br />
                          SBT管理ページでテンプレートを作成すると、支払回数に応じて自動的にSBT発行を推奨します。
                        </p>
                      </div>
                    ) : selectedTemplateId !== 'all' && (
                      <div className="mb-3 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs text-purple-700">
                          🎯 <strong>フィルタリング中:</strong> {sbtTemplates.find(t => t.id === selectedTemplateId)?.name} ({sbtTemplates.find(t => t.id === selectedTemplateId)?.maxStamps}回達成で発行)
                        </p>
                      </div>
                    )}
                    
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
                
                {/* 個別決済セッション表示（SBT発行機能付き） */}
                <div className="space-y-3">
                  {paymentSessions
                    .filter(s => s.status === 'completed' && s.payerAddress)
                    .sort((a, b) => new Date(b.detectedAt || '').getTime() - new Date(a.detectedAt || '').getTime())
                    .map((session) => {
                      const paymentCount = customerPaymentStats.get(session.payerAddress!) || 0;
                      const recommendation = getSBTRecommendation(paymentCount);
                      
                      return (
                        <div key={session.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">
                                {session.amount} {session.currency} - {session.chainName}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                決済日: {session.detectedAt || session.createdAt}
                              </p>
                            </div>
                            {session.transactionHash && (
                              <a
                                href={`${Object.values(NETWORKS).find(n => n.chainId === session.chainId)?.blockExplorerUrl}/tx/${session.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Tx確認
                              </a>
                            )}
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-gray-600 mb-1">支払者アドレス</p>
                            <p className="font-mono text-sm text-gray-900" title={session.payerAddress}>
                              {shortenAddress(session.payerAddress || '')}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">
                                支払回数: {paymentCount}回目
                              </span>
                              {recommendation.shouldIssue && (
                                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                  🎊 {recommendation.milestone}回達成！
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* SBT発行セクション */}
                          {sbtTemplates.length > 0 && (
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Award className="w-5 h-5 text-purple-600" />
                                <h4 className="font-bold text-purple-900">SBT発行</h4>
                              </div>
                              
                              {/* 達成状況の表示 */}
                              {recommendation.shouldIssue ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                                  <p className="text-sm text-green-800 font-semibold">
                                    🎊 {recommendation.message}
                                  </p>
                                  <p className="text-xs text-green-700 mt-1">
                                    以下のテンプレートから選択して発行できます
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                                  <p className="text-sm text-blue-800">
                                    💡 現在 {paymentCount}回目 - {recommendation.message}
                                  </p>
                                  <p className="text-xs text-blue-700 mt-1">
                                    達成前でも任意のテンプレートで発行可能です
                                  </p>
                                </div>
                              )}
                              
                              {/* 全テンプレート選択UI */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                  📋 利用可能なテンプレート ({sbtTemplates.length}件)
                                </p>
                                {sbtTemplates.map(template => {
                                  const isRecommended = recommendation.matchedTemplates.some(t => t.id === template.id);
                                  const sbtStatus = paymentSBTStatus.get(session.id)?.get(template.id);
                                  const validationResult = isTemplateValid(template);
                                  
                                  return (
                                    <div 
                                      key={template.id} 
                                      className={`bg-white border-2 rounded-lg p-3 ${
                                        isRecommended 
                                          ? 'border-green-400 bg-green-50' 
                                          : 'border-gray-200 hover:border-purple-300'
                                      } transition`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <h5 className="font-bold text-gray-900">{template.name}</h5>
                                            {isRecommended && (
                                              <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded-full">
                                                おすすめ
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                                          <div className="flex items-center gap-2 mt-1 text-xs">
                                            <span className="text-gray-700">
                                              🎯 達成条件: {template.maxStamps}回
                                            </span>
                                            {template.issuePattern === 'period_range' && template.periodEndDate && (
                                              validationResult.valid ? (
                                                <span className="text-orange-600">
                                                  ⏰ {template.periodEndDate}まで
                                                </span>
                                              ) : (
                                                <span className="text-red-600">
                                                  {validationResult.message}
                                                </span>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* SBT発行ステータス表示 */}
                                      {sbtStatus ? (
                                        <div className="mt-2 space-y-2">
                                          {sbtStatus.status === 'issuing' && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                              <p className="text-sm text-blue-800 font-semibold">🔄 発行処理中...</p>
                                              <p className="text-xs text-blue-600 mt-1">{sbtStatus.message}</p>
                                            </div>
                                          )}
                                          {sbtStatus.status === 'completed' && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                              <p className="text-sm text-green-800 font-semibold">✅ 発行完了</p>
                                              <p className="text-xs text-green-600 mt-1">{sbtStatus.message}</p>
                                              {sbtStatus.transactionHash && (
                                                <a
                                                  href={`${Object.values(NETWORKS).find(n => n.chainId === session.chainId)?.blockExplorerUrl}/tx/${sbtStatus.transactionHash}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                                                >
                                                  SBT発行トランザクション確認
                                                </a>
                                              )}
                                            </div>
                                          )}
                                          {sbtStatus.status === 'error' && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                              <p className="text-sm text-red-800 font-semibold">❌ 発行失敗</p>
                                              <p className="text-xs text-red-600 mt-1">{sbtStatus.message}</p>
                                            </div>
                                          )}
                                          
                                          {/* ステータスリセットボタン */}
                                          <button
                                            onClick={() => {
                                              const newStatus = new Map(paymentSBTStatus);
                                              const sessionMap = newStatus.get(session.id) || new Map();
                                              sessionMap.delete(template.id);
                                              if (sessionMap.size === 0) {
                                                newStatus.delete(session.id);
                                              } else {
                                                newStatus.set(session.id, sessionMap);
                                              }
                                              setPaymentSBTStatus(newStatus);
                                              
                                              // localStorageからも削除
                                              try {
                                                const saved = localStorage.getItem('payment-sbt-status');
                                                if (saved) {
                                                  const data = JSON.parse(saved);
                                                  if (data[session.id]) {
                                                    delete data[session.id][template.id];
                                                    if (Object.keys(data[session.id]).length === 0) {
                                                      delete data[session.id];
                                                    }
                                                    localStorage.setItem('payment-sbt-status', JSON.stringify(data));
                                                  }
                                                }
                                              } catch (e) {
                                                console.error('ステータス削除エラー:', e);
                                              }
                                              
                                              toast.success('ステータスをリセットしました');
                                            }}
                                            className="w-full text-xs text-gray-600 hover:text-gray-800 underline"
                                          >
                                            ステータスをリセット
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="mt-2 space-y-2">
                                          {/* SBT管理ページで発行 */}
                                          <button
                                            onClick={() => {
                                              const params = new URLSearchParams({
                                                template: template.id,
                                                recipient: session.payerAddress!,
                                                sessionId: session.id
                                              });
                                              window.location.href = `/sbt-management?${params.toString()}`;
                                            }}
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                          >
                                            <Award className="w-4 h-4" />
                                            SBT管理ページで発行
                                          </button>
                                          
                                          {/* 手動で発行完了を記録 */}
                                          <button
                                            onClick={() => {
                                              const txHash = prompt('SBT発行トランザクションハッシュを入力してください（省略可）:');
                                              
                                              const newStatus = new Map(paymentSBTStatus);
                                              const sessionMap = newStatus.get(session.id) || new Map();
                                              sessionMap.set(template.id, {
                                                status: 'completed',
                                                message: `手動記録: ${new Date().toLocaleString('ja-JP')}`,
                                                transactionHash: txHash || undefined
                                              });
                                              newStatus.set(session.id, sessionMap);
                                              setPaymentSBTStatus(newStatus);
                                              
                                              // localStorageに保存
                                              try {
                                                const saved = localStorage.getItem('payment-sbt-status') || '{}';
                                                const data = JSON.parse(saved);
                                                if (!data[session.id]) data[session.id] = {};
                                                data[session.id][template.id] = {
                                                  status: 'completed',
                                                  message: `手動記録: ${new Date().toLocaleString('ja-JP')}`,
                                                  transactionHash: txHash || undefined
                                                };
                                                localStorage.setItem('payment-sbt-status', JSON.stringify(data));
                                              } catch (e) {
                                                console.error('ステータス保存エラー:', e);
                                              }
                                              
                                              toast.success(`${template.name}の発行完了を記録しました`);
                                            }}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                          >
                                            ✅ 手動で発行完了を記録
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {sbtTemplates.length === 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <p className="text-sm text-orange-700">
                                📋 SBTテンプレート未設定
                              </p>
                              <a
                                href="/sbt-management"
                                className="inline-block mt-2 text-sm text-orange-600 hover:text-orange-800 underline font-semibold"
                              >
                                → SBT管理ページでテンプレートを作成
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
                
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

      {/* フッター - JPYC免責事項 */}
      <footer className="mt-8 py-6 border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-start gap-3 mb-3">
            <img src="/images/jpyc-logo.svg" alt="JPYC" className="w-8 h-8 mt-1" />
            <div className="text-xs text-gray-600 leading-relaxed space-y-1">
              <p>※ 本サービス（コンテンツ・作品等）はJPYC株式会社による公式コンテンツではありません。</p>
              <p>※ 「JPYC」はJPYC株式会社の提供するステーブルコインです。</p>
              <p>※ JPYC及びJPYCロゴは、JPYC株式会社の登録商標です。</p>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 pt-3 border-t border-gray-200">
            <p>SBT masaru21 Pay(仮) &copy; 2024-2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default QRPayment;
