import { PinataUploadResponse, PinataMetadata, SBTMetadata } from '../types';
import { PINATA_CONFIG } from '../config';
import { getErrorMessage } from '../utils/helpers';
import { getSBTRank, generateBenefits, type ShopSettings } from './shopSettings';

interface PinataApiResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface PinataListResponse {
  count: number;
  rows: Array<{
    id: string;
    ipfs_pin_hash: string;
    size: number;
    user_id: string;
    date_pinned: string;
    date_unpinned: string | null;
    metadata: {
      name?: string;
      keyvalues?: Record<string, any>;
    };
    regions: Array<{
      regionId: string;
      currentReplicationCount: number;
      desiredReplicationCount: number;
    }>;
  }>;
}

export class PinataService {
  public apiKey: string;
  public secretKey: string;
  public jwt?: string;
  private baseUrl: string;

  constructor(apiKey?: string, secretKey?: string, jwt?: string) {
    // プロパティを初期化
    this.apiKey = '';
    this.secretKey = '';
    this.jwt = '';
    this.baseUrl = PINATA_CONFIG.baseUrl;
    
    // ローカルストレージから設定読み込み
    this.loadFromLocalStorage();
    
    // 引数が指定されていれば優先使用
    this.apiKey = apiKey || this.apiKey || PINATA_CONFIG.apiKey;
    this.secretKey = secretKey || this.secretKey || PINATA_CONFIG.apiSecret;
    this.jwt = jwt || this.jwt || PINATA_CONFIG.jwt;
    this.baseUrl = PINATA_CONFIG.baseUrl;

    console.log('🔧 Pinata初期化:', {
      hasApiKey: !!this.apiKey,
      hasSecretKey: !!this.secretKey,
      hasJwt: !!this.jwt,
    });
  }

