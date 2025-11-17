import React, { useState, useEffect } from 'react';
import { Award, Plus, Edit2, Trash2, Send, ExternalLink, Zap, AlertCircle, HelpCircle, Wallet, CheckCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../context/WalletContext';
import { sbtStorage } from '../utils/storage';
import { mintSBT, getBlockExplorerUrl, getContractOwner, getShopInfo, registerShop } from '../utils/sbtMinting';
import { NETWORKS, getNetworkByChainId } from '../config/networks';
import { getSBTContractAddress } from '../config/contracts';
import { BrowserProvider } from 'ethers';
import { getNetworkGasPrice, formatGasCostPOL, formatGasPriceGwei, isLowCostNetwork } from '../utils/gasEstimation';
import SBTCard from '../components/SBTCard';
import { pinataService } from '../utils/pinata';
import { formatShopIdAsHex, generateNonConflictingShopId, generateUniqueShopId } from '../utils/shopIdGenerator';
import { getShopSettings } from '../utils/shopSettings';

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
  const { address: walletAddress, chainId: currentChainId } = useWallet();
  
  // ネットワーク情報を取得
  const currentNetworkInfo = getNetworkDisplayInfo(currentChainId);
  
  // 初期テンプレート用のショップID（固定値）
  // 毎回変わらないように固定値を使用
  const initialShopIds = {
    stampCard: 1, // ショップID: 1
    milestone: 2, // ショップID: 2 
    campaign: 3,  // ショップID: 3
  };
  
  const [templates, setTemplates] = useState<SBTTemplate[]>([
    {
      id: 'template-stamp-card',
      shopId: initialShopIds.stampCard,
      name: 'スタンプカード',
      description: '毎回の支払いでスタンプを1つ獲得',
      issuePattern: 'per_payment',
      maxStamps: 10,
      rewardDescription: 'スタンプ1個',
      imageUrl: '/sbt-images/visit-memorial.png',
      imageMimeType: 'image/png',
      createdAt: '2025-11-14',
      status: 'active',
    },
    {
      id: 'template-milestone',
      shopId: initialShopIds.milestone,
      name: 'マイルストーン達成',
      description: '10回の支払い達成時にバッジを授与',
      issuePattern: 'after_count',
      maxStamps: 10,
      rewardDescription: 'ゴールド会員バッジ',
      imageUrl: '/sbt-images/milestone-10x.png',
      imageMimeType: 'image/png',
      createdAt: '2025-11-14',
      status: 'active',
    },
    {
      id: 'template-campaign',
      shopId: initialShopIds.campaign,
      name: 'キャンペーン記念',
      description: 'キャンペーン期間内（30日）の支払いで期間限定メダルを取得',
      issuePattern: 'time_period',
      maxStamps: 5,
      timePeriodDays: 30,
      rewardDescription: 'キャンペーン記念メダル',
      imageUrl: '/sbt-images/campaign-limited.png',
      imageMimeType: 'image/png',
      createdAt: '2025-11-14',
      status: 'active',
    },
  ]);

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
  // completedPayments 各行のテンプレート選択状態（自動発行を防ぐために選択と発行を分離）
  const [paymentTemplateSelection, setPaymentTemplateSelection] = useState<Record<string, string>>({});
  
  // SBT発行先ネットワーク（Polygon Mainnet または Amoy Testnet）
  const [selectedChainForSBT, setSelectedChainForSBT] = useState(80002); // デフォルトはPolygon Amoy（テストネット）
  
  // 選択されたネットワークの情報を取得
  const selectedNetworkInfo = getNetworkDisplayInfo(selectedChainForSBT);

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

  // マウント時: IndexedDB + localStorage からデータを読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // テンプレートを読み込み
        const savedTemplates = await sbtStorage.getAllTemplates();
        if (savedTemplates.length > 0) {
          setTemplates(savedTemplates);
          console.log(`✅ ${savedTemplates.length}個のテンプレートをロード`);
          
          // 使用済みショップIDをローカルストレージに記録（重複防止用）
          try {
            const usedShopIds = savedTemplates.map(t => t.shopId).filter(Boolean);
            localStorage.setItem('used-shop-ids', JSON.stringify([...new Set(usedShopIds)]));
          } catch (error) {
            console.warn('使用済みショップID保存エラー:', error);
          }
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

        // コントラクト所有者を確認（Polygon Amoy testnet を確認）
        if (selectedChainForSBT) {
          try {
            const ownerResult = await getContractOwner(selectedChainForSBT);
            if (ownerResult.owner) {
              setContractOwner(ownerResult.owner);
              
              // 現在のウォレットがオーナーか確認
              if (walletAddress && ownerResult.owner.toLowerCase() === walletAddress.toLowerCase()) {
                setIsContractOwner(true);
                console.log('✅ 現在のウォレットはコントラクトオーナーです');
              } else {
                setIsContractOwner(false);
              }

              // ショップ情報を取得（shopId = 1 を確認）
              const shopResult = await getShopInfo(1, selectedChainForSBT);
              if (shopResult.owner) {
                setShopInfo(shopResult);
                if (walletAddress && shopResult.owner.toLowerCase() === walletAddress.toLowerCase()) {
                  setIsShopOwner(true);
                  console.log('✅ 現在のウォレットはショップオーナー（ID: 1）です');
                } else {
                  setIsShopOwner(false);
                }
              }
            } else if (ownerResult.error) {
              console.warn('⚠️ コントラクト所有者取得エラー:', ownerResult.error);
            }
          } catch (ownerError) {
            console.warn('⚠️ コントラクト所有者確認エラー:', ownerError);
          }
        }

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
    const checkContractOwnership = async () => {
      if (!selectedChainForSBT || !walletAddress) {
        // ウォレットが接続されていない場合は権限を無効化
        setIsContractOwner(false);
        setIsShopOwner(false);
        return;
      }

      console.log(`🔍 コントラクト所有者情報を確認中: Chain ${selectedChainForSBT}, Wallet: ${walletAddress}`);

      try {
        const ownerResult = await getContractOwner(selectedChainForSBT);
        if (ownerResult.owner) {
          setContractOwner(ownerResult.owner);
          console.log(`📋 コントラクトオーナー: ${ownerResult.owner}`);
          
          if (walletAddress && ownerResult.owner.toLowerCase() === walletAddress.toLowerCase()) {
            setIsContractOwner(true);
            console.log('✅ 現在のウォレットはコントラクトオーナーです');
            console.log(`🔍 権限確認 - Contract: ${ownerResult.owner.toLowerCase()} == Wallet: ${walletAddress.toLowerCase()}`);
          } else {
            setIsContractOwner(false);
            console.log('❌ 現在のウォレットはコントラクトオーナーではありません');
            console.log(`🔍 権限確認 - Contract: ${ownerResult.owner.toLowerCase()} != Wallet: ${walletAddress?.toLowerCase() || 'null'}`);
          }

          // ショップ情報を取得
          const shopResult = await getShopInfo(1, selectedChainForSBT);
          if (shopResult.owner) {
            setShopInfo(shopResult);
            console.log(`📋 ショップオーナー (ID:1): ${shopResult.owner}`);
            if (walletAddress && shopResult.owner.toLowerCase() === walletAddress.toLowerCase()) {
              setIsShopOwner(true);
              console.log('✅ 現在のウォレットはショップオーナー (ID:1) です');
              console.log(`🔍 ショップ権限確認 - Shop: ${shopResult.owner.toLowerCase()} == Wallet: ${walletAddress.toLowerCase()}`);
            } else {
              setIsShopOwner(false);
              console.log('❌ 現在のウォレットはショップオーナー (ID:1) ではありません');
              console.log(`🔍 ショップ権限確認 - Shop: ${shopResult.owner.toLowerCase()} != Wallet: ${walletAddress?.toLowerCase() || 'null'}`);
            }
          } else {
            setShopInfo(null);
            setIsShopOwner(false);
            if (shopResult.error) {
              console.warn(`⚠️ ショップ情報取得エラー: ${shopResult.error}`);
            }
          }
        } else if (ownerResult.error) {
          console.warn(`⚠️ コントラクトオーナー取得エラー: ${ownerResult.error}`);
        }
      } catch (error) {
        console.error('❌ コントラクト所有者確認エラー:', error);
      }
    };

    checkContractOwnership();
    
    // ウォレットアドレスとチェーンの両方が設定されたらショップ確認
    if (walletAddress && selectedChainForSBT) {
      setTimeout(() => checkAndRegisterInitialShops(), 500); // 0.5秒後に実行
    }
  }, [selectedChainForSBT, walletAddress]);

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
        exportSource: 'SBT JPYC Pay Management'
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

    setTemplates(templates.filter((t) => t.id !== id));
    
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
      const updatedTemplates = [newTemplateData, ...templates];
      setTemplates(updatedTemplates);

      // IndexedDB に保存
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

    // テンプレートIDの決定（引数から渡された場合はそれを優先、なければnewIssuanceから）
    const templateId = selectedTemplateId || newIssuance.templateId;
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
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

    // 基本的な SBT オブジェクトを作成
    const sbt: IssuedSBT = {
      id: `sbt-${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      recipientAddress,
      currentStamps: 0,
      maxStamps: template.maxStamps,
      issuedAt: new Date().toISOString().split('T')[0],
      status: 'active',
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

        // 店舗設定を取得
        const shopSettings = getShopSettings();
        console.log('📋 店舗設定:', shopSettings);

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

      // ユーザーにネットワーク切替が発生する旨を通知
      toast('🔁 発行先ネットワークへウォレットを切り替えます。MetaMaskの確認を許可してください', { icon: '🔁' });

      // SBT mint 実行（テンプレートのshopIdを使用）
      const result = await mintSBT({
        recipientAddress,
        shopId: template.shopId, // テンプレートのshopIdを使用
        tokenURI,
        chainId: selectedChainForSBT, // ユーザーが選択したネットワーク
      });

      if (result.success && result.transactionHash) {
        // ✅ mint 成功
        sbt.sbtTransactionHash = result.transactionHash;
        sbt.sbtMintStatus = 'success';
        
        // IndexedDB に保存
        await sbtStorage.saveSBT(sbt);

        // 表示を更新
        setIssuedSBTs(prev =>
          prev.map(s => (s.id === sbt.id ? sbt : s))
        );

        toast.success(
          `✅ SBT をブロックチェーンに記録しました！\nTx: ${result.transactionHash.slice(0, 10)}...`,
          { id: mintingToast }
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

      console.error('SBT mint エラー:', error);
      toast.error(
        `SBT 記録エラー: ${error.message || 'Unknown error'}`,
        { id: mintingToast }
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* MetaMask 接続チェック警告 */}
        {!window.ethereum ? (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
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

        {/* ネットワーク情報表示 */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 現在のネットワーク */}
            <div className="bg-white p-3 rounded border">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                現在接続中のネットワーク
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">ネットワーク:</span> <span className={`font-medium ${currentChainId ? (getNetworkByChainId(currentChainId)?.isTestnet ? 'text-orange-600' : 'text-green-600') : 'text-gray-600'}`}>
                  {getNetworkDisplayInfo(currentChainId).displayName}
                  {currentChainId && (getNetworkByChainId(currentChainId)?.isTestnet ? ' (テスト用)' : ' (本番用)')}
                </span></p>
                <p><span className="text-gray-600">Chain ID:</span> <span className="font-mono">{currentChainId || '未接続'}</span></p>
                <p><span className="text-gray-600">SBTコントラクト:</span> <span className="font-mono text-xs break-all">{getNetworkDisplayInfo(currentChainId).contractAddress}</span></p>
              </div>
            </div>
            
            {/* SBT発行対象ネットワーク */}
            <div className="bg-white p-3 rounded border">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                SBT発行対象ネットワーク
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">ネットワーク:</span> <span className={`font-medium ${getNetworkByChainId(selectedChainForSBT)?.isTestnet ? 'text-orange-600' : 'text-green-600'}`}>
                  {getNetworkDisplayInfo(selectedChainForSBT).displayName}
                  {getNetworkByChainId(selectedChainForSBT)?.isTestnet ? ' (テスト用)' : ' (本番用)'}
                </span></p>
                <p><span className="text-gray-600">Chain ID:</span> <span className="font-mono">{selectedChainForSBT}</span></p>
                <p><span className="text-gray-600">SBTコントラクト:</span> <span className="font-mono text-xs break-all">{getNetworkDisplayInfo(selectedChainForSBT).contractAddress}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Award className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">SBT管理</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition"
                title="データをエクスポート・インポート"
              >
                <ExternalLink className="w-5 h-5" />
                データ管理
              </button>
              <button
                onClick={() => setShowGuideModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition"
                title="使い方ガイドを表示"
              >
                <HelpCircle className="w-5 h-5" />
                使い方ガイド
              </button>
            </div>
          </div>
          <p className="text-gray-600">スタンプカードテンプレートの作成・管理と発行（PWA対応、画像ローカル保存、データエクスポート可能）</p>
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">テンプレート</h2>
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
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              <Plus className="w-5 h-5" />
              {editingTemplateId ? '編集をキャンセル' : '新規作成'}
            </button>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">報酬内容</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">報酬内容</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">報酬内容</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-200">
                <div className="h-32 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  {template.imageUrl ? (
                    <img src={template.imageUrl} alt={template.name} className="h-24 w-24 object-cover rounded-full border-2 border-white" />
                  ) : (
                    <Award className="w-24 h-24 text-white opacity-50" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{template.name}</h3>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(formatShopIdAsHex(template.shopId));
                        toast.success(`コピーしました: ${formatShopIdAsHex(template.shopId)}`);
                      }}
                      className="ml-2 p-1 hover:bg-gray-100 rounded transition"
                      title="ショップIDをコピー"
                    >
                      <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
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
                        <span className="font-semibold">報酬:</span> {template.rewardDescription}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => editTemplate(template)}
                      className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      編集
                    </button>
                    <button
                      onClick={() => copyTemplateAsNew(template)}
                      className="flex-1 p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      コピー
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      disabled={issuedSBTs.some((sbt) => sbt.templateId === template.id && sbt.status === 'redeemed')}
                      className={`flex-1 p-2 rounded-lg transition flex items-center justify-center gap-2 ${
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
                      <Trash2 className="w-4 h-4" />
                      削除
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
                        <p className="text-xs font-mono text-gray-700 break-all mt-1">
                          {payment.payerAddress}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={paymentTemplateSelection[payment.id] || ''}
                          onChange={(e) => setPaymentTemplateSelection(prev => ({ ...prev, [payment.id]: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                        >
                          <option value="">テンプレートを選択</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={(e) => {
                            const selectedTemplateId = paymentTemplateSelection[payment.id];
                            if (!selectedTemplateId) {
                              toast.error('発行するテンプレートを選択してください');
                              return;
                            }
                            // issueSBT は form submit ハンドラを期待するため、Event を渡す
                            const fakeEvent = new Event('submit') as any;
                            issueSBT(fakeEvent, payment.id, selectedTemplateId);
                            // 発行後に選択をリセット
                            setPaymentTemplateSelection(prev => ({ ...prev, [payment.id]: '' }));
                          }}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                          disabled={!walletAddress}
                        >
                          発行
                        </button>
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
            {/* 発行先ネットワーク選択 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">発行先チェーン:</label>
              <select
                value={selectedChainForSBT}
                onChange={(e) => setSelectedChainForSBT(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value={137}>Polygon Mainnet（本番用）</option>
                <option value={80002}>Polygon Amoy（テスト用）</option>
              </select>
            </div>
          </div>

          {/* ⚠️ コントラクト認可警告 */}
          {!isContractOwner && !isShopOwner && walletAddress && (
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
                    <p><span className="text-gray-600">ショップオーナー (ID:1):</span> <span className="text-gray-900">{shopInfo?.owner?.slice(0, 12)}...{shopInfo?.owner?.slice(-8)}</span></p>
                    <p><span className="text-gray-600">現在のウォレット:</span> <span className="text-gray-900">{walletAddress?.slice(0, 12)}...{walletAddress?.slice(-8)}</span></p>
                  </div>
                  
                  {/* デバッグ用: 権限状態を表示 */}
                  <div className="bg-yellow-50 rounded p-2 text-xs mb-3">
                    <p>🔍 デバッグ情報:</p>
                    <p>Contract Owner: {isContractOwner ? 'true' : 'false'}</p>
                    <p>Shop Owner: {isShopOwner ? 'true' : 'false'}</p>
                    <p>Wallet Connected: {walletAddress ? 'true' : 'false'}</p>
                    <p>Contract Address: {contractOwner?.toLowerCase()}</p>
                    <p>Wallet Address: {walletAddress?.toLowerCase()}</p>
                    <p>Shop Owner Address: {shopInfo?.owner?.toLowerCase()}</p>
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
                  <p className="text-xs text-gray-600 font-medium mb-1">報酬獲得済み</p>
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
                      <p className="font-mono text-xs text-gray-900 break-all">{address}</p>
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
                        <p className="text-xs text-gray-600">報酬獲得</p>
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
                        {isLowCostNetwork(currentChainId || 137) && (
                          <p className="text-green-700 mt-1">💡 ガスレス決済：お店がガス代を負担します</p>
                        )}
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
                          <th className="px-6 py-3 text-center text-sm font-semibold">スタンプ</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">発行日</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">ステータス</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">進捗</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuedSBTs.map((sbt, idx) => (
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
                              <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">
                                {sbt.currentStamps}/{sbt.maxStamps}
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
                                {sbt.status === 'active' ? '有効' : '報酬獲得'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                                  style={{ width: `${(sbt.currentStamps / sbt.maxStamps) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
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
                          
                          // 設定画面の店舗情報を取得
                          const shopSettings = getShopSettings();
                          
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
                            <p><strong>店舗名:</strong> {getShopSettings().name}</p>
                            <p><strong>店舗ID:</strong> {getShopSettings().id}</p>
                            <p><strong>カテゴリ:</strong> {getShopSettings().category || '未設定'}</p>
                            <p><strong>説明:</strong> {getShopSettings().description || 'SBT対応店舗'}</p>
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
                            <p><span className="font-semibold">コントラクト:</span> <span className="font-mono text-xs break-all">{getSBTContractAddress(selectedSBT.chainId)}</span></p>
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
                        {sbtsForAddress.map((sbt) => (
                          <SBTCard key={sbt.id} sbt={sbt} />
                        ))}
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
