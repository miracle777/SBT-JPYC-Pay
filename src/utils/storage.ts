/**
 * IndexedDB + localStorage によるデータ永続化ユーティリティ
 * 
 * 店舗側の SBT テンプレートと発行履歴をブラウザローカルに永続的に保存
 * オフライン対応 + デスクトップアプリ対応
 */

// IndexedDB データベース設定
const DB_NAME = 'SBT_JPYC_PAY';
const DB_VERSION = 2; // 画像ストア追加のためバージョンアップ
const TEMPLATE_STORE = 'templates';
const ISSUED_SBT_STORE = 'issued_sbts';
const IMAGE_STORE = 'images'; // 画像専用ストア
const EXPORT_DATA_STORE = 'export_data'; // エクスポートデータ用ストア

interface StorageConfig {
  dbName?: string;
  version?: number;
}

class SBTStorage {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(config: StorageConfig = {}) {
    this.dbName = config.dbName || DB_NAME;
    this.version = config.version || DB_VERSION;
  }

  /**
   * IndexedDB を初期化
   */
  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB 初期化エラー:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB 初期化成功');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Templates ストア作成
        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
          const templateStore = db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
          templateStore.createIndex('status', 'status', { unique: false });
          templateStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('📋 Templates ストア作成');
        }

        // Issued SBTs ストア作成
        if (!db.objectStoreNames.contains(ISSUED_SBT_STORE)) {
          const issuedStore = db.createObjectStore(ISSUED_SBT_STORE, { keyPath: 'id' });
          issuedStore.createIndex('recipientAddress', 'recipientAddress', { unique: false });
          issuedStore.createIndex('templateId', 'templateId', { unique: false });
          issuedStore.createIndex('issuedAt', 'issuedAt', { unique: false });
          console.log('🎁 Issued SBTs ストア作成');
        }

        // Images ストア作成
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          const imageStore = db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
          imageStore.createIndex('templateId', 'templateId', { unique: false });
          imageStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('🖼️ Images ストア作成');
        }

        // Export Data ストア作成
        if (!db.objectStoreNames.contains(EXPORT_DATA_STORE)) {
          const exportStore = db.createObjectStore(EXPORT_DATA_STORE, { keyPath: 'id' });
          exportStore.createIndex('exportedAt', 'exportedAt', { unique: false });
          console.log('📦 Export Data ストア作成');
        }
      };
    });
  }

  /**
   * テンプレートを保存
   */
  async saveTemplate(template: any): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([TEMPLATE_STORE], 'readwrite');
      const store = transaction.objectStore(TEMPLATE_STORE);
      
      await new Promise((resolve, reject) => {
        const request = store.put(template);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      // localStorage にもバックアップ
      const key = `sbt_template_${template.id}`;
      localStorage.setItem(key, JSON.stringify(template));
      
      console.log(`📝 テンプレート保存: ${template.name}`);
    } catch (error) {
      console.error('テンプレート保存エラー:', error);
      throw error;
    }
  }

  /**
   * すべてのテンプレートを取得
   */
  async getAllTemplates(): Promise<any[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([TEMPLATE_STORE], 'readonly');
      const store = transaction.objectStore(TEMPLATE_STORE);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
      // IndexedDB 失敗時は localStorage からリカバリ
      return this.recoverTemplatesFromLocalStorage();
    }
  }

  /**
   * テンプレートを削除
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([TEMPLATE_STORE], 'readwrite');
      const store = transaction.objectStore(TEMPLATE_STORE);

      await new Promise((resolve, reject) => {
        const request = store.delete(templateId);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      localStorage.removeItem(`sbt_template_${templateId}`);
      console.log(`🗑️ テンプレート削除: ${templateId}`);
    } catch (error) {
      console.error('テンプレート削除エラー:', error);
      throw error;
    }
  }

  /**
   * 発行済み SBT を保存
   */
  async saveSBT(sbt: any): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([ISSUED_SBT_STORE], 'readwrite');
      const store = transaction.objectStore(ISSUED_SBT_STORE);

      await new Promise((resolve, reject) => {
        const request = store.put(sbt);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      // localStorage にもバックアップ
      const key = `issued_sbt_${sbt.id}`;
      localStorage.setItem(key, JSON.stringify(sbt));

      console.log(`🎖️ SBT 保存: ${sbt.templateName} → ${sbt.recipientAddress.slice(0, 8)}...`);
    } catch (error) {
      console.error('SBT 保存エラー:', error);
      throw error;
    }
  }

  /**
   * すべての発行済み SBT を取得
   */
  async getAllSBTs(): Promise<any[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([ISSUED_SBT_STORE], 'readonly');
      const store = transaction.objectStore(ISSUED_SBT_STORE);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('SBT 取得エラー:', error);
      // IndexedDB 失敗時は localStorage からリカバリ
      return this.recoverSBTsFromLocalStorage();
    }
  }

  /**
   * 特定のウォレットアドレスの SBT を取得
   */
  async getSBTsByAddress(address: string): Promise<any[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([ISSUED_SBT_STORE], 'readonly');
      const store = transaction.objectStore(ISSUED_SBT_STORE);
      const index = store.index('recipientAddress');

      return new Promise((resolve, reject) => {
        const request = index.getAll(address);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('アドレス別 SBT 取得エラー:', error);
      return [];
    }
  }

  /**
   * 発行済み SBT を削除
   */
  async deleteSBT(sbtId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([ISSUED_SBT_STORE], 'readwrite');
      const store = transaction.objectStore(ISSUED_SBT_STORE);

      await new Promise((resolve, reject) => {
        const request = store.delete(sbtId);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      localStorage.removeItem(`issued_sbt_${sbtId}`);
      console.log(`🗑️ SBT 削除: ${sbtId}`);
    } catch (error) {
      console.error('SBT 削除エラー:', error);
      throw error;
    }
  }

  /**
   * localStorage からテンプレートをリカバリ
   */
  private recoverTemplatesFromLocalStorage(): any[] {
    const templates: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sbt_template_')) {
        const data = localStorage.getItem(key);
        if (data) {
          templates.push(JSON.parse(data));
        }
      }
    }
    console.log(`⚠️ localStorage から${templates.length}個のテンプレートをリカバリ`);
    return templates;
  }

  /**
   * localStorage から SBT をリカバリ
   */
  private recoverSBTsFromLocalStorage(): any[] {
    const sbts: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('issued_sbt_')) {
        const data = localStorage.getItem(key);
        if (data) {
          sbts.push(JSON.parse(data));
        }
      }
    }
    console.log(`⚠️ localStorage から${sbts.length}個の SBT をリカバリ`);
    return sbts;
  }

  /**
   * 画像を保存（ローカル完結）
   */
  async saveImage(imageData: {
    id: string;
    templateId?: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
    size: number;
  }): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([IMAGE_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE);
      
      const imageRecord = {
        ...imageData,
        createdAt: new Date().toISOString(),
      };

      await new Promise((resolve, reject) => {
        const request = store.put(imageRecord);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      console.log(`🖼️ 画像保存: ${imageData.fileName} (${Math.round(imageData.size / 1024)}KB)`);
    } catch (error) {
      console.error('画像保存エラー:', error);
      throw error;
    }
  }

  /**
   * 画像を取得
   */
  async getImage(imageId: string): Promise<any | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([IMAGE_STORE], 'readonly');
      const store = transaction.objectStore(IMAGE_STORE);

      return new Promise((resolve, reject) => {
        const request = store.get(imageId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('画像取得エラー:', error);
      return null;
    }
  }

  /**
   * すべての画像を取得
   */
  async getAllImages(): Promise<any[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([IMAGE_STORE], 'readonly');
      const store = transaction.objectStore(IMAGE_STORE);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('画像一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * データベース全体をエクスポート（画像込み、PWA対応、ネットワーク情報付き）
   */
  async exportData(metadata?: any): Promise<{
    templates: any[];
    sbts: any[];
    images: any[];
    networkInfo?: any;
    metadata?: any;
    exportedAt: string;
    version: string;
    appName: string;
  }> {
    const templates = await this.getAllTemplates();
    const sbts = await this.getAllSBTs();
    const images = await this.getAllImages();
    
    const exportData = {
      templates,
      sbts,
      images,
      networkInfo: metadata?.currentNetwork || null,
      metadata: metadata || null,
      exportedAt: new Date().toISOString(),
      version: '2.1.0', // ネットワーク情報対応のためバージョンアップ
      appName: 'SBT masaru21 Pay(仮)',
    };

    // エクスポート履歴を保存
    await this.saveExportHistory(exportData);
    
    return exportData;
  }

  /**
   * エクスポート履歴を保存
   */
  private async saveExportHistory(exportData: any): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([EXPORT_DATA_STORE], 'readwrite');
      const store = transaction.objectStore(EXPORT_DATA_STORE);
      
      const historyRecord = {
        id: `export-${Date.now()}`,
        exportedAt: exportData.exportedAt,
        templateCount: exportData.templates.length,
        sbtCount: exportData.sbts.length,
        imageCount: exportData.images.length,
        size: JSON.stringify(exportData).length,
      };

      await new Promise((resolve, reject) => {
        const request = store.put(historyRecord);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('エクスポート履歴保存エラー:', error);
    }
  }

  /**
   * データをインポート（画像込み、PWA対応）
   */
  async importData(data: {
    templates: any[];
    sbts: any[];
    images?: any[];
    version?: string;
  }): Promise<void> {
    // テンプレートをインポート
    for (const template of data.templates) {
      await this.saveTemplate(template);
    }
    
    // SBTをインポート
    for (const sbt of data.sbts) {
      await this.saveSBT(sbt);
    }
    
    // 画像をインポート（v2.0.0以降）
    if (data.images && Array.isArray(data.images)) {
      for (const image of data.images) {
        try {
          await this.saveImage(image);
        } catch (error) {
          console.warn('画像インポートエラー:', error);
        }
      }
    }
    
    console.log(`✅ ${data.templates.length} テンプレート、${data.sbts.length} SBT${data.images ? `、${data.images.length} 画像` : ''} をインポート`);
  }

  /**
   * JSONファイルとしてエクスポート（ダウンロード）- ネットワーク情報付き
   */
  async downloadExport(filename?: string, metadata?: any): Promise<void> {
    const exportData = await this.exportData(metadata);
    const jsonString = JSON.stringify(exportData, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `sbt-jpyc-pay-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📥 エクスポート完了: ${a.download}`);
    console.log('📡 ネットワーク情報:', exportData.networkInfo);
  }

  /**
   * ファイルからインポート（アップロード）- ネットワーク情報対応
   */
  async uploadImport(file: File): Promise<{ networkInfo?: any; data: any }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          const data = JSON.parse(jsonString);
          
          // バリデーション
          if (!data.templates || !Array.isArray(data.templates)) {
            throw new Error('無効なエクスポートファイルです（テンプレートが見つかりません）');
          }
          
          // ネットワーク情報の確認
          if (data.networkInfo) {
            console.log('📡 インポートファイルのネットワーク情報:', data.networkInfo);
          }
          
          await this.importData(data);
          resolve({ networkInfo: data.networkInfo, data });
        } catch (error: any) {
          console.error('インポートエラー:', error);
          reject(new Error(`インポートに失敗しました: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * データベースをクリア
   */
  async clearAllData(): Promise<void> {
    try {
      const db = await this.initDB();
      
      // IndexedDB クリア
      const templateTx = db.transaction([TEMPLATE_STORE], 'readwrite');
      await new Promise((resolve, reject) => {
        const request = templateTx.objectStore(TEMPLATE_STORE).clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      const sbtTx = db.transaction([ISSUED_SBT_STORE], 'readwrite');
      await new Promise((resolve, reject) => {
        const request = sbtTx.objectStore(ISSUED_SBT_STORE).clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      // 画像ストアをクリア
      const imageTx = db.transaction([IMAGE_STORE], 'readwrite');
      await new Promise((resolve, reject) => {
        const request = imageTx.objectStore(IMAGE_STORE).clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      // エクスポートデータストアをクリア
      const exportTx = db.transaction([EXPORT_DATA_STORE], 'readwrite');
      await new Promise((resolve, reject) => {
        const request = exportTx.objectStore(EXPORT_DATA_STORE).clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      // localStorage クリア
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('sbt_template_') || key.startsWith('issued_sbt_') || key.startsWith('used-shop-ids')) {
          localStorage.removeItem(key);
        }
      }

      console.log('🧹 データベースをクリア（画像・エクスポート履歴も含む）');
    } catch (error) {
      console.error('データベースクリアエラー:', error);
      throw error;
    }
  }
}

// グローバルインスタンス
export const sbtStorage = new SBTStorage();

export default SBTStorage;
