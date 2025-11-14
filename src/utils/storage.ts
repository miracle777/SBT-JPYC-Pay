/**
 * IndexedDB + localStorage によるデータ永続化ユーティリティ
 * 
 * 店舗側の SBT テンプレートと発行履歴をブラウザローカルに永続的に保存
 * オフライン対応 + デスクトップアプリ対応
 */

// IndexedDB データベース設定
const DB_NAME = 'SBT_JPYC_PAY';
const DB_VERSION = 1;
const TEMPLATE_STORE = 'templates';
const ISSUED_SBT_STORE = 'issued_sbts';

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
   * データベース全体をエクスポート（バックアップ用）
   */
  async exportData(): Promise<{
    templates: any[];
    sbts: any[];
    exportedAt: string;
  }> {
    const templates = await this.getAllTemplates();
    const sbts = await this.getAllSBTs();
    
    return {
      templates,
      sbts,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * データをインポート（リストア用）
   */
  async importData(data: {
    templates: any[];
    sbts: any[];
  }): Promise<void> {
    for (const template of data.templates) {
      await this.saveTemplate(template);
    }
    for (const sbt of data.sbts) {
      await this.saveSBT(sbt);
    }
    console.log(`✅ ${data.templates.length} テンプレート、${data.sbts.length} SBT をインポート`);
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

      // localStorage クリア
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('sbt_template_') || key.startsWith('issued_sbt_')) {
          localStorage.removeItem(key);
        }
      }

      console.log('🧹 データベースをクリア');
    } catch (error) {
      console.error('データベースクリアエラー:', error);
      throw error;
    }
  }
}

// グローバルインスタンス
export const sbtStorage = new SBTStorage();

export default SBTStorage;