  /**
   * ローカルストレージから設定を読み込み
   */
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('pinata-config');
      if (saved) {
        const config = JSON.parse(saved);
        this.apiKey = config.apiKey || '';
        this.secretKey = config.secretKey || '';
        this.jwt = config.jwt || '';
      }
    } catch (error) {
      console.warn('⚠️ Pinataローカル設定読み込みエラー:', error);
      this.apiKey = '';
      this.secretKey = '';
    }
  }

  /**
   * 設定の動的更新
   */
  public updateConfig(apiKey: string, secretKey: string, jwt?: string): void {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    if (jwt) {
      this.jwt = jwt;
    }
    console.log('🔄 Pinata設定更新完了');
  }

  /**
   * APIリクエストの基本ヘッダー
   */
  private getHeaders(): Headers {
    const headers = new Headers();
    
    // JWTまたはAPI Key/Secretをチェック
    if (!this.jwt && (!this.apiKey || !this.secretKey)) {
      throw new Error('Pinata API credentials not configured. Please set up API key and secret in Settings.');
    }

    // JWTが利用可能であればJWTを優先
    if (this.jwt) {
      headers.append('Authorization', `Bearer ${this.jwt}`);
    } else {
      headers.append('pinata_api_key', this.apiKey);
      headers.append('pinata_api_secret', this.secretKey);
    }
    return headers;
  }

  /**
   * API接続テスト
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/data/testAuthentication`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return data.message === 'Congratulations! You are communicating with the Pinata API!';
      }
      return false;
    } catch (error) {
      console.error('Pinata authentication test failed:', error);
      return false;
    }
  }

  /**
   * ファイルをPinataにアップロード
   */
  async uploadFile(
    file: File,
    metadata?: PinataMetadata
  ): Promise<PinataUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (metadata) {
        const pinataMetadata = {
          name: metadata.name || file.name,
          keyvalues: {
            description: metadata.description,
            uploadedAt: new Date().toISOString(),
            fileType: file.type,
            fileSize: file.size.toString(),
          },
        };
        formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
      }

      const headers = this.getHeaders();
      const response = await fetch(`${this.baseUrl}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Upload failed with status: ${response.status}`
        );
      }

      const data: PinataApiResponse = await response.json();
      
      return {
        IpfsHash: data.IpfsHash,
        PinSize: data.PinSize,
        Timestamp: data.Timestamp,
      };
    } catch (error) {
      throw new Error(`File upload failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * JSONデータをPinataにアップロード
   */
  async uploadJSON(
    jsonObject: any,
    metadata?: PinataMetadata
  ): Promise<PinataUploadResponse> {
    try {
      const headers = this.getHeaders();
      headers.set('Content-Type', 'application/json');

      const requestBody: any = {
        pinataContent: jsonObject,
      };

      if (metadata) {
        requestBody.pinataMetadata = {
          name: metadata.name,
          keyvalues: {
            description: metadata.description,
            uploadedAt: new Date().toISOString(),
            dataType: 'json',
          },
        };
      }

      const response = await fetch(`${this.baseUrl}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `JSON upload failed with status: ${response.status}`
        );
      }

      const data: PinataApiResponse = await response.json();
      
      return {
        IpfsHash: data.IpfsHash,
        PinSize: data.PinSize,
        Timestamp: data.Timestamp,
      };
    } catch (error) {
      throw new Error(`JSON upload failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * SBT用メタデータをPinataにアップロード
   */
  async uploadSBTMetadata(
    metadata: SBTMetadata,
    name?: string
  ): Promise<{ metadataHash: string; metadataUri: string }> {
    try {
      const result = await this.uploadJSON(metadata, {
        name: name || `SBT Metadata - ${metadata.name}`,
        description: `SBT metadata for ${metadata.name}`,
      });

      return {
        metadataHash: result.IpfsHash,
        metadataUri: `ipfs://${result.IpfsHash}`,
      };
    } catch (error) {
      throw new Error(`SBT metadata upload failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 画像ファイルをアップロードしてSBTメタデータを作成
   */
  async createSBTWithImage(
    imageFile: File,
    sbtName: string,
    sbtDescription: string,
    attributes?: Array<{ trait_type: string; value: string | number }>,
    customMetadata?: Partial<SBTMetadata>
  ): Promise<{ imageHash: string; metadataHash: string; tokenURI: string }> {
    try {
      // 1. 画像をアップロード
      const imageResult = await this.uploadFile(imageFile, {
        name: `${sbtName} - Image`,
        description: `Image for SBT: ${sbtName}`,
      });

      // 2. メタデータを作成
      const metadata: SBTMetadata = {
        name: sbtName,
        description: sbtDescription,
        image: `ipfs://${imageResult.IpfsHash}`,
        attributes: attributes || [],
        ...customMetadata,
      };

      // 3. メタデータをアップロード
      const metadataResult = await this.uploadSBTMetadata(metadata, sbtName);

      return {
        imageHash: imageResult.IpfsHash,
        metadataHash: metadataResult.metadataHash,
        tokenURI: metadataResult.metadataUri,
      };
    } catch (error) {
      throw new Error(`SBT creation failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 店舗情報とテンプレートから動的にSBTメタデータを作成
   */
  async createDynamicSBTWithImage(
    imageFile: File,
    sbtName: string,
    sbtDescription: string,
    shopSettings: ShopSettings,
    template: {
      shopId: number;
      maxStamps: number;
      rewardDescription: string;
      issuePattern: string;
    }
  ): Promise<{ imageHash: string; metadataHash: string; tokenURI: string }> {
    try {
      // 1. 画像をアップロード
      const imageResult = await this.uploadFile(imageFile, {
        name: `${sbtName} - Image`,
        description: `Image for SBT: ${sbtName}`,
      });

      // 2. ランクを決定（shopSettingsのカスタム閾値を使用）
      const rank = getSBTRank(template.maxStamps, shopSettings);

      // 3. 特典リストを生成
      const benefits = generateBenefits(template.rewardDescription);

      // 4. 動的メタデータを作成（ユーザーの要求に従った形式）
      const metadata: SBTMetadata = {
        name: sbtName,
        description: sbtDescription,
        image: `ipfs://${imageResult.IpfsHash}`,
        shopId: template.shopId,
        required_visits: template.maxStamps,
        benefits: benefits,
        attributes: [
          {
            trait_type: 'Shop Name',
            value: shopSettings.name
          },
          {
            trait_type: 'Shop Category',
            value: shopSettings.category || 'その他'
          },
          {
            trait_type: 'Required Visits',
            value: template.maxStamps
          },
          {
            trait_type: 'Rank',
            value: rank
          },
          {
            trait_type: '発行パターン',
            value: template.issuePattern
          }
        ]
      };

      console.log('📋 動的SBTメタデータ生成:', metadata);

      // 5. メタデータをアップロード
      const metadataResult = await this.uploadSBTMetadata(metadata, sbtName);

      return {
        imageHash: imageResult.IpfsHash,
        metadataHash: metadataResult.metadataHash,
        tokenURI: metadataResult.metadataUri,
      };
    } catch (error) {
      throw new Error(`Dynamic SBT creation failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * ピン留めされたファイル一覧を取得
   */
  async listPinnedFiles(
    limit: number = 10,
    offset: number = 0,
    name?: string
  ): Promise<PinataListResponse> {
    try {
      const params = new URLSearchParams({
        pageLimit: limit.toString(),
        pageOffset: offset.toString(),
        status: 'pinned',
      });

      if (name) {
        params.append('metadata[name]', name);
      }

      const headers = this.getHeaders();
      const response = await fetch(
        `${this.baseUrl}/data/pinList?${params.toString()}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to list pinned files: ${getErrorMessage(error)}`);
    }
  }

  /**
   * ファイルのピン留めを解除
   */
  async unpinFile(ipfsHash: string): Promise<void> {
    try {
      const headers = this.getHeaders();
      const response = await fetch(
        `${this.baseUrl}/pinning/unpin/${ipfsHash}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to unpin file: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to unpin file: ${getErrorMessage(error)}`);
    }
  }

  /**
   * IPFSハッシュからPublic URLを生成
   */
  static getPublicUrl(ipfsHash: string, gateway?: string): string {
    const gatewayUrl = gateway || PINATA_CONFIG.gateway;
    return `${gatewayUrl}/${ipfsHash}`;
  }

  /**
   * IPFS URIからPublic URLを生成
   */
  static ipfsUriToUrl(ipfsUri: string, gateway?: string): string {
    if (!ipfsUri.startsWith('ipfs://')) {
      return ipfsUri; // 既にHTTP URLの場合はそのまま返す
    }
    
    const hash = ipfsUri.replace('ipfs://', '');
    return this.getPublicUrl(hash, gateway);
  }

  /**
   * 複数のゲートウェイを試して最初に応答するURLを取得
   */
  static async getAccessibleUrl(ipfsHash: string): Promise<string> {
    const gateways = [
      PINATA_CONFIG.gateway,
      ...PINATA_CONFIG.alternativeGateways,
    ];

    for (const gateway of gateways) {
      try {
        const url = `${gateway}/${ipfsHash}`;
        const response = await fetch(url, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000) 
        });
        
        if (response.ok) {
          return url;
        }
      } catch (error) {
        // このゲートウェイは応答しないので次を試す
        continue;
      }
    }

    // すべてのゲートウェイが失敗した場合はデフォルトを返す
    return this.getPublicUrl(ipfsHash);
  }

  /**
   * 接続テスト用メソッド
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // JWTまたはAPI Key/Secretをチェック
      if (!this.jwt && (!this.apiKey || !this.secretKey)) {
        return {
          success: false,
          message: 'API credentials not configured'
        };
      }

      const response = await fetch(`${this.baseUrl}/data/testAuthentication`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful'
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error}`
      };
    }
  }

  /**
   * ファイルサイズとファイル形式の妥当性チェック
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `ファイルサイズが大きすぎます。${maxSize / 1024 / 1024}MB以下にしてください。`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `サポートされていないファイル形式です。JPEG、PNG、GIF、SVG、WebPのみ対応しています。`,
      };
    }

    return { valid: true };
  }

  /**
   * 画像のプレビューURL生成
   */
  static createPreviewUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to create preview URL'));
      reader.readAsDataURL(file);
    });
  }
}

// Default instance
export const pinataService = new PinataService();