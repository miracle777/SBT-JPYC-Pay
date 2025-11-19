import React, { useState, useEffect } from 'react';
import { Award, Plus, Edit2, Trash2, Send, ExternalLink, Zap, AlertCircle, HelpCircle, Wallet, CheckCircle, Copy, Server, Shield, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../context/WalletContext';
import { sbtStorage } from '../utils/storage';
import { mintSBT, getBlockExplorerUrl, getContractOwner, getShopInfo, registerShop, getNFTDisplayUrls } from '../utils/sbtMinting';
import { NETWORKS, getNetworkByChainId } from '../config/networks';
import { getSBTContractAddress } from '../config/contracts';
import { BrowserProvider } from 'ethers';
import { getNetworkGasPrice, formatGasCostPOL, formatGasPriceGwei, isLowCostNetwork } from '../utils/gasEstimation';
import SBTCard from '../components/SBTCard';
import PWAWalletHandler from '../components/PWAWalletHandler';
import { pinataService } from '../utils/pinata';
import { formatShopIdAsHex, generateNonConflictingShopId, generateUniqueShopId } from '../utils/shopIdGenerator';
import { getShopSettings } from '../utils/shopSettings';
import WalletSelector from '../components/WalletSelector';

// ウォレットアドレスを省略表示する関数 (0x1234...5678 形式)
const shortenAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

type IssuePattern = 'per_payment' | 'after_count' | 'time_period' | 'period_range';

interface SBTTemplate {
  id: string;
  shopId: number;
  name: string;
  description: string;
  issuePattern: IssuePattern; // 'per_payment': 毎回発行 | 'after_count': N回後に発行 | 'time_period': 期間内に発行 | 'period_range': 期間指定
  maxStamps: number; // after_countパターンの場合は達成条件回数
  timePeriodDays?: number; // time_periodパターンの場合、発行対象期間（日数）
  periodStartDate?: string; // period_rangeパターンの場合、開始日（YYYY-MM-DD）
  periodEndDate?: string; // period_rangeパターンの場合、終了日（YYYY-MM-DD）
  rewardDescription: string;
  imageUrl: string; // Base64 または JPEG BLOB
  imageMimeType: string; // 'image/jpeg' など
  imageFile?: File; // 実際の画像ファイル（IPFS アップロード用）
  createdAt: string;
  status: 'active' | 'inactive';
}

interface IssuedSBT {
  id: string;
  templateId: string;
  templateName: string;
  recipientAddress: string;
  currentStamps: number;
  maxStamps: number;
  issuedAt: string;
  status: 'active' | 'redeemed';
  sourcePaymentId?: string; // 発行元のQR決済セッションID
  transactionHash?: string; // 決済トランザクションハッシュ
  sbtTransactionHash?: string; // ⭐ SBT発行トランザクションハッシュ（ブロックチェーン記録）
  sbtMintStatus?: 'pending' | 'success' | 'failed'; // SBT mint ステータス
  chainId?: number; // SBT が発行されたチェーンID
  tokenId?: number; // ⭐ ブロックチェーン上のNFT tokenId
}

// ネットワーク情報表示用ヘルパー
const getNetworkDisplayInfo = (chainId: number | null) => {
  if (!chainId) return { displayName: '未接続', isTestnet: null, contractAddress: '' };
  
  const network = getNetworkByChainId(chainId);
  const contractAddress = getSBTContractAddress(chainId);
  
  return {
    displayName: network?.displayName || `未知のネットワーク (${chainId})`,
    isTestnet: network?.isTestnet || false,
    contractAddress: contractAddress || '未デプロイ',
    chainId,
  };
};

const SBTManagement: React.FC = () => {
  const { 
    address: walletAddress, 
    chainId: currentChainId,
    isConnected,
    isPWA
  } = useWallet();
  
  // ネットワーク情報を取得
  const currentNetworkInfo = getNetworkDisplayInfo(currentChainId);
  
  // 初期テンプレート用のショップID（固定値）
  // 毎回変わらないように固定値を使用
  const initialShopIds = {
    stampCard: 1, // ショップID: 1
    milestone: 2, // ショップID: 2 
    campaign: 3,  // ショップID: 3
  };
  
  const [templates, setTemplates] = useState<SBTTemplate[]>([]);

  const [issuedSBTs, setIssuedSBTs] = useState<IssuedSBT[]>([]);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    issuePattern: 'per_payment' as IssuePattern,
    maxStamps: 10,
    timePeriodDays: 30,
    periodStartDate: '',
    periodEndDate: '',
    rewardDescription: '',
    imageUrl: '',
    imageMimeType: 'image/jpeg',
  });
  const [imagePreview, setImagePreview] = useState<string>('');

  const [newIssuance, setNewIssuance] = useState({
    templateId: templates[0]?.id || '',
    recipientAddress: '',
  });
  // completedPayments 各行のテンプレート選択状態(自動発行を防ぐために選択と発行を分離)
  const [paymentTemplateSelection, setPaymentTemplateSelection] = useState<Record<string, string>>({});
  
  // 各支払いに対するSBT発行状態を管理
  const [paymentSBTStatus, setPaymentSBTStatus] = useState<Record<string, {
    status: 'idle' | 'issuing' | 'success' | 'failed';
    message?: string;
    txHash?: string;
  }>>({});
  
  // SBT発行先ネットワーク(Polygon Mainnet または Amoy Testnet)
  // デモ・検証用としてデフォルトはPolygon Amoy(テストネット)、本番も選択可能
  const [selectedChainForSBT, setSelectedChainForSBT] = useState(80002); // デフォルトはPolygon Amoy(テストネット)
  
  // 選択されたネットワークの情報を取得
  const selectedNetworkInfo = getNetworkDisplayInfo(selectedChainForSBT);

  // ウォレットのネットワークが切り替わったときにselectedChainForSBTも同期させる
  useEffect(() => {
    if (currentChainId && currentChainId !== selectedChainForSBT) {
      console.log(`🔄 ウォレットネットワーク変更検知: ${currentChainId} (前回: ${selectedChainForSBT})`);
      setSelectedChainForSBT(currentChainId);
    }
  }, [currentChainId]);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [completedPayments, setCompletedPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estimatedSBTGasPOL, setEstimatedSBTGasPOL] = useState<string>('0.007'); // デフォルト値（Polygon 35 Gwei, 200000 gas）
  const [sbtGasPrice, setSBTGasPrice] = useState<string>('35.00'); // デフォルト値（Polygon標準）
  const [loadingSBTGasEstimate, setLoadingSBTGasEstimate] = useState(false);
  const [walletPolBalance, setWalletPolBalance] = useState<bigint | null>(null);
  const [hasInsufficientSBTGas, setHasInsufficientSBTGas] = useState(false);
  const [selectedSBT, setSelectedSBT] = useState<IssuedSBT | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  // コントラクト所有者・ショップ登録情報
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [isContractOwner, setIsContractOwner] = useState(false);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [isShopOwner, setIsShopOwner] = useState(false);
  const [showRegisterShopModal, setShowRegisterShopModal] = useState(false);
  const [isRegisteringShop, setIsRegisteringShop] = useState(false);
  
  // 📥📤 エクスポート・インポート関連
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [shopSettings, setShopSettings] = useState({ name: '', id: '', category: '', description: '' });

  // マウント時: IndexedDB + localStorage からデータを読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 初期テンプレート（常に表示される）
        const defaultTemplates = [
          {
            id: 'template-stamp-card',
            shopId: initialShopIds.stampCard,
            name: 'スタンプカード',
            description: '毎回の支払いでスタンプを1つ獲得',
            issuePattern: 'per_payment' as const,
            maxStamps: 10,
            rewardDescription: 'スタンプ1個',
            imageUrl: '/sbt-images/visit-memorial.png',
            imageMimeType: 'image/png',
            createdAt: '2025-11-14',
            status: 'active' as const,
          },
          {
            id: 'template-milestone',
            shopId: initialShopIds.milestone,
            name: 'マイルストーン達成',
            description: '10回の支払い達成時にバッジを授与',
            issuePattern: 'after_count' as const,
            maxStamps: 10,
            rewardDescription: 'ゴールド会員バッジ',
            imageUrl: '/sbt-images/milestone-10x.png',
            imageMimeType: 'image/png',
            createdAt: '2025-11-14',
            status: 'active' as const,
          },
          {
            id: 'template-campaign',
            shopId: initialShopIds.campaign,
            name: 'キャンペーン記念',
            description: 'キャンペーン期間内（30日）の支払いで期間限定メダルを取得',
            issuePattern: 'time_period' as const,
            maxStamps: 5,
            timePeriodDays: 30,
            rewardDescription: 'キャンペーン記念メダル',
            imageUrl: '/sbt-images/campaign-limited.png',
            imageMimeType: 'image/png',
            createdAt: '2025-11-14',
            status: 'active' as const,
          },
        ];
        
        // テンプレートを読み込み
        const savedTemplates = await sbtStorage.getAllTemplates();
        
        // 初期テンプレート以外のカスタムテンプレートを取得
        const customTemplates = savedTemplates.filter(template => 
          !['template-stamp-card', 'template-milestone', 'template-campaign'].includes(template.id)
        );
        
        // 初期テンプレート + カスタムテンプレートの順で結合
        const allTemplates = [...defaultTemplates, ...customTemplates];
        setTemplates(allTemplates);
        
        console.log(`✅ ${defaultTemplates.length}個の初期テンプレート + ${customTemplates.length}個のカスタムテンプレートをロード`);
        
        // 使用済みショップIDをローカルストレージに記録（重複防止用）
        try {
          const usedShopIds = allTemplates.map(t => t.shopId).filter(Boolean);
          localStorage.setItem('used-shop-ids', JSON.stringify([...new Set(usedShopIds)]));
        } catch (error) {
          console.warn('使用済みショップID保存エラー:', error);
        }

        // 発行済み SBT を読み込み
        const savedSBTs = await sbtStorage.getAllSBTs();
        if (savedSBTs.length > 0) {
          setIssuedSBTs(savedSBTs);
          console.log(`✅ ${savedSBTs.length}個の SBT をロード`);
        }

        // 完了した支払いセッションを読み込み
        const completedPayments = localStorage.getItem('completedPaymentSessions');
        if (completedPayments) {
          setCompletedPayments(JSON.parse(completedPayments));
        }

        // Pinata 接続テスト（デバッグ用）
        try {
          const isConnected = await pinataService.testAuthentication();
          if (isConnected) {
            console.log('✅ Pinata 接続成功');
          } else {
            console.warn('⚠️ Pinata 接続テスト失敗（認証エラーの可能性）');
          }
        } catch (pinataError) {
          console.warn('⚠️ Pinata 接続テストエラー:', pinataError);
        }

        // 店舗設定を読み込み
        try {
          const savedShopInfo = localStorage.getItem('shop-info');
          if (savedShopInfo) {
            const shop = JSON.parse(savedShopInfo);
            setShopSettings({
              name: shop.name || 'SBT masaru21 Pay Demo Store',
              id: shop.id || 'shop-001',
              category: shop.category || '',
              description: shop.description || 'デモンストレーション用の店舗'
            });
            console.log('✅ 店舗設定読み込み完了:', shop);
          }
        } catch (error) {
          console.warn('店舗設定読み込みエラー:', error);
        }

        // 注意: コントラクト所有者とショップオーナーのチェックは
        // useEffect (行375付近) で実行されます

        // ショップ登録状況を確認（データロード後）
        setTimeout(() => checkAndRegisterInitialShops(), 1000); // 1秒後に実行

      } catch (error) {
        console.error('データロードエラー:', error);
        toast.error('データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // SBT発行時のガス代を計算
  useEffect(() => {
    const fetchSBTGasPrice = async () => {
      try {
        setLoadingSBTGasEstimate(true);
        
        if (!window.ethereum || !currentChainId) {
          // デフォルト値を保持（Polygon標準）
          setSBTGasPrice('35.00');
          setEstimatedSBTGasPOL('0.007');
          setWalletPolBalance(null);
          setHasInsufficientSBTGas(false);
          setLoadingSBTGasEstimate(false);
          return;
        }

        const provider = new BrowserProvider(window.ethereum);
        
        // ガス価格を取得（デフォルト値優先）
        const currentGasPrice = await getNetworkGasPrice(currentChainId, provider);
        
        // ガス価格をGwei単位で表示
        const gasPriceGwei = formatGasPriceGwei(currentGasPrice);
        setSBTGasPrice(gasPriceGwei);

        // SBT Mint（ERC721）のガス消費量（概算）
        // NFTミントは150,000-250,000 gasユニット程度
        const estimatedGasUnits = BigInt(200000);
        const totalGasCostWei = estimatedGasUnits * currentGasPrice;
        const totalGasCostPOL = formatGasCostPOL(totalGasCostWei);
        
        setEstimatedSBTGasPOL(totalGasCostPOL);

        // ウォレットのPOL残高を取得
        if (walletAddress) {
          try {
            const balance = await provider.getBalance(walletAddress);
            setWalletPolBalance(balance);
            
            // ガス代が足りるか確認
            const hasEnoughGas = balance >= totalGasCostWei;
            setHasInsufficientSBTGas(!hasEnoughGas);
            
            if (!hasEnoughGas) {
              const shortfall = totalGasCostWei - balance;
              console.warn(`ℹ️ SBT発行ガス代残高チェック: ${formatGasCostPOL(shortfall)} POL が必要です`);
            }
          } catch (balanceError) {
            console.warn('ウォレット残高取得エラー:', balanceError);
            setWalletPolBalance(null);
            setHasInsufficientSBTGas(false);
          }
        }
      } catch (error) {
        console.warn('SBT ガス価格取得エラー:', error);
        // デフォルト値を設定（Polygon標準）
        setSBTGasPrice('35.00');
        setEstimatedSBTGasPOL('0.007');
        setHasInsufficientSBTGas(false);
      } finally {
        setLoadingSBTGasEstimate(false);
      }
    };

    fetchSBTGasPrice();
  }, [currentChainId, walletAddress]);

  // チェーンが変更された時、コントラクト所有者・ショップ情報を確認
  useEffect(() => {
    let isMounted = true; // クリーンアップ用フラグ
    
    const checkContractOwnership = async () => {
      if (!selectedChainForSBT) {
        console.log('⚠️ 選択チェーン未設定 - 権限無効化');
        if (isMounted) {
          setContractOwner(null);
          setIsContractOwner(false);
          setShopInfo(null);
          setIsShopOwner(false);
        }
        return;
      }

      // ウォレット未接続でも情報取得を試みる（コントラクト情報は取得可能）
      console.log(`🔍 コントラクト情報を確認中: Chain ${selectedChainForSBT}${walletAddress ? `, Wallet: ${walletAddress}` : ' (ウォレット未接続)'}`);

      try {
        // コントラクトアドレスの確認
        const contractAddress = getSBTContractAddress(selectedChainForSBT);
        console.log(`📋 コントラクトアドレス: ${contractAddress || '未設定'}`);
        
        if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
          console.warn(`⚠️ Chain ${selectedChainForSBT} のコントラクトアドレスが未設定です`);
          if (isMounted) {
            setContractOwner(null);
            setIsContractOwner(false);
            setShopInfo(null);
            setIsShopOwner(false);
          }
          return;
        }

        const ownerResult = await getContractOwner(selectedChainForSBT);
        
        if (!isMounted) {
          console.log('⚠️ コンポーネントがアンマウントされました - 処理中断');
          return;
        }
        
        console.log(`📋 getContractOwner結果:`, ownerResult);
        
        if (ownerResult && ownerResult.owner && ownerResult.owner !== '') {
          setContractOwner(ownerResult.owner);
          console.log(`✅ コントラクトオーナー: ${ownerResult.owner}`);
          
          if (walletAddress) {
            console.log(`📋 現在のウォレット: ${walletAddress}`);
            console.log(`📋 比較(小文字): Contract="${ownerResult.owner.toLowerCase()}" vs Wallet="${walletAddress?.toLowerCase()}"`);
            
            // アドレス比較を厳密に行う（小文字化して比較）
            const isOwner = ownerResult.owner.toLowerCase() === walletAddress.toLowerCase();
            console.log(`📋 比較結果: ${isOwner ? '✅ 一致' : '❌ 不一致'}`);
            
            setIsContractOwner(isOwner);
            
            if (isOwner) {
              console.log('✅ 現在のウォレットはコントラクトオーナーです');
            } else {
              console.log('❌ 現在のウォレットはコントラクトオーナーではありません');
            }
          } else {
            console.log('ℹ️ ウォレット未接続のため、権限チェックをスキップします');
            setIsContractOwner(false);
          }
        } else {
          console.warn(`⚠️ コントラクトオーナー取得失敗:`, ownerResult);
          if (ownerResult.error) {
            console.error(`❌ エラー詳細: ${ownerResult.error}`);
          }
          setContractOwner(null);
          setIsContractOwner(false);
        }

        // ショップ情報を取得
        const shopResult = await getShopInfo(1, selectedChainForSBT);
        
        if (!isMounted) {
          console.log('⚠️ コンポーネントがアンマウントされました - ショップ情報処理中断');
          return;
        }
        
        console.log(`📋 getShopInfo結果:`, shopResult);
        
        if (shopResult && shopResult.owner && shopResult.owner !== '' && shopResult.owner !== '0x0000000000000000000000000000000000000000') {
          setShopInfo(shopResult);
          console.log(`✅ ショップオーナー (ID:1): ${shopResult.owner}`);
          
          if (walletAddress) {
            // アドレス比較を厳密に行う（小文字化して比較）
            const isShopOwner = shopResult.owner.toLowerCase() === walletAddress.toLowerCase();
            console.log(`📋 ショップ比較結果: ${isShopOwner ? '✅ 一致' : '❌ 不一致'}`);
            
            setIsShopOwner(isShopOwner);
            
            if (isShopOwner) {
              console.log('✅ 現在のウォレットはショップオーナー (ID:1) です');
            } else {
              console.log('❌ 現在のウォレットはショップオーナー (ID:1) ではありません');
            }
          } else {
            console.log('ℹ️ ウォレット未接続のため、ショップ権限チェックをスキップします');
            setIsShopOwner(false);
          }
        } else {
          console.warn(`⚠️ ショップ情報取得失敗または未登録:`, shopResult);
          if (shopResult.error) {
            console.log(`ℹ️ ショップ未登録の可能性: ${shopResult.error}`);
          }
          setShopInfo(null);
          setIsShopOwner(false);
        }
      } catch (error) {
        console.error('❌ コントラクト所有者確認エラー:', error);
        setContractOwner(null);
        setIsContractOwner(false);
        setShopInfo(null);
        setIsShopOwner(false);
      }
      
      console.log(`🏁 権限チェック処理完了`);
    };

    checkContractOwnership();
    
    // ウォレットアドレスとチェーンの両方が設定されたらショップ確認
    if (walletAddress && selectedChainForSBT) {
      setTimeout(() => {
        if (isMounted) {
          checkAndRegisterInitialShops();
        }
      }, 500); // 0.5秒後に実行
    }
    
    // クリーンアップ関数
    return () => {
      console.log('🧹 useEffect クリーンアップ実行');
      isMounted = false;
    };
  }, [selectedChainForSBT, walletAddress]);

  // 権限状態が変更されたら確認ログを出力（デバッグ用）
  useEffect(() => {
    console.log(`🔐 権限状態更新検知: isContractOwner=${isContractOwner}, isShopOwner=${isShopOwner}`);
  }, [isContractOwner, isShopOwner]);

  // LocalStorage から完了した支払いセッションを読み込み
  useEffect(() => {
    const saved = localStorage.getItem('completedPaymentSessions');
    if (saved) {
      try {
        setCompletedPayments(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load completed payments:', error);
      }
    }
  }, []);

  // LocalStorageの店舗設定変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedShopInfo = localStorage.getItem('shop-info');
        if (savedShopInfo) {
          const shop = JSON.parse(savedShopInfo);
          setShopSettings({
            name: shop.name || 'SBT masaru21 Pay Demo Store',
            id: shop.id || 'shop-001',
            category: shop.category || '',
            description: shop.description || 'デモンストレーション用の店舗'
          });
          console.log('🔄 店舗設定が更新されました:', shop);
        }
      } catch (error) {
        console.warn('店舗設定更新エラー:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // completedPayments を監視して、LocalStorage の変更を反映
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('completedPaymentSessions');
      if (saved) {
        try {
          setCompletedPayments(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to load completed payments:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 画像ファイルアップロード処理（ローカル保存対応）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（3MB以下）
    if (file.size > 3 * 1024 * 1024) {
      toast.error('画像サイズは3MB以下にしてください');
      return;
    }

    // ファイル形式チェック（JPEG/PNG）
    if (!file.type.includes('jpeg') && !file.type.includes('png')) {
      toast.error('JPEGまたはPNG形式の画像をアップロードしてください');
      return;
    }

    // Base64 に変換
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      
      // 画像をローカルに保存（IndexedDB）
      const imageId = `image-${Date.now()}`;
      try {
        await sbtStorage.saveImage({
          id: imageId,
          templateId: editingTemplateId || undefined,
          fileName: file.name,
          mimeType: file.type,
          base64Data: base64String,
          size: file.size,
        });
        
        console.log(`🖼️ 画像をローカルに保存: ${file.name} (ID: ${imageId})`);
      } catch (error) {
        console.warn('画像のローカル保存エラー:', error);
      }
      
      setNewTemplate({
        ...newTemplate,
        imageUrl: base64String,
        imageMimeType: file.type,
      });
      setImagePreview(base64String);
      toast.success(`画像をアップロード・保存しました (${Math.round(file.size / 1024)}KB)`);
    };
    reader.readAsDataURL(file);
  };

  // completedPayments を監視して、LocalStorage の変更を反映
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('completedPaymentSessions');
      if (saved) {
        try {
          setCompletedPayments(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to load completed payments:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ショップ登録状況を確認して自動登録する関数
  const checkAndRegisterInitialShops = async () => {
    if (!selectedChainForSBT || !walletAddress) return;
    
    // 既に実行済みかチェック(同じチェーン+ウォレットの組み合わせでは一度だけ実行)
    const checkKey = `shop-check-${selectedChainForSBT}-${walletAddress}`;
    const lastCheck = sessionStorage.getItem(checkKey);
    if (lastCheck) {
      console.log(`✅ ショップ登録チェックは既に実行済みです`);
      return;
    }
    
    console.log(`🔍 初期ショップの登録状況を確認中: Chain ${selectedChainForSBT}`);
    
    // 初期テンプレートのショップIDが登録されているか確認
    for (const [templateName, shopId] of Object.entries(initialShopIds)) {
      try {
        const shopResult = await getShopInfo(shopId, selectedChainForSBT);
        
        if (shopResult.success && shopResult.shopInfo) {
          console.log(`✅ ショップ${shopId} (${templateName})は登録済み:`, shopResult.shopInfo.name);
        } else if (shopResult.error && shopResult.error.includes('Shop not found')) {
          console.log(`⚠️ ショップ${shopId} (${templateName})が未登録です。自動登録を試みます...`);
          
          // ショップを自動登録
          const template = templates.find(t => t.shopId === shopId);
          if (template) {
            try {
              // 店舗設定を取得して登録に使用
              const shopSettings = getShopSettings();
              
              const registerResult = await registerShop({
                shopId,
                shopName: shopSettings.name || template.name, // 設定画面の店舗名を優先
                description: shopSettings.description || template.description, // 設定画面の説明を優先
                shopOwnerAddress: walletAddress,
                requiredVisits: template.maxStamps,
                chainId: selectedChainForSBT,
              });
              
              if (registerResult.success) {
                console.log(`✅ ショップ${shopId}の自動登録完了`);
                toast.success(`ショップ "${shopSettings.name || template.name}" を自動登録しました (ID: ${shopId})`);
              } else {
                console.error(`❌ ショップ${shopId}の自動登録失敗:`, registerResult.error);
                // "Shop already registered" エラーは無視（実際は登録済み）
                if (!registerResult.error?.includes('Shop already registered')) {
                  toast.error(`ショップ "${shopSettings.name || template.name}" の登録に失敗: ${registerResult.error}`);
                }
              }
            } catch (error: any) {
              console.error(`❌ ショップ${shopId}の自動登録エラー:`, error);
              // "Shop already registered" エラーは無視（実際は登録済み）
              if (!error.message?.includes('Shop already registered')) {
                const shopSettings = getShopSettings();
                toast.error(`ショップ "${shopSettings.name || template.name}" の登録でエラーが発生しました`);
              }
            }
          }
        } else {
          console.warn(`⚠️ ショップ${shopId}の状態が不明です:`, shopResult.error);
        }
      } catch (error) {
        console.error(`❌ ショップ${shopId}の確認エラー:`, error);
      }
    }
    
    // 実行済みフラグを設定
    sessionStorage.setItem(checkKey, new Date().toISOString());
  };

  const addTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.description || !newTemplate.imageUrl) {
      toast.error('必須項目を入力してください（画像も必須です）');
      return;
    }

    // 発行パターンのバリデーション
    if (newTemplate.issuePattern === 'after_count' && newTemplate.maxStamps < 2) {
      toast.error('N回後パターンの場合、2回以上を指定してください');
      return;
    }

    if (newTemplate.issuePattern === 'period_range') {
      if (!newTemplate.periodStartDate || !newTemplate.periodEndDate) {
        toast.error('期間指定パターンの場合、開始日と終了日を入力してください');
        return;
      }
      if (new Date(newTemplate.periodStartDate) >= new Date(newTemplate.periodEndDate)) {
        toast.error('終了日は開始日より後の日付にしてください');
        return;
      }
    }

    handleTemplateFormSubmit(e);
  };

  // 📥 エクスポート機能（ネットワーク情報付き）
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // ネットワーク情報を含むファイル名生成
      const networkName = currentNetworkInfo.displayName.replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `sbt-jpyc-pay-export-${networkName}-${new Date().toISOString().split('T')[0]}.json`;
      
      // ネットワーク情報をメタデータに含める
      const exportMetadata = {
        currentNetwork: currentNetworkInfo,
        selectedNetwork: selectedNetworkInfo,
        exportSource: 'SBT masaru21 Pay Management'
      };
      
      await sbtStorage.downloadExport(filename, exportMetadata);
      toast.success(`✅ データをエクスポートしました！\n📡 ネットワーク: ${currentNetworkInfo.displayName}`);
      setShowExportModal(false);
    } catch (error: any) {
      console.error('エクスポートエラー:', error);
      toast.error(`エクスポートに失敗しました: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 📤 インポート機能（ネットワーク情報対応）
  const handleImport = async () => {
    if (!importFile) {
      toast.error('インポートファイルを選択してください');
      return;
    }

    try {
      setIsImporting(true);
      
      // インポート実行（ネットワーク情報取得）
      const result = await sbtStorage.uploadImport(importFile);
      
      // ネットワーク情報の警告表示
      if (result.networkInfo) {
        const importedNetwork = result.networkInfo.displayName;
        const currentNetwork = getNetworkDisplayInfo(currentChainId).displayName;
        
        if (importedNetwork !== currentNetwork) {
          toast(`⚠️ ネットワークの違いにご注意ください\\n📥 インポート元: ${importedNetwork}\\n📡 現在: ${currentNetwork}`, {
            duration: 6000,
            style: { background: '#FEF3C7', color: '#92400E' }
          });
        }
      }
      
      // データを再読み込み
      const savedTemplates = await sbtStorage.getAllTemplates();
      const savedSBTs = await sbtStorage.getAllSBTs();
      
      setTemplates(savedTemplates);
      setIssuedSBTs(savedSBTs);
      
      // 使用済みショップIDを更新
      try {
        const usedShopIds = savedTemplates.map(t => t.shopId).filter(Boolean);
        localStorage.setItem('used-shop-ids', JSON.stringify([...new Set(usedShopIds)]));
      } catch (error) {
        console.warn('使用済みショップID更新エラー:', error);
      }
      
      toast.success('✅ データをインポートしました！');
      setImportFile(null);
      setShowExportModal(false);
    } catch (error: any) {
      console.error('インポートエラー:', error);
      toast.error(`インポートに失敗しました: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const deleteTemplate = (id: string) => {
    // 初期テンプレートは削除できない
    if (['template-stamp-card', 'template-milestone', 'template-campaign'].includes(id)) {
      toast.error('初期テンプレートは削除できません');
      return;
    }
    
    // 削除対象テンプレートから発行された SBT を確認
    const relatedSBTs = issuedSBTs.filter((sbt) => sbt.templateId === id);
    const completedSBTs = relatedSBTs.filter((sbt) => sbt.status === 'redeemed');

    // ⭐ 完了済み SBT がある場合は削除を阻止
    if (completedSBTs.length > 0) {
      toast.error(
        `❌ 削除できません\n${completedSBTs.length}件の完了済みSBTが存在します。\n完了済みSBTがあるテンプレートは削除できません。`,
        { duration: 5000 }
      );
      return;
    }

    const updatedTemplates = templates.filter((t) => t.id !== id);
    setTemplates(updatedTemplates);
    
    // IndexedDB + localStorage から削除
    sbtStorage.deleteTemplate(id).catch(err => {
      console.error('テンプレート削除エラー:', err);
      toast.error('テンプレートの削除に失敗しました');
    });

    toast.success('テンプレートを削除しました');
  };

  // ⭐ テンプレートを編集モードで開く
  const editTemplate = (template: SBTTemplate) => {
    setNewTemplate({
      name: template.name,
      description: template.description,
      issuePattern: template.issuePattern,
      maxStamps: template.maxStamps,
      timePeriodDays: template.timePeriodDays || 30,
      periodStartDate: template.periodStartDate || '',
      periodEndDate: template.periodEndDate || '',
      rewardDescription: template.rewardDescription,
      imageUrl: template.imageUrl,
      imageMimeType: template.imageMimeType,
    });
    setImagePreview(template.imageUrl);
    setEditingTemplateId(template.id);
    setShowTemplateForm(true);
  };

  // ⭐ テンプレートを編集保存（上書き）
  const saveTemplateEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTemplate.name.trim()) {
      toast.error('テンプレート名を入力してください');
      return;
    }

    if (!newTemplate.imageUrl) {
      toast.error('画像をアップロードしてください');
      return;
    }

    if (editingTemplateId) {
      // 既存テンプレートを更新
      const updatedTemplates = templates.map((t) =>
        t.id === editingTemplateId
          ? {
              ...t,
              name: newTemplate.name,
              description: newTemplate.description,
              issuePattern: newTemplate.issuePattern,
              maxStamps: newTemplate.maxStamps,
              timePeriodDays: newTemplate.issuePattern === 'time_period' ? (newTemplate.timePeriodDays || 30) : undefined,
              periodStartDate: newTemplate.issuePattern === 'period_range' ? newTemplate.periodStartDate : undefined,
              periodEndDate: newTemplate.issuePattern === 'period_range' ? newTemplate.periodEndDate : undefined,
              rewardDescription: newTemplate.rewardDescription,
              imageUrl: newTemplate.imageUrl,
              imageMimeType: newTemplate.imageMimeType,
            }
          : t
      );
      setTemplates(updatedTemplates);

      // IndexedDB に保存
      await sbtStorage.saveTemplate(updatedTemplates.find((t) => t.id === editingTemplateId)!);
      
      toast.success('テンプレートを更新しました');
      setEditingTemplateId(null);
    }

    // フォームをリセット
    setNewTemplate({
      name: '',
      description: '',
      issuePattern: 'per_payment' as IssuePattern,
      maxStamps: 10,
      timePeriodDays: 30,
      periodStartDate: '',
      periodEndDate: '',
      rewardDescription: '',
      imageUrl: '',
      imageMimeType: 'image/jpeg',
    });
    setImagePreview('');
    setShowTemplateForm(false);
  };

  // ⭐ テンプレートをコピーして新規作成
  const copyTemplateAsNew = (template: SBTTemplate) => {
    setNewTemplate({
      name: `${template.name} (コピー)`,
      description: template.description,
      issuePattern: template.issuePattern,
      maxStamps: template.maxStamps,
      timePeriodDays: template.timePeriodDays || 30,
      periodStartDate: template.periodStartDate || '',
      periodEndDate: template.periodEndDate || '',
      rewardDescription: template.rewardDescription,
      imageUrl: template.imageUrl,
      imageMimeType: template.imageMimeType,
    });
    setImagePreview(template.imageUrl);
    setEditingTemplateId(null);  // 新規作成モード
    setShowTemplateForm(true);
  };

  // ⭐ テンプレート追加フォームの送信を改変
  const handleTemplateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTemplate.name.trim()) {
      toast.error('テンプレート名を入力してください');
      return;
    }

    if (!newTemplate.imageUrl) {
      toast.error('画像をアップロードしてください');
      return;
    }

    if (editingTemplateId) {
      // 編集保存
      await saveTemplateEdit(e);
    } else {
      // 新規作成（コピーも含む）
      const shopId = generateNonConflictingShopId(templates);
      const newTemplateData: SBTTemplate = {
        id: `template-${Date.now()}`,
        shopId,
        name: newTemplate.name,
        description: newTemplate.description,
        issuePattern: newTemplate.issuePattern,
        maxStamps: newTemplate.maxStamps,
        timePeriodDays: newTemplate.timePeriodDays,
        periodStartDate: newTemplate.periodStartDate,
        periodEndDate: newTemplate.periodEndDate,
        rewardDescription: newTemplate.rewardDescription,
        imageUrl: newTemplate.imageUrl,
        imageMimeType: newTemplate.imageMimeType,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
      };

      console.log('新しいショップID:', shopId, formatShopIdAsHex(shopId));
      
      // 初期テンプレートを保持し、カスタムテンプレートを追加
      const defaultTemplates = [
        {
          id: 'template-stamp-card',
          shopId: initialShopIds.stampCard,
          name: 'スタンプカード',
          description: '毎回の支払いでスタンプを1つ獲得',
          issuePattern: 'per_payment' as const,
          maxStamps: 10,
          rewardDescription: 'スタンプ1個',
          imageUrl: '/sbt-images/visit-memorial.png',
          imageMimeType: 'image/png',
          createdAt: '2025-11-14',
          status: 'active' as const,
        },
        {
          id: 'template-milestone',
          shopId: initialShopIds.milestone,
          name: 'マイルストーン達成',
          description: '10回の支払い達成時にバッジを授与',
          issuePattern: 'after_count' as const,
          maxStamps: 10,
          rewardDescription: 'ゴールド会員バッジ',
          imageUrl: '/sbt-images/milestone-10x.png',
          imageMimeType: 'image/png',
          createdAt: '2025-11-14',
          status: 'active' as const,
        },
        {
          id: 'template-campaign',
          shopId: initialShopIds.campaign,
          name: 'キャンペーン記念',
          description: 'キャンペーン期間内（30日）の支払いで期間限定メダルを取得',
          issuePattern: 'time_period' as const,
          maxStamps: 5,
          timePeriodDays: 30,
          rewardDescription: 'キャンペーン記念メダル',
          imageUrl: '/sbt-images/campaign-limited.png',
          imageMimeType: 'image/png',
          createdAt: '2025-11-14',
          status: 'active' as const,
        },
      ];
      
      // カスタムテンプレートを抽出（初期テンプレート以外）
      const customTemplates = templates.filter(template => 
        !['template-stamp-card', 'template-milestone', 'template-campaign'].includes(template.id)
      );
      
      // 新しいカスタムテンプレートを追加
      const updatedCustomTemplates = [newTemplateData, ...customTemplates];
      
      // 初期テンプレート + 更新されたカスタムテンプレート
      const allTemplates = [...defaultTemplates, ...updatedCustomTemplates];
      setTemplates(allTemplates);

      // IndexedDB に保存（カスタムテンプレートのみ）
      await sbtStorage.saveTemplate(newTemplateData);
      
      // ローカルストレージにもショップIDリストを保存（重複防止用）
      try {
        const existingShopIds = JSON.parse(localStorage.getItem('used-shop-ids') || '[]');
        existingShopIds.push(shopId);
        localStorage.setItem('used-shop-ids', JSON.stringify([...new Set(existingShopIds)]));
      } catch (error) {
        console.warn('ショップIDリスト保存エラー:', error);
      }

      // フォームをリセット
      setNewTemplate({
        name: '',
        description: '',
        issuePattern: 'per_payment' as IssuePattern,
        maxStamps: 10,
        timePeriodDays: 30,
        periodStartDate: '',
        periodEndDate: '',
        rewardDescription: '',
        imageUrl: '',
        imageMimeType: 'image/jpeg',
      });
      setImagePreview('');
      setShowTemplateForm(false);
      toast.success(editingTemplateId ? 'テンプレートを更新しました' : `テンプレートを作成しました\n🆔 ショップID: ${shopId}`);
    }
  };

  const issueSBT = async (e: React.FormEvent, selectedPaymentId?: string, selectedTemplateId?: string) => {
    e.preventDefault();

    // 支払いセッションから発行する場合、発行中状態を設定
    if (selectedPaymentId) {
      setPaymentSBTStatus(prev => ({
        ...prev,
        [selectedPaymentId]: { status: 'issuing', message: '発行中...' }
      }));
    }

    // テンプレートIDの決定（引数から渡された場合はそれを優先、なければnewIssuanceから）
    const templateId = selectedTemplateId || newIssuance.templateId;
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      if (selectedPaymentId) {
        setPaymentSBTStatus(prev => ({
          ...prev,
          [selectedPaymentId]: { status: 'failed', message: 'テンプレートが見つかりません' }
        }));
      }
      toast.error('テンプレートが見つかりません');
      return;
    }

    // 期間指定パターンの場合、現在の日付が期間内かチェック
    if (template.issuePattern === 'period_range') {
      const now = new Date();
      const startDate = new Date(template.periodStartDate || '');
      const endDate = new Date(template.periodEndDate || '');
      
      if (now < startDate || now > endDate) {
        const periodStr = `${template.periodStartDate} ～ ${template.periodEndDate}`;
        if (selectedPaymentId) {
          setPaymentSBTStatus(prev => ({
            ...prev,
            [selectedPaymentId]: { status: 'failed', message: `期間外のため発行できません(${periodStr})` }
          }));
        }
        toast.error(`このテンプレートは指定期間（${periodStr}）内でのみ発行できます`);
        return;
      }
    }

    // 完了した支払いセッションから支払者アドレスを取得、またはウォレットアドレスを使用
    let recipientAddress = '';
    let sourcePaymentId = undefined;
    let transactionHash = undefined;

    if (selectedPaymentId) {
      // 支払いセッションから発行する場合
      const payment = completedPayments.find((p) => p.id === selectedPaymentId);
      if (!payment || !payment.payerAddress) {
        setPaymentSBTStatus(prev => ({
          ...prev,
          [selectedPaymentId]: { status: 'failed', message: '支払者アドレスが見つかりません' }
        }));
        toast.error('支払者アドレスが見つかりません');
        return;
      }
      recipientAddress = payment.payerAddress;
      sourcePaymentId = payment.id;
      transactionHash = payment.transactionHash;
    } else {
      // 手動発行の場合
      if (!walletAddress) {
        toast.error('ウォレットを接続してください');
        return;
      }
      recipientAddress = walletAddress;
    }

    // ⭐ 発行パターンによって処理を分岐
    if (template.issuePattern === 'after_count') {
      // 🔢 マイルストーン方式: N回達成時のみSBT発行
      
      // このウォレット+テンプレートの支払い回数をカウント
      const paymentCount = (completedPayments || []).filter(
        (p) => p.payerAddress?.toLowerCase() === recipientAddress.toLowerCase()
      ).length;
      
      console.log(`🔢 マイルストーン進捗: ${paymentCount}/${template.maxStamps}回`);
      
      if (paymentCount < template.maxStamps) {
        // まだ達成していない
        if (selectedPaymentId) {
          setPaymentSBTStatus(prev => ({
            ...prev,
            [selectedPaymentId]: { 
              status: 'failed', 
              message: `マイルストーン進捗: ${paymentCount}/${template.maxStamps}回 (あと${template.maxStamps - paymentCount}回)` 
            }
          }));
        }
        toast(`📊 マイルストーン進捗: ${paymentCount}/${template.maxStamps}回\nあと${template.maxStamps - paymentCount}回で達成です！`, {
          icon: '🎯',
          duration: 4000,
        });
        setNewIssuance({ templateId: templates[0]?.id || '', recipientAddress: '' });
        setShowIssuanceForm(false);
        return; // SBT発行しない
      }
      
      // ちょうど達成 → SBT発行（既に発行済みでないかチェック）
      const alreadyIssued = issuedSBTs.find(
        (sbt) => sbt.recipientAddress.toLowerCase() === recipientAddress.toLowerCase() && 
                 sbt.templateId === template.id
      );
      
      if (alreadyIssued) {
        if (selectedPaymentId) {
          setPaymentSBTStatus(prev => ({
            ...prev,
            [selectedPaymentId]: { status: 'failed', message: 'このマイルストーンSBTは既に発行済みです' }
          }));
        }
        toast.error(`このマイルストーンSBTは既に発行済みです`);
        setNewIssuance({ templateId: templates[0]?.id || '', recipientAddress: '' });
        setShowIssuanceForm(false);
        return;
      }
      
      // 🎉 マイルストーン達成 → SBT発行
      toast.success(`🎉 マイルストーン達成！${template.maxStamps}回到達 → SBT発行`);
      
    } else {
      // 🎁 スタンプカード方式: 毎回新規SBT発行 + スタンプ累計更新
      
      // 同じウォレット + 同じテンプレートの既存SBTを検索してスタンプをカウント
      const existingSBT = issuedSBTs.find(
        (sbt) => sbt.recipientAddress.toLowerCase() === recipientAddress.toLowerCase() && 
                 sbt.templateId === template.id &&
                 sbt.status === 'active' // 有効なSBTのみカウント
      );

      if (existingSBT) {
        // 既存のSBTが見つかった場合、スタンプを+1して更新
        console.log('✅ 既存SBT発見 - スタンプを累計します:', existingSBT);
        
        existingSBT.currentStamps += 1;
        
        // maxStampsに達したかチェック
        if (existingSBT.currentStamps >= existingSBT.maxStamps) {
          existingSBT.status = 'redeemed';
          toast.success(`🎉 スタンプカード完成！ ${existingSBT.currentStamps}/${existingSBT.maxStamps} - 特典を受け取れます！`);
        }

        // IndexedDBを更新
        try {
          await sbtStorage.saveSBT(existingSBT);
          setIssuedSBTs(issuedSBTs.map(s => s.id === existingSBT.id ? existingSBT : s));
        } catch (error) {
          console.error('SBT保存エラー:', error);
        }
      }
      // ここで return しない → 新規SBTも発行される
    }

    // 新規SBTを作成
    console.log('🆕 新規SBT発行');
    const sbt: IssuedSBT = {
      id: `sbt-${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      recipientAddress,
      currentStamps: template.issuePattern === 'after_count' ? template.maxStamps : 1, // マイルストーンは達成済み、スタンプカードは1
      maxStamps: template.maxStamps,
      issuedAt: new Date().toISOString().split('T')[0],
      status: template.issuePattern === 'after_count' ? 'redeemed' : 'active', // マイルストーンは即完了
      sourcePaymentId,
      transactionHash,
      sbtMintStatus: 'pending',
      chainId: currentChainId || undefined,
    };

    // UI に一度表示
    setIssuedSBTs([sbt, ...issuedSBTs]);
    setNewIssuance({ templateId: templates[0]?.id || '', recipientAddress: '' });
    setShowIssuanceForm(false);

    // ⭐ ブロックチェーンに mint（非同期）
    const mintingToast = toast.loading('🔄 画像をIPFSにアップロード中...');

    // 進捗状態を更新
    if (selectedPaymentId) {
      setPaymentSBTStatus(prev => ({
        ...prev,
        [selectedPaymentId]: { status: 'issuing', message: '📤 画像をアップロード中...' }
      }));
    }

    try {
      // テンプレートの画像をBlobに変換してPinataにアップロード
      let tokenURI = '';
      
      try {
        let file: File;
        
        // Data URL形式かどうかを判定
        if (template.imageUrl.startsWith('data:')) {
          // Data URL形式の場合、Base64デコード
          const matches = template.imageUrl.match(/^data:(.+);base64,(.+)$/);
          if (!matches) {
            throw new Error('Invalid data URL format');
          }
          
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          // Base64をバイナリに変換
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: mimeType });
          const extension = mimeType.split('/')[1] || 'png';
          file = new File([blob], `${template.name}.${extension}`, { type: mimeType });
        } else {
          // URL形式の場合、fetchして取得
          const response = await fetch(template.imageUrl);
          const blob = await response.blob();
          file = new File([blob], `${template.name}.jpg`, { type: blob.type || 'image/jpeg' });
        }

        toast.loading('📤 画像とメタデータをIPFSにアップロード中...', { id: mintingToast });

        // 進捗状態を更新
        if (selectedPaymentId) {
          setPaymentSBTStatus(prev => ({
            ...prev,
            [selectedPaymentId]: { status: 'issuing', message: '📋 メタデータ作成中...' }
          }));
        }

        console.log('📋 使用される店舗設定:', shopSettings);

        // 動的メタデータでPinataにアップロード
        const result = await pinataService.createDynamicSBTWithImage(
          file,
          template.name,
          template.description,
          shopSettings,
          {
            shopId: template.shopId,
            maxStamps: template.maxStamps,
            rewardDescription: template.rewardDescription,
            issuePattern: template.issuePattern,
          }
        );

        tokenURI = result.tokenURI;
        console.log('✅ 動的メタデータでIPFS Upload成功:', tokenURI);

      } catch (uploadError: any) {
        console.error('IPFS Upload エラー:', uploadError);
        toast.error(`画像アップロード失敗: ${uploadError.message}`, { id: mintingToast });
        
        // フォールバック: ダミーのIPFS URIを使用
        const dummyHash = `Qm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`.padEnd(46, '0');
        tokenURI = `ipfs://${dummyHash}`;
        console.warn('⚠️ ダミーURI使用:', tokenURI);
      }

      toast.loading('🔄 SBT をブロックチェーンに記録中...', { id: mintingToast });

      // 進捗状態を更新
      if (selectedPaymentId) {
        setPaymentSBTStatus(prev => ({
          ...prev,
          [selectedPaymentId]: { status: 'issuing', message: '🔄 ブロックチェーンに記録中...' }
        }));
      }

      // ユーザーにネットワーク切替とMetaMask署名を促す
      toast('🔁 MetaMaskでネットワーク切替と署名の確認が表示されます', { icon: '🔁', duration: 5000 });

      console.log('🎯 SBT発行開始 - MetaMask署名待ち');

      // SBT mint 実行（テンプレートのshopIdを使用）
      const result = await mintSBT({
        recipientAddress,
        shopId: template.shopId, // テンプレートのshopIdを使用
        tokenURI,
        chainId: selectedChainForSBT, // ユーザーが選択したネットワーク
      });

      console.log('✅ SBT発行結果:', result);

      if (result.success && result.transactionHash) {
        // ✅ mint 成功
        sbt.sbtTransactionHash = result.transactionHash;
        sbt.sbtMintStatus = 'success';
        sbt.chainId = selectedChainForSBT; // チェーンIDを保存
        
        // ⭐ tokenIdを保存（NFT表示用）
        if (result.tokenId) {
          sbt.tokenId = parseInt(result.tokenId, 10);
          console.log(`✅ TokenID保存: ${sbt.tokenId}`);
        }
        
        // IndexedDB に保存
        await sbtStorage.saveSBT(sbt);

        // 表示を更新
        setIssuedSBTs(prev =>
          prev.map(s => (s.id === sbt.id ? sbt : s))
        );

        // 支払いセッションから発行した場合、成功状態を更新
        if (selectedPaymentId) {
          setPaymentSBTStatus(prev => ({
            ...prev,
            [selectedPaymentId]: { 
              status: 'success', 
              message: '発行完了',
              txHash: result.transactionHash
            }
          }));
        }

        toast.success(
          `🎉 SBT を ${shopSettings.name} としてブロックチェーンに記録しました！\n🆔 店舗: ${shopSettings.name}\n📋 ショップID: ${shopSettings.id}\n💿 Tx: ${result.transactionHash.slice(0, 12)}...`,
          { 
            id: mintingToast,
            duration: 8000,
            style: {
              background: '#10B981',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }
          }
        );
      } else {
        // ❌ mint 失敗
        sbt.sbtMintStatus = 'failed';
        await sbtStorage.saveSBT(sbt);
        setIssuedSBTs(prev =>
          prev.map(s => (s.id === sbt.id ? sbt : s))
        );

        // ネットワーク問題かどうかを判定
        const isNetworkIssue = result.error?.includes('RPC接続') || result.error?.includes('Internal JSON-RPC error');
        
        // 支払いセッションから発行した場合、失敗状態を更新
        if (selectedPaymentId) {
          setPaymentSBTStatus(prev => ({
            ...prev,
            [selectedPaymentId]: { 
              status: 'failed', 
              message: isNetworkIssue ? 'ネットワーク接続エラー' : `発行失敗: ${result.error || 'Unknown error'}`
            }
          }));
        }

        if (isNetworkIssue) {
          toast.error(
            `🌐 ネットワーク接続に問題があります\n💾 SBTデータはローカルに保存済み\n🔧 MetaMaskのネットワーク設定を確認してください`,
            { 
              id: mintingToast,
              duration: 8000 // 長めに表示
            }
          );
        } else {
          toast.error(
            `❌ SBT 記録失敗: ${result.error || 'Unknown error'}\n💾 データはローカルに保存されています`,
            { id: mintingToast }
          );
        }
      }
    } catch (error: any) {
      // エラーハンドリング
      sbt.sbtMintStatus = 'failed';
      await sbtStorage.saveSBT(sbt);
      setIssuedSBTs(prev =>
        prev.map(s => (s.id === sbt.id ? sbt : s))
      );

      // 支払いセッションから発行した場合、失敗状態を更新
      if (selectedPaymentId) {
        setPaymentSBTStatus(prev => ({
          ...prev,
          [selectedPaymentId]: { 
            status: 'failed', 
            message: `エラー: ${error.message || 'Unknown error'}`
          }
        }));
      }

      console.error('SBT mint エラー:', error);
      toast.error(
        `SBT 記録エラー: ${error.message || 'Unknown error'}`,
        { id: mintingToast }
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* PWA ウォレット接続ハンドラー */}
        <PWAWalletHandler 
          isConnected={isConnected}
          onBrowserRedirect={() => {
            // ブラウザリダイレクト時の処理
            toast.success('ブラウザ版でウォレット接続をお試しください');
          }}
        />

        {/* MetaMask 接続チェック警告 */}
        {!window.ethereum ? (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">⚠️ MetaMask がインストールされていません</p>
                <p className="text-sm text-red-800 mt-1">
                  SBT 発行にはブラウザに MetaMask をインストールし、ウォレットを接続する必要があります。
                </p>
                <a 
                  href="https://metamask.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-red-600 underline font-semibold hover:text-red-800 inline-block mt-2"
                >
                  MetaMask をインストール →
                </a>
              </div>
            </div>
          </div>
        ) : !walletAddress ? (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">🔌 ウォレットが接続されていません</p>
                <p className="text-sm text-yellow-800 mt-1">
                  ページ上部の「Connect Wallet」ボタンをクリックして MetaMask を接続してください。
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* 🚨 本番環境での実装についての重要な注意事項 */}
        <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-900 mb-3">🚨 デモ環境での実装について</h3>
              <div className="space-y-4">
                <div className="bg-white border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">📱 現在の実装（デモ用）</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• フロントエンドでMetaMaskを使用した署名</li>
                    <li>• ユーザーが都度トランザクションを承認</li>
                    <li>• 秘密鍵はMetaMaskが安全に管理</li>
                    <li>• デモ・プロトタイプ・テスト目的に適している</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">🏢 本番環境での推奨構成（セキュリティ重視）</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• <strong>署名方式:</strong> その都度署名を推奨（マルチシグ等のセキュアな署名プロセス）</li>
                    <li>• <strong>サーバーサイドAPI:</strong> Express.js、FastAPI等でSBT発行API作成</li>
                    <li>• <strong>認証・認可:</strong> JWT、OAuth等でAPI保護</li>
                    <li>• <strong>監査ログ:</strong> すべてのSBT発行を記録</li>
                    <li>• <strong>レート制限:</strong> 不正な大量発行を防止</li>
                    <li>• <strong>権限管理:</strong> ロールベースアクセス制御</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">🔐 セキュアな実装例</h4>
                  <div className="text-xs font-mono bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                    <div className="space-y-1">
                      <div># 環境変数設定（秘密鍵は保存しない）</div>
                      <div>POLYGON_RPC_URL=https://polygon-rpc.com/</div>
                      <div>PINATA_API_KEY=your_api_key</div>
                      <div>&nbsp;</div>
                      <div># セキュアAPI実装</div>
                      <div>POST /api/prepare-mint</div>
                      <div>- トランザクションデータを準備</div>
                      <div>- 承認者に署名要求</div>
                      <div>- マルチシグまたはHSM署名推奨</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <a
                    href="https://docs.ethers.org/v6/getting-started/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition flex items-center gap-2 text-sm font-semibold"
                  >
                    <Server className="w-4 h-4" />
                    ethers.js サーバー実装ガイド
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ウォレット & ネットワーク管理 */}
        <WalletSelector
          title="ウォレット & ネットワーク選択"
          showChainSelector={true}
          onNetworkChange={(chainId) => {
            setSelectedChainForSBT(chainId);
            console.log(`🔄 SBT発行先ネットワークを変更: Chain ID ${chainId}`);
          }}
        />

        {/* ヘッダー */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">SBT管理</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition text-xs sm:text-sm"
                title="データをエクスポート・インポート"
              >
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">データ管理</span><span className="sm:hidden">データ</span>
              </button>
              <button
                onClick={() => setShowGuideModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition text-xs sm:text-sm"
                title="使い方ガイドを表示"
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">使い方ガイド</span><span className="sm:hidden">ガイド</span>
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">スタンプカードテンプレートの作成・管理と発行（PWA対応、画像ローカル保存、データエクスポート可能）</p>
        </div>

        {/* 使い方ガイドモーダル */}
        {showGuideModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={() => setShowGuideModal(false)}></div>
            <div className="bg-white rounded-lg shadow-2xl z-50 p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">📖 SBT発行の使い方</h2>
                <button 
                  onClick={() => setShowGuideModal(false)}
                  className="text-gray-500 hover:text-gray-800 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-purple-600 mb-2">📋 基本的な流れ</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-3">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span>
                      <p><span className="font-semibold">テンプレート作成</span> - スタンプカードのデザイン（画像、名前、発行ルール）を作成します。</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span>
                      <p><span className="font-semibold">支払い完了を待つ</span> - ユーザーが QR コードで支払いを完了します。</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</span>
                      <p><span className="font-semibold">テンプレート選択</span> - 支払い一覧から支払い行を選び、ドロップダウンで「発行するテンプレート」を選択します。</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">4</span>
                      <p><span className="font-semibold">発行ボタンをクリック</span> - 隣の「発行」ボタンをクリックして、ブロックチェーンに SBT を記録します。</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">5</span>
                      <p><span className="font-semibold">MetaMask で確認</span> - MetaMask がネットワーク切替とトランザクション署名を求めてきます。「確認」をクリックして完了。</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold text-blue-600 mb-2">⚙️ 各セクションの説明</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold">📌 テンプレートセクション</p>
                      <p className="text-gray-600 mt-1">スタンプカードの「デザイン」を作成・編集・削除します。</p>
                    </div>
                    <div>
                      <p className="font-semibold">💳 支払い完了一覧</p>
                      <p className="text-gray-600 mt-1">お客様の支払いが完了した履歴が表示されます。ここで「発行テンプレート」を選んで「発行」ボタンで SBT をミントします。</p>
                    </div>
                    <div>
                      <p className="font-semibold">🎖️ SBT発行セクション</p>
                      <p className="text-gray-600 mt-1">発行済みの SBT 一覧と統計が表示されます。</p>
                      <p className="text-gray-600 mt-1">「発行先：」ドロップダウンで Polygon Mainnet（本番用）または Polygon Amoy（テスト用）を選択できます。</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold text-green-600 mb-2">✅ トラブルシューティング</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-semibold">❌ MetaMask が起動しない</p>
                      <p className="text-gray-600 mt-1">→ ブラウザに MetaMask がインストールされているか確認してください。メニューボタン から MetaMask アイコンをクリックしてログインしてください。</p>
                    </div>
                    <div>
                      <p className="font-semibold">❌ 「ネットワークが違う」エラー</p>
                      <p className="text-gray-600 mt-1">→ 「発行先」ドロップダウンで選んだネットワークに自動で切り替えます。MetaMask の確認ダイアログで「切り替え」をクリックしてください。</p>
                    </div>
                    <div>
                      <p className="font-semibold">❌ ガス代が不足している</p>
                      <p className="text-gray-600 mt-1">→ Polygon Mainnet を使用の場合は取引所等からPOLを購入、Polygon Amoy（テスト用）の場合は <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Polygon Faucet</a> からPOLを取得してください。</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                  <p className="text-xs font-semibold text-blue-900 mb-1">💡 ヒント</p>
                  <p className="text-xs text-blue-800">一度に複数の支払いから SBT を発行する場合は、支払い行ごとにテンプレートを選んで発行ボタンを押してください。</p>
                </div>

                <button
                  onClick={() => setShowGuideModal(false)}
                  className="w-full mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* テンプレート管理 */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">テンプレート</h2>
            <button
              onClick={() => {
                if (editingTemplateId) {
                  setEditingTemplateId(null);
                  setImagePreview('');
                  setNewTemplate({
                    name: '',
                    description: '',
                    issuePattern: 'per_payment' as IssuePattern,
                    maxStamps: 10,
                    timePeriodDays: 30,
                    periodStartDate: '',
                    periodEndDate: '',
                    rewardDescription: '',
                    imageUrl: '',
                    imageMimeType: 'image/jpeg',
                  });
                }
                setShowTemplateForm(!showTemplateForm);
              }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition duration-200 text-sm sm:text-base min-h-[44px]"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{editingTemplateId ? '編集をキャンセル' : '新規作成'}</span>
              <span className="sm:hidden">{editingTemplateId ? 'キャンセル' : '新規'}</span>
            </button>
          </div>

          {/* テンプレート使用ガイド */}
          <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-purple-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-purple-900 text-sm sm:text-base">テンプレート利用ガイド</h4>
                <div className="text-xs sm:text-sm text-gray-700 space-y-1.5">
                  <p className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-purple-600 font-bold">①</span>
                    <span><strong>初期テンプレート(0x00000001～0x00000003)</strong>: テスト・参考用のサンプルです。店頭で直接SBT発行のテストにご利用ください。</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-purple-600 font-bold">②</span>
                    <span><strong>オリジナルテンプレート</strong>: 本番運用では、テンプレートをコピー/編集して作成した<strong className="text-purple-700 bg-purple-100 px-1 rounded">オリジナルのテンプレート</strong>をご利用ください。</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-purple-600 font-bold">③</span>
                    <span><strong>QR決済履歴からのSBT発行</strong>: 支払い完了一覧からSBTを発行する際は、オリジナルテンプレートのみが表示されます。</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {showTemplateForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <form onSubmit={addTemplate} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingTemplateId ? '✏️ テンプレート編集' : '➕ 新規テンプレート作成'}
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="例: コーヒーカード"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">説明 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="例: 毎回の支払いでスタンプ付与"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SBT画像 <span className="text-red-500">*</span></label>
                  <p className="text-xs text-gray-500 mb-2">512px × 512px の JPEG 画像をアップロード（最大3MB）</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleImageUpload}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">PNG/JPEG ファイルをサポート</p>
                    </div>
                    {imagePreview && (
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-400 flex items-center justify-center bg-gray-100">
                          <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                        </div>
                        {editingTemplateId && (
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview('');
                              setNewTemplate({ ...newTemplate, imageUrl: '' });
                            }}
                            className="text-xs text-red-600 mt-1 hover:text-red-800"
                          >
                            画像変更
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">発行パターン <span className="text-red-500">*</span></label>
                  <select
                    value={newTemplate.issuePattern}
                    onChange={(e) => setNewTemplate({ ...newTemplate, issuePattern: e.target.value as IssuePattern })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="per_payment">毎回発行 - 支払いの度にSBTを発行</option>
                    <option value="after_count">N回後発行 - 指定回数の支払い達成時に発行</option>
                    <option value="time_period">期間内発行 - 指定期間内の支払いで発行（固定30日）</option>
                    <option value="period_range">期間指定発行 - 開始日～終了日を自由に指定</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {newTemplate.issuePattern === 'per_payment' && 'スタンプ最大数'}
                      {newTemplate.issuePattern === 'after_count' && '達成条件回数'}
                      {newTemplate.issuePattern === 'time_period' && 'スタンプ最大数'}
                      {newTemplate.issuePattern === 'period_range' && 'スタンプ最大数'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newTemplate.maxStamps}
                      onChange={(e) => setNewTemplate({ ...newTemplate, maxStamps: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newTemplate.issuePattern === 'per_payment' && '例: 10回でカード完成'}
                      {newTemplate.issuePattern === 'after_count' && '例: 10回支払ったらSBT発行'}
                      {newTemplate.issuePattern === 'time_period' && '例: 期間内に達成したらSBT発行'}
                      {newTemplate.issuePattern === 'period_range' && '例: 期間指定内の支払いでSBT発行'}
                    </p>
                  </div>
                  {newTemplate.issuePattern === 'time_period' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">有効期間（日数）</label>
                      <input
                        type="number"
                        min="1"
                        value={newTemplate.timePeriodDays || 30}
                        onChange={(e) => setNewTemplate({ ...newTemplate, timePeriodDays: parseInt(e.target.value) || 30 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">例: 30日間のキャンペーン</p>
                    </div>
                  )}
                  {newTemplate.issuePattern === 'period_range' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">キャンペーン開始日</label>
                      <input
                        type="date"
                        value={newTemplate.periodStartDate}
                        onChange={(e) => setNewTemplate({ ...newTemplate, periodStartDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                  {newTemplate.issuePattern !== 'time_period' && newTemplate.issuePattern !== 'period_range' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">特典内容</label>
                      <input
                        type="text"
                        value={newTemplate.rewardDescription}
                        onChange={(e) => setNewTemplate({ ...newTemplate, rewardDescription: e.target.value })}
                        placeholder="例: コーヒー1杯無料"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
                {newTemplate.issuePattern === 'period_range' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">キャンペーン終了日</label>
                    <input
                      type="date"
                      value={newTemplate.periodEndDate}
                      onChange={(e) => setNewTemplate({ ...newTemplate, periodEndDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
                {newTemplate.issuePattern === 'time_period' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">特典内容</label>
                    <input
                      type="text"
                      value={newTemplate.rewardDescription}
                      onChange={(e) => setNewTemplate({ ...newTemplate, rewardDescription: e.target.value })}
                      placeholder="例: キャンペーン期間内の支払いで特別SBT"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
                {newTemplate.issuePattern === 'period_range' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">特典内容</label>
                    <input
                      type="text"
                      value={newTemplate.rewardDescription}
                      onChange={(e) => setNewTemplate({ ...newTemplate, rewardDescription: e.target.value })}
                      placeholder="例: 期間指定キャンペーンの特別SBT"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    {editingTemplateId ? '✅ 更新保存' : '➕ 作成'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateForm(false);
                      setEditingTemplateId(null);
                      setImagePreview('');
                      setNewTemplate({
                        name: '',
                        description: '',
                        issuePattern: 'per_payment' as IssuePattern,
                        maxStamps: 10,
                        timePeriodDays: 30,
                        periodStartDate: '',
                        periodEndDate: '',
                        rewardDescription: '',
                        imageUrl: '',
                        imageMimeType: 'image/jpeg',
                      });
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-200">
                <div className="h-24 sm:h-28 md:h-32 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  {template.imageUrl ? (
                    <img src={template.imageUrl} alt={template.name} className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-cover rounded-full border-2 border-white" />
                  ) : (
                    <Award className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-white opacity-50" />
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">{template.name}</h3>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(formatShopIdAsHex(template.shopId));
                        toast.success(`コピーしました: ${formatShopIdAsHex(template.shopId)}`);
                      }}
                      className="ml-2 p-1 hover:bg-gray-100 rounded transition"
                      title="ショップIDをコピー"
                    >
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 font-mono bg-amber-50 px-2 py-1 rounded inline-block">
                    🆔 {formatShopIdAsHex(template.shopId)}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                  <div className="mb-3 text-sm space-y-1">
                    <div className="px-2 py-1 bg-blue-50 rounded text-blue-700 text-xs font-medium">
                      {template.issuePattern === 'per_payment' && '🎁 毎回発行'}
                      {template.issuePattern === 'after_count' && `🔢 ${template.maxStamps}回後発行`}
                      {template.issuePattern === 'time_period' && `📅 ${template.timePeriodDays}日間キャンペーン`}
                      {template.issuePattern === 'period_range' && `📅 ${template.periodStartDate} ～ ${template.periodEndDate}`}
                    </div>
                    <p className="text-gray-700">
                      <span className="font-semibold">スタンプ最大:</span> {template.maxStamps}個
                    </p>
                    {template.rewardDescription && (
                      <p className="text-gray-700">
                        <span className="font-semibold">特典:</span> {template.rewardDescription}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <button 
                      onClick={() => editTemplate(template)}
                      className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
                    >
                      <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">編集</span>
                    </button>
                    <button
                      onClick={() => copyTemplateAsNew(template)}
                      className="flex-1 p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">コピー</span>
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      disabled={issuedSBTs.some((sbt) => sbt.templateId === template.id && sbt.status === 'redeemed')}
                      className={`flex-1 p-2 rounded-lg transition flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] ${
                        issuedSBTs.some((sbt) => sbt.templateId === template.id && sbt.status === 'redeemed')
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-100 hover:bg-red-200 text-red-600'
                      }`}
                      title={
                        issuedSBTs.some((sbt) => sbt.templateId === template.id && sbt.status === 'redeemed')
                          ? '完了済みSBTがあるため削除できません'
                          : ''
                      }
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">削除</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 完了した支払いセッション一覧 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">支払い完了一覧</h2>
          {completedPayments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-500">完了した支払いセッションはありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedPayments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">{payment.amount} {payment.currency} - {payment.chainName}</h3>
                      <p className="text-sm text-gray-600 mb-2">決済日: {payment.detectedAt}</p>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">支払者アドレス</p>
                        <p className="text-xs font-mono text-gray-700 mt-1" title={payment.payerAddress}>
                          {shortenAddress(payment.payerAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={paymentTemplateSelection[payment.id] || ''}
                            onChange={(e) => setPaymentTemplateSelection(prev => ({ ...prev, [payment.id]: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                            disabled={paymentSBTStatus[payment.id]?.status === 'issuing'}
                          >
                            <option value="">テンプレートを選択</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={async (e) => {
                              const selectedTemplateId = paymentTemplateSelection[payment.id];
                              if (!selectedTemplateId) {
                                toast.error('発行するテンプレートを選択してください');
                                return;
                              }
                              
                              // 選択を先にリセット(重複呼び出し防止)
                              setPaymentTemplateSelection(prev => ({ ...prev, [payment.id]: '' }));
                              
                              // issueSBT は form submit ハンドラを期待するため、Event を渡す
                              const fakeEvent = new Event('submit') as any;
                              await issueSBT(fakeEvent, payment.id, selectedTemplateId);
                            }}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={!walletAddress || paymentSBTStatus[payment.id]?.status === 'issuing'}
                          >
                            {paymentSBTStatus[payment.id]?.status === 'issuing' ? '発行中...' : '発行'}
                          </button>
                        </div>
                        {/* SBT発行状態の表示 */}
                        {paymentSBTStatus[payment.id] && paymentSBTStatus[payment.id].status !== 'idle' && (
                          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            paymentSBTStatus[payment.id].status === 'issuing' ? 'bg-blue-50 text-blue-700' :
                            paymentSBTStatus[payment.id].status === 'success' ? 'bg-green-50 text-green-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            <div className="flex items-center gap-2">
                              {paymentSBTStatus[payment.id].status === 'issuing' && (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                              )}
                              {paymentSBTStatus[payment.id].status === 'success' && (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              {paymentSBTStatus[payment.id].status === 'failed' && (
                                <AlertCircle className="w-4 h-4" />
                              )}
                              <span>{paymentSBTStatus[payment.id].message}</span>
                            </div>
                            {paymentSBTStatus[payment.id].txHash && (
                              <a
                                href={getBlockExplorerUrl(paymentSBTStatus[payment.id].txHash!, selectedChainForSBT)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline mt-1 block hover:text-green-900"
                              >
                                トランザクションを確認 ↗
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SBT発行 */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">SBT発行</h2>
          </div>

          {/* 📡 ネットワーク情報表示 */}
          <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Server className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-2">📡 接続情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600 text-xs">選択中のネットワーク</p>
                    <p className="font-mono font-bold text-blue-900">{selectedNetworkInfo.displayName}</p>
                    <p className="text-gray-500 text-xs mt-1">Chain ID: {selectedChainForSBT}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600 text-xs">SBTコントラクトアドレス</p>
                    {selectedNetworkInfo.contractAddress === '0x0000000000000000000000000000000000000000' ? (
                      <div>
                        <p className="font-mono text-xs text-red-600">未デプロイ</p>
                        <p className="text-red-600 text-xs mt-1">⚠️ このネットワークではまだデプロイされていません</p>
                      </div>
                    ) : selectedNetworkInfo.contractAddress === '未デプロイ' ? (
                      <div>
                        <p className="font-mono text-xs text-gray-400">設定なし</p>
                        <p className="text-gray-500 text-xs mt-1">このネットワークは未サポートです</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-mono text-xs text-blue-900 break-all">{selectedNetworkInfo.contractAddress}</p>
                        <p className="text-green-600 text-xs mt-1">✅ デプロイ済み</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* コントラクト情報の詳細表示 */}
                {contractOwner && (
                  <div className="mt-3 bg-white rounded p-2">
                    <p className="text-gray-600 text-xs">コントラクトオーナー</p>
                    <p className="font-mono text-xs text-gray-900 break-all">{contractOwner}</p>
                  </div>
                )}
                
                {shopInfo?.owner && (
                  <div className="mt-2 bg-white rounded p-2">
                    <p className="text-gray-600 text-xs">ショップオーナー (ID: 1)</p>
                    <p className="font-mono text-xs text-gray-900 break-all">{shopInfo.owner}</p>
                    <p className="text-gray-500 text-xs mt-1">店舗名: {shopInfo.name || shopInfo.shopInfo?.name || '未設定'}</p>
                  </div>
                )}
                
                {!contractOwner && selectedNetworkInfo.contractAddress && selectedNetworkInfo.contractAddress !== '未デプロイ' && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2">
                    <p className="text-xs text-yellow-800">
                      ⚠️ コントラクト情報を取得できません。以下を確認してください:
                    </p>
                    <ul className="text-xs text-yellow-700 mt-1 space-y-1 ml-4">
                      <li>• コントラクトが正しくデプロイされているか</li>
                      <li>• RPC接続が正常か（MetaMaskのネットワーク設定）</li>
                      <li>• コントラクトアドレスが正しいか</li>
                    </ul>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-semibold"
                    >
                      🔄 再読み込み
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 🚀 コントラクト未デプロイ警告 (Mainnetのみ) */}
          {selectedChainForSBT === 137 && selectedNetworkInfo.contractAddress === '0x0000000000000000000000000000000000000000' && (
            <div className="mb-6 bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-orange-900 mb-2">🚀 Polygon Mainnet: コントラクト未デプロイ</h3>
                  <p className="text-sm text-orange-800 mb-3">
                    Polygon Mainnetにはまだコントラクトがデプロイされていません。初回デプロイを実行してください。
                  </p>
                  
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <h4 className="font-semibold text-orange-900 text-sm mb-2">📋 デプロイ手順:</h4>
                    <ol className="text-sm text-orange-800 space-y-1 list-decimal ml-5">
                      <li>contracts/.envファイルにPOLYGON_PRIVATE_KEYを設定</li>
                      <li>ウォレットに十分なPOL（約0.01 POL以上）を準備</li>
                      <li>コマンドを実行: <code className="bg-orange-100 px-2 py-0.5 rounded font-mono text-xs">cd contracts && npx hardhat run deploy-mainnet.js --network polygon</code></li>
                      <li>デプロイ完了後、表示されたコントラクトアドレスを src/config/contracts.ts の 137: に設定</li>
                      <li>アプリをリロードして使用開始</li>
                    </ol>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                    <p className="font-semibold text-blue-900 mb-1">💡 テスト環境で試す場合</p>
                    <p className="text-blue-800">ネットワーク選択で「Polygon Amoy (Testnet)」に切り替えてください。テストネットは既にデプロイ済みです。</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ⚠️ コントラクト認可警告 */}
          {!isContractOwner && !isShopOwner && walletAddress && selectedNetworkInfo.contractAddress !== '0x0000000000000000000000000000000000000000' && (
            <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-2">⚠️ SBT発行権限がありません</h3>
                  <p className="text-sm text-red-800 mb-3">
                    スマートコントラクトへのミント権限がありません。以下のいずれかが必要です：
                  </p>
                  <ul className="text-sm text-red-800 space-y-1 mb-3">
                    <li>✓ コントラクトオーナーアカウント</li>
                    <li>✓ ショップID 1のオーナーアカウント</li>
                  </ul>
                  <div className="bg-white rounded p-3 text-xs font-mono space-y-1 mb-3">
                    <p><span className="text-gray-600">コントラクトオーナー:</span> <span className="text-gray-900">{contractOwner?.slice(0, 12)}...{contractOwner?.slice(-8)}</span></p>
                    <p><span className="text-gray-600">ショップオーナー (ID:1):</span> <span className="text-gray-900">{shopInfo?.owner ? `${shopInfo.owner.slice(0, 12)}...${shopInfo.owner.slice(-8)}` : '未登録'}</span></p>
                    <p><span className="text-gray-600">現在のウォレット:</span> <span className="text-gray-900">{walletAddress?.slice(0, 12)}...{walletAddress?.slice(-8)}</span></p>
                  </div>

                  {/* ショップ登録案内 */}
                  {!shopInfo?.owner && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                      <h4 className="font-semibold text-blue-900 text-sm mb-2">🏪 ショップオーナーとして登録する</h4>
                      <p className="text-xs text-blue-800 mb-2">
                        設定画面で登録したショップオーナーアドレスをブロックチェーンに記録します。
                      </p>
                      <button
                        onClick={async () => {
                          // 設定画面のショップ情報を取得
                          const savedShopInfo = localStorage.getItem('shop-info');
                          if (!savedShopInfo) {
                            toast.error('まず設定画面で店舗情報を登録してください');
                            return;
                          }

                          const shopData = JSON.parse(savedShopInfo);
                          if (!shopData.ownerAddress) {
                            toast.error('設定画面でショップオーナーアドレスを設定してください');
                            return;
                          }

                          if (!shopData.name) {
                            toast.error('設定画面で店舗名を設定してください');
                            return;
                          }

                          setIsRegisteringShop(true);
                          try {
                            const result = await registerShop({
                              shopId: 1,
                              shopName: shopData.name,
                              description: shopData.description || `${shopData.name}のスタンプカード`,
                              shopOwnerAddress: shopData.ownerAddress,
                              requiredVisits: 10,
                              chainId: selectedChainForSBT,
                            });

                            if (result.success) {
                              toast.success(`🎉 ショップオーナー登録完了！\nオーナー: ${shopData.ownerAddress.slice(0, 10)}...\nこのアドレスでSBTを発行できます。`, {
                                duration: 8000
                              });
                              // ページをリロードして権限を再確認
                              setTimeout(() => window.location.reload(), 2000);
                            } else {
                              toast.error(result.error || 'ショップ登録に失敗しました');
                            }
                          } catch (error: any) {
                            toast.error(`登録エラー: ${error.message}`);
                          } finally {
                            setIsRegisteringShop(false);
                          }
                        }}
                        disabled={isRegisteringShop}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold text-sm transition"
                      >
                        {isRegisteringShop ? '登録中...' : '🏪 ショップオーナーとして登録する'}
                      </button>
                      <p className="text-xs text-blue-700 mt-2">
                        💡 MetaMaskで署名が必要です（ガス代: 約0.01 POL）
                      </p>
                    </div>
                  )}
                  
                  {/* デバッグ用: 権限状態を表示 */}
                  <div className="bg-yellow-50 rounded p-2 text-xs mb-3 font-mono">
                    <p className="font-bold mb-2">🔍 デバッグ情報:</p>
                    <p>Contract Owner Flag: <span className="font-bold">{isContractOwner ? 'true' : 'false'}</span></p>
                    <p>Shop Owner Flag: <span className="font-bold">{isShopOwner ? 'true' : 'false'}</span></p>
                    <p>Wallet Connected: <span className="font-bold">{walletAddress ? 'true' : 'false'}</span></p>
                    <p className="mt-2">Contract Owner Addr:</p>
                    <p className="break-all">{contractOwner || 'null'}</p>
                    <p className="mt-1">Wallet Addr:</p>
                    <p className="break-all">{walletAddress || 'null'}</p>
                    <p className="mt-1">Shop Owner Addr:</p>
                    <p className="break-all">{shopInfo?.owner || 'null'}</p>
                    <p className="mt-2 text-red-600">比較結果:</p>
                    <p>Contract == Wallet: {contractOwner && walletAddress ? (contractOwner.toLowerCase() === walletAddress.toLowerCase() ? '✅ TRUE' : '❌ FALSE') : 'N/A'}</p>
                    <p>Shop == Wallet: {shopInfo?.owner && walletAddress ? (shopInfo.owner.toLowerCase() === walletAddress.toLowerCase() ? '✅ TRUE' : '❌ FALSE') : 'N/A'}</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      console.log('🔄 手動権限再チェック開始');
                      console.log('Contract Owner State:', isContractOwner);
                      console.log('Shop Owner State:', isShopOwner);
                      window.location.reload();
                    }}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition mb-2"
                  >
                    🔄 権限情報を再読み込み
                  </button>
                  
                  {isContractOwner && !isShopOwner && (
                    <button
                      onClick={() => setShowRegisterShopModal(true)}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm transition"
                    >
                      ショップを登録する
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ✅ コントラクト認可成功 */}
          {(isContractOwner || isShopOwner) && (
            <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-green-900">✅ SBT発行権限OK</h3>
                  <p className="text-sm text-green-800 mt-1">
                    {isContractOwner 
                      ? 'コントラクトオーナーとしてSBTをミントできます' 
                      : 'ショップオーナーとしてSBTをミントできます'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 統計ダッシュボード */}
          {issuedSBTs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📊 発行・配布統計ダッシュボード</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">配布総数</p>
                  <p className="text-3xl font-bold text-blue-600">{issuedSBTs.length}</p>
                  <p className="text-xs text-gray-600 mt-2">{new Set(issuedSBTs.map(s => s.recipientAddress)).size}個の異なるウォレット</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">有効SBT</p>
                  <p className="text-3xl font-bold text-green-600">{issuedSBTs.filter(s => s.status === 'active').length}</p>
                  <p className="text-xs text-gray-600 mt-2">進行中</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">特典獲得済み</p>
                  <p className="text-3xl font-bold text-orange-600">{issuedSBTs.filter(s => s.status === 'redeemed').length}</p>
                  <p className="text-xs text-gray-600 mt-2">完了</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">SBTの種類</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {new Set(issuedSBTs.map(s => s.templateId)).size}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">発行されたテンプレートの種類数です。テンプレート別の配布数は下の「テンプレート別発行統計」をご覧ください。</p>
                </div>
              </div>
            </div>
          )}

          {/* 配布先ウォレット統計セクション */}
          {issuedSBTs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">👛 配布先ウォレット統計</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(
                  issuedSBTs.reduce((acc, sbt) => {
                    const addr = sbt.recipientAddress;
                    if (!acc[addr]) {
                      acc[addr] = {
                        address: addr,
                        totalSBTs: 0,
                        activeSBTs: 0,
                        redeemedSBTs: 0,
                        totalStamps: 0,
                        maxStamps: 0,
                      };
                    }
                    acc[addr].totalSBTs += 1;
                    acc[addr].totalStamps += sbt.currentStamps;
                    acc[addr].maxStamps += sbt.maxStamps;
                    if (sbt.status === 'active') acc[addr].activeSBTs += 1;
                    if (sbt.status === 'redeemed') acc[addr].redeemedSBTs += 1;
                    return acc;
                  }, {} as Record<string, any>)
                ).map(([address, stats]) => (
                  <div key={address} className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 font-medium mb-1">ウォレットアドレス</p>
                      <p className="font-mono text-xs text-gray-900" title={address}>{shortenAddress(address)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">SBT総数</p>
                        <p className="text-lg font-bold text-purple-600">{stats.totalSBTs}</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">有効</p>
                        <p className="text-lg font-bold text-green-600">{stats.activeSBTs}</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">特典獲得</p>
                        <p className="text-lg font-bold text-blue-600">{stats.redeemedSBTs}</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">スタンプ合計</p>
                        <p className="text-sm font-bold text-orange-600">{stats.totalStamps}/{stats.maxStamps}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-1">進捗</p>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(stats.totalStamps / stats.maxStamps) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* テンプレート別発行統計 */}
          {issuedSBTs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 テンプレート別発行統計</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(new Set(issuedSBTs.map(s => s.templateId)))
                  .map(templateId => {
                    const template = templates.find(t => t.id === templateId);
                    const sbtsForTemplate = issuedSBTs.filter(s => s.templateId === templateId);
                    const activeSBTs = sbtsForTemplate.filter(s => s.status === 'active').length;
                    const redeemedSBTs = sbtsForTemplate.filter(s => s.status === 'redeemed').length;
                    const totalStamps = sbtsForTemplate.reduce((sum, s) => sum + s.currentStamps, 0);
                    const maxStamps = sbtsForTemplate.reduce((sum, s) => sum + s.maxStamps, 0);
                    
                    return (
                      <div key={templateId} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">{template?.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{template?.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-600">{sbtsForTemplate.length}</p>
                            <p className="text-xs text-gray-600">配布済み</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-gray-600">有効</p>
                            <p className="font-bold text-green-600">{activeSBTs}</p>
                          </div>
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-gray-600">完了</p>
                            <p className="font-bold text-blue-600">{redeemedSBTs}</p>
                          </div>
                          <div className="bg-orange-50 rounded p-2">
                            <p className="text-gray-600">スタンプ</p>
                            <p className="font-bold text-orange-600">{totalStamps}/{maxStamps}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                            style={{ width: `${(totalStamps / maxStamps) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {showIssuanceForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <form onSubmit={issueSBT} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート選択</label>
                  <select
                    value={newIssuance.templateId}
                    onChange={(e) => setNewIssuance({ ...newIssuance, templateId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">支払い元ウォレットアドレス</label>
                  <input
                    type="text"
                    value={walletAddress || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {walletAddress 
                      ? 'ウォレットから接続されているアドレスが自動的に使用されます'
                      : 'ウォレットを接続してください'}
                  </p>
                </div>

                {/* ガス代表示 */}
                {!loadingSBTGasEstimate && (
                  <div className={`p-3 rounded-lg border-2 ${
                    isLowCostNetwork(currentChainId || 137)
                      ? 'bg-green-50 border-green-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isLowCostNetwork(currentChainId || 137)
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`} />
                      <div className="flex-1 text-xs">
                        <p className={`font-semibold ${
                          isLowCostNetwork(currentChainId || 137)
                            ? 'text-green-900'
                            : 'text-orange-900'
                        }`}>
                          SBT発行ガス代推定
                        </p>
                        <p className={`${
                          isLowCostNetwork(currentChainId || 137)
                            ? 'text-green-800'
                            : 'text-orange-800'
                        }`}>
                          {estimatedSBTGasPOL} POL
                          {sbtGasPrice && <span className="ml-2 text-gray-600">（{sbtGasPrice} Gwei）</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ガス代読み込み中 */}
                {loadingSBTGasEstimate && (
                  <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="animate-spin">⏳</div>
                      SBT発行ガス代を計算中...
                    </div>
                  </div>
                )}

                {/* SBT発行ガス代不足警告 */}
                {hasInsufficientSBTGas && walletPolBalance !== null && (
                  <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-red-900">⚠️ SBT発行ガス代が不足しています</p>
                        <p className="text-red-800 mt-1">
                          必要: {estimatedSBTGasPOL} POL<br />
                          現在: {(walletPolBalance / BigInt(10 ** 18)).toString()} POL
                        </p>
                        <p className="text-red-700 mt-2">
                          このネットワークでSBTを発行するにはPOLが足りません。
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

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!walletAddress}
                    className={`flex-1 font-bold py-2 px-4 rounded-lg transition duration-200 ${
                      walletAddress
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    発行
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIssuanceForm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-6">
            {issuedSBTs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">発行済みのSBTはまだありません</p>
              </div>
            ) : (
              <>
                {/* PC向けテーブルビュー */}
                <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                          <th className="px-6 py-3 text-left text-sm font-semibold">配布先ウォレット</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">SBT名</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">発行状況</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">累計スタンプ</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">発行日</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">ステータス</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">進捗</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuedSBTs.map((sbt, idx) => {
                          // 同じウォレット+テンプレートの累計スタンプ数を計算
                          const cumulativeStamps = issuedSBTs.filter(
                            s => s.recipientAddress.toLowerCase() === sbt.recipientAddress.toLowerCase() &&
                                 s.templateId === sbt.templateId &&
                                 new Date(s.issuedAt) <= new Date(sbt.issuedAt)
                          ).length;
                          
                          return (
                          <tr
                            key={sbt.id}
                            onClick={() => setSelectedSBT(sbt)}
                            role="button"
                            tabIndex={0}
                            className={`border-b ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            } hover:bg-purple-50 transition cursor-pointer`}
                          >
                            <td className="px-6 py-4 text-sm font-mono text-gray-900">
                              <div className="truncate" title={sbt.recipientAddress}>
                                {sbt.recipientAddress.slice(0, 12)}...{sbt.recipientAddress.slice(-8)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {sbt.templateName}
                            </td>
                            <td className="px-6 py-4 text-sm text-center">
                              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                                ✅ 1個発行
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-center">
                              <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">
                                {cumulativeStamps}/{sbt.maxStamps}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-center text-gray-600">
                              {sbt.issuedAt}
                            </td>
                            <td className="px-6 py-4 text-sm text-center">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                  sbt.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {sbt.status === 'active' ? '有効' : '特典獲得'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                                  style={{ width: `${(cumulativeStamps / sbt.maxStamps) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ショップ登録モーダル */}
                {showRegisterShopModal && (
                  <div className="fixed inset-0 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black opacity-40 z-40" onClick={() => setShowRegisterShopModal(false)}></div>
                    <div className="bg-white rounded-lg shadow-lg z-50 p-6 max-w-lg w-full mx-4 relative">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-bold">ショップを登録する</h3>
                        <button onClick={() => setShowRegisterShopModal(false)} className="text-gray-500 hover:text-gray-800">✕</button>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        現在のウォレットをショップID 1 のオーナーとして登録します。店舗情報は設定画面の内容が使用されます。
                      </p>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          
                          setIsRegisteringShop(true);
                          
                          const result = await registerShop({
                            shopId: 1,
                            shopName: shopSettings.name,
                            description: shopSettings.description || 'SBT対応店舗',
                            shopOwnerAddress: walletAddress || '',
                            requiredVisits: 1,
                            chainId: selectedChainForSBT,
                          });
                          
                          if (result.success) {
                            toast.success('ショップが登録されました！');
                            setShowRegisterShopModal(false);
                            // ショップ情報を再度取得
                            const shopInfo = await getShopInfo(1, selectedChainForSBT);
                            setShopInfo(shopInfo);
                            setIsShopOwner(true);
                          } else {
                            toast.error(result.error || 'ショップ登録に失敗しました');
                          }
                          setIsRegisteringShop(false);
                        }}
                        className="space-y-4"
                      >
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">使用される店舗情報</h4>
                          <div className="text-sm text-blue-800 space-y-1">
                            <p><strong>店舗名:</strong> {shopSettings.name}</p>
                            <p><strong>店舗ID:</strong> {shopSettings.id}</p>
                            <p><strong>説明:</strong> {shopSettings.description || 'SBT対応店舗'}</p>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            ⚙️ これらの設定は「設定」画面で変更できます
                          </p>
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setShowRegisterShopModal(false)}
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
                          >
                            キャンセル
                          </button>
                          <button
                            type="submit"
                            disabled={isRegisteringShop}
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                          >
                            {isRegisteringShop ? '登録中...' : 'ショップを登録'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* SBT詳細モーダル */}
                {selectedSBT && (
                  <div className="fixed inset-0 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black opacity-40 z-40" onClick={() => setSelectedSBT(null)}></div>
                    <div className="bg-white rounded-lg shadow-lg z-50 p-6 max-w-lg w-full mx-4 relative">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-bold">SBT 詳細</h3>
                        <button 
                          onClick={() => setSelectedSBT(null)} 
                          className="text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center"
                          title="閉じる"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-4 text-sm space-y-2">
                        <p><span className="font-semibold">配布先:</span> <span className="font-mono">{selectedSBT.recipientAddress}</span></p>
                        <p><span className="font-semibold">SBT名:</span> {selectedSBT.templateName}</p>
                        <p><span className="font-semibold">スタンプ:</span> {selectedSBT.currentStamps}/{selectedSBT.maxStamps}</p>
                        <p><span className="font-semibold">発行日:</span> {selectedSBT.issuedAt}</p>
                        <p><span className="font-semibold">ステータス:</span> {selectedSBT.status}</p>
                        
                        {/* ネットワーク情報 */}
                        {selectedSBT.chainId && (
                          <div className="bg-gray-50 p-3 rounded border">
                            <p><span className="font-semibold">発行ネットワーク:</span> <span className={`font-medium ${getNetworkByChainId(selectedSBT.chainId)?.isTestnet ? 'text-orange-600' : 'text-green-600'}`}>
                              {getNetworkDisplayInfo(selectedSBT.chainId).displayName}
                              {getNetworkByChainId(selectedSBT.chainId)?.isTestnet ? ' (テスト用)' : ' (本番用)'}
                            </span></p>
                            <p><span className="font-semibold">Chain ID:</span> <span className="font-mono">{selectedSBT.chainId}</span></p>
                            <div className="mt-2">
                              <span className="font-semibold">コントラクト:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-xs bg-white px-2 py-1 rounded border break-all flex-1">{getSBTContractAddress(selectedSBT.chainId)}</span>
                                <a
                                  href={selectedSBT.chainId === 80002 
                                    ? `https://amoy.polygonscan.com/address/${getSBTContractAddress(selectedSBT.chainId)}`
                                    : `https://polygonscan.com/address/${getSBTContractAddress(selectedSBT.chainId)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 whitespace-nowrap"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="text-xs">確認</span>
                                </a>
                              </div>
                            </div>
                            
                            {/* 🎨 NFT画像表示リンク */}
                            {selectedSBT.tokenId && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="font-semibold mb-2 flex items-center gap-1">
                                  <Image className="w-4 h-4" />
                                  NFT画像を表示
                                </p>
                                <div className="space-y-2">
                                  {(() => {
                                    const nftUrls = getNFTDisplayUrls(
                                      getSBTContractAddress(selectedSBT.chainId),
                                      selectedSBT.tokenId,
                                      selectedSBT.chainId
                                    );
                                    return (
                                      <>
                                        <a
                                          href={nftUrls.polygonscan}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded border border-purple-200 transition"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          <span className="flex-1">PolygonScanでNFT表示</span>
                                          <span className="text-purple-500">→</span>
                                        </a>
                                        {nftUrls.opensea ? (
                                          <a
                                            href={nftUrls.opensea}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded border border-blue-200 transition"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                            <span className="flex-1">OpenSeaでNFT表示</span>
                                            <span className="text-blue-500">→</span>
                                          </a>
                                        ) : (
                                          <div className="text-xs bg-gray-50 text-gray-600 px-3 py-2 rounded border border-gray-200">
                                            <p className="font-semibold mb-1">⚠️ OpenSeaテストネット終了</p>
                                            <p className="text-xs">OpenSeaは2024年にテストネットサポートを終了しました。本番環境(Mainnet)のみ対応しています。</p>
                                          </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                          💡 PolygonScanでSBT画像とメタデータを確認できます
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedSBT.transactionHash && (
                          <p>
                            <span className="font-semibold">支払い Tx:</span>{' '}
                            <a href={getBlockExplorerUrl(selectedSBT.transactionHash, selectedSBT.chainId || selectedChainForSBT)} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
                              {selectedSBT.transactionHash}
                            </a>
                          </p>
                        )}
                        {selectedSBT.sbtTransactionHash && (
                          <p>
                            <span className="font-semibold">SBT発行 Tx:</span>{' '}
                            <a href={getBlockExplorerUrl(selectedSBT.sbtTransactionHash, selectedSBT.chainId || selectedChainForSBT)} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
                              {selectedSBT.sbtTransactionHash}
                            </a>
                          </p>
                        )}
                        {selectedSBT.chainId && <p><span className="font-semibold">チェーンID:</span> {selectedSBT.chainId}</p>}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => setSelectedSBT(null)} className="px-4 py-2 bg-gray-200 rounded">閉じる</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* タブレット・スマホ向けカードビュー */}
                <div className="lg:hidden space-y-6">
                  {/* ウォレットアドレス単位でグループ化 */}
                  {Object.entries(
                    issuedSBTs.reduce((acc, sbt) => {
                      const addr = sbt.recipientAddress;
                      if (!acc[addr]) acc[addr] = [];
                      acc[addr].push(sbt);
                      return acc;
                    }, {} as Record<string, IssuedSBT[]>)
                  ).map(([address, sbtsForAddress]) => (
                    <div key={address} className="space-y-4">
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl px-6 py-4 text-white">
                        <h3 className="font-bold text-lg mb-1">ウォレット</h3>
                        <p className="font-mono text-sm break-all">{address}</p>
                      </div>
                      <div className="space-y-4">
                        {sbtsForAddress.map((sbt) => {
                          // 同じウォレット+テンプレートの累計スタンプ数を計算
                          const cumulativeStamps = issuedSBTs.filter(
                            s => s.recipientAddress.toLowerCase() === sbt.recipientAddress.toLowerCase() &&
                                 s.templateId === sbt.templateId &&
                                 new Date(s.issuedAt) <= new Date(sbt.issuedAt)
                          ).length;
                          
                          return (
                            <SBTCard key={sbt.id} sbt={sbt} cumulativeStamps={cumulativeStamps} />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* エクスポート・インポートモーダル */}
        {showExportModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={() => setShowExportModal(false)}></div>
            <div className="bg-white rounded-lg shadow-2xl z-50 p-8 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">📦 データ管理</h2>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-500 hover:text-gray-800 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* エクスポートセクション */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-green-900 mb-3">📥 データエクスポート</h3>
                  <p className="text-sm text-green-800 mb-4">
                    すべてのテンプレート、SBT、画像データをJSONファイルでダウンロードします。
                    ネットワーク情報も含まれ、PWA対応により他のデバイスやユーザーと共有できます。
                  </p>
                  <div className="bg-green-100 rounded p-3 text-xs text-green-800 mb-4">
                    <p className="font-semibold mb-1">💡 含まれるデータ:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>テンプレート: {templates.length}件</li>
                      <li>発行済みSBT: {issuedSBTs.length}件</li>
                      <li>画像データ: ローカル保存済み（Base64形式）</li>
                      <li>ネットワーク情報: {currentNetworkInfo.displayName}</li>
                      <li>コントラクトアドレス: {currentNetworkInfo.contractAddress}</li>
                      <li>ショップID情報とメタデータ</li>
                    </ul>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                  >
                    {isExporting ? '📥 エクスポート中...' : '📥 データをエクスポート'}
                  </button>
                </div>

                {/* インポートセクション */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">📤 データインポート</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    エクスポートしたJSONファイルを選択してデータを復元します。
                    ネットワーク情報も確認され、異なるネットワーク間のインポート時には警告が表示されます。
                    既存データは上書きされますのでご注意ください。
                  </p>
                  <div className="mb-4">
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {importFile && (
                      <p className="text-xs text-blue-600 mt-1">
                        選択ファイル: {importFile.name} ({Math.round(importFile.size / 1024)}KB)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !importFile}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                  >
                    {isImporting ? '📤 インポート中...' : '📤 データをインポート'}
                  </button>
                </div>

                {/* PWA説明 */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-purple-900 mb-2">🚀 PWA（Progressive Web App）対応</h3>
                  <div className="text-xs text-purple-800 space-y-1">
                    <p>• <span className="font-semibold">オフライン対応:</span> テンプレート作成・管理は通信不要</p>
                    <p>• <span className="font-semibold">画像ローカル保存:</span> アップロード画像をブラウザに永続保存</p>
                    <p>• <span className="font-semibold">データポータブル:</span> エクスポート/インポートで他デバイス移行可能</p>
                    <p>• <span className="font-semibold">アプリライク:</span> ホーム画面への追加可能</p>
                    <p className="pt-2 text-purple-600">※ SBT発行時のみブロックチェーン・IPFS通信が必要です</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowExportModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SBTManagement;
