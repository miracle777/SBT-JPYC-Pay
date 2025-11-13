import { PinataUploadResponse, PinataMetadata, SBTMetadata } from '../types';
import { PINATA_CONFIG } from '../config';
import { getErrorMessage } from '../utils/helpers';

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
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || PINATA_CONFIG.apiKey;
    this.apiSecret = apiSecret || PINATA_CONFIG.apiSecret;
    this.baseUrl = PINATA_CONFIG.baseUrl;

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Pinata API credentials are required');
    }
  }

  /**
   * APIリクエストの基本ヘッダー
   */
  private getHeaders(): Headers {
    const headers = new Headers();
    headers.append('pinata_api_key', this.apiKey);
    headers.append('pinata_api_secret', this.apiSecret);
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