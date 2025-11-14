# データ永続化の実装 - IndexedDB + localStorage ハイブリッド

## 📊 実装内容

### 1. 永続化方式：IndexedDB + localStorage

現在のプロトタイプは、以下の方式でデータを永続的に保存しています：

#### **IndexedDB（メイン）**
- ✅ ブラウザネイティブの NoSQL データベース
- ✅ 50MB～数GB まで保存可能
- ✅ 非同期 API で高速アクセス
- ✅ デスクトップアプリでも動作
- ✅ オフライン完全対応

#### **localStorage（バックアップ）**
- ✅ IndexedDB 失敗時のリカバリ
- ✅ ブラウザ設定で削除されにくい
- ✅ 即座なアクセス可能
- ⚠ 容量は 5-10MB 程度

### 2. データモデル

#### SBT テンプレート
```javascript
{
  id: "template-1234567890",
  name: "スタンプカード",
  description: "毎回の支払いでスタンプを1つ獲得",
  issuePattern: "per_payment",
  maxStamps: 10,
  rewardDescription: "スタンプ1個",
  imageUrl: "data:image/jpeg;base64,...",
  imageMimeType: "image/jpeg",
  createdAt: "2025-11-14",
  status: "active"
}
```

#### 発行済み SBT
```javascript
{
  id: "sbt-1234567890",
  templateId: "template-1234567890",
  templateName: "スタンプカード",
  recipientAddress: "0x1234567890abcdef...",
  currentStamps: 3,
  maxStamps: 10,
  issuedAt: "2025-11-14",
  status: "active",
  sourcePaymentId: "PAY1234567890",
  transactionHash: "0xabcd1234..."
}
```

### 3. ストレージユーティリティ（`src/utils/storage.ts`）

提供機能：

```typescript
// テンプレート操作
sbtStorage.saveTemplate(template)    // 保存
sbtStorage.getAllTemplates()         // 全取得
sbtStorage.deleteTemplate(id)        // 削除

// SBT 操作
sbtStorage.saveSBT(sbt)              // 保存
sbtStorage.getAllSBTs()              // 全取得
sbtStorage.getSBTsByAddress(address) // アドレス別取得
sbtStorage.deleteSBT(id)             // 削除

// データ管理
sbtStorage.exportData()              // エクスポート（バックアップ）
sbtStorage.importData(data)          // インポート（リストア）
sbtStorage.clearAllData()            // 全削除
```

### 4. 実装の流れ

#### マウント時（初期化）
```
1. IndexedDB を初期化（ストア作成）
2. localStorage からデータを読み込み
3. UI に反映
```

#### テンプレート作成時
```
1. ユーザーが入力
2. IndexedDB に保存
3. localStorage にバックアップ
4. state に反映
5. UI 更新
```

#### ページ遷移時
```
1. IndexedDB から読み込み
2. localStorage から復元（必要な場合）
3. UI に表示
```

---

## 🌍 複数タブ・デバイス間の同期

### 同一ブラウザの複数タブ
- ✅ storage イベント で自動同期
- ✅ リアルタイム反映

### 異なるブラウザ・デバイス
- ⚠ localStorage のみ（IndexedDB はブラウザローカル）
- 🔄 推奨：エクスポート/インポート機能を使用

---

## 📱 デスクトップアプリ対応

### 現在の制限
```
❌ Electron アプリ内 IndexedDB: 制限あり
❌ デスクトップアプリ: 別途実装必要
```

### 将来の検討案

#### **案1: Tauri + SQLite**
```
✅ 完全なオフライン対応
✅ SQLite で強力なクエリ可能
✅ デスクトップ用にビルド可能
⚠ 再度の開発が必要
```

#### **案2: Electron + better-sqlite3**
```
✅ 既知の技術スタック
✅ ローカル SQLite 可能
⚠ ファイルサイズが大きい
```

#### **案3: Capacitor でハイブリッド化**
```
✅ web + iOS/Android/Desktop
✅ ネイティブ機能アクセス可能
⚠ セットアップが複雑
```

---

## 🔐 セキュリティに関する注意

### 現在の実装
- ✅ ブラウザローカルストレージ
- ✅ 暗号化なし（ローカル環境前提）

### 本番環境での推奨

#### **案1: バックエンド + Session ベース認証**
```
1. 店舗がログイン
2. Session ID を発行
3. データはサーバーに保存
4. HTTPS で通信
```

#### **案2: Firebase + Google 認証**
```
1. Google アカウントでログイン
2. Firebase に SBT テンプレート保存
3. リアルタイム同期
4. バックアップ自動
```

#### **案3: IndexedDB + 暗号化**
```
1. IndexedDB にデータ保存
2. パスフレーズで暗号化
3. ローカルのみ（クラウド不要）
4. USB バックアップで移行可能
```

---

## 💾 バックアップ・復元

### データエクスポート
```javascript
const data = await sbtStorage.exportData();
// {
//   templates: [...],
//   sbts: [...],
//   exportedAt: "2025-11-14T10:30:00Z"
// }

// JSON ファイルで保存
const json = JSON.stringify(data, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// ダウンロード処理...
```

### データインポート
```javascript
const file = /* ユーザーが選択したファイル */;
const text = await file.text();
const data = JSON.parse(text);
await sbtStorage.importData(data);
// ✅ テンプレートと SBT が復元される
```

---

## 🔄 ライフサイクル

| 場面 | 保存位置 | 読込位置 | 自動同期 |
|------|--------|--------|--------|
| 新規作成 | IndexedDB + localStorage | state | 同期 |
| ページ遷移 | IndexedDB + localStorage | IndexedDB 優先 | 自動 |
| ブラウザ再起動 | IndexedDB + localStorage | IndexedDB から復元 | 自動 |
| キャッシュ削除 | localStorage にリカバリ | localStorage から復元 | 手動復元 |
| デバイス変更 | エクスポート/インポート | JSON ファイル | 手動 |

---

## 🚀 今後のロードマップ

### フェーズ1（現在）
- ✅ IndexedDB + localStorage 基本実装
- ✅ 単一ブラウザ内で永続化
- ✅ オフライン完全対応

### フェーズ2
- 🔄 エクスポート/インポート UI 追加
- 🔄 定期自動バックアップ
- 🔄 複数タブでのリアルタイム同期

### フェーズ3
- 🔲 Firebase 統合（オプション）
- 🔲 QR コード経由でのデータ共有
- 🔲 複数店舗での一括管理ダッシュボード

### フェーズ4
- 🔲 Tauri でデスクトップアプリ化
- 🔲 SQLite での高度なレポーティング
- 🔲 マルチプラットフォーム対応

---

## ⚙️ 利用する技術

### IndexedDB API
- 非同期データベース API
- ブラウザ標準機能
- すべてのモダンブラウザで利用可能

### localStorage API
- キーバリューストレージ
- 同期 API（シンプル）
- バックアップ用途

### FileReader API
- ファイルのテキスト/Base64 読み込み
- 画像データの永続化に使用

---

## 📋 使用例

### テンプレート作成と保存
```typescript
import { sbtStorage } from '@/utils/storage';

// テンプレート作成
const template = {
  id: `template-${Date.now()}`,
  name: 'スタンプカード',
  description: '毎回の支払いでスタンプを1つ獲得',
  issuePattern: 'per_payment',
  maxStamps: 10,
  rewardDescription: 'スタンプ1個',
  imageUrl: 'data:image/jpeg;base64,...', // Base64 画像
  imageMimeType: 'image/jpeg',
  createdAt: '2025-11-14',
  status: 'active'
};

// 保存
await sbtStorage.saveTemplate(template);

// 取得
const templates = await sbtStorage.getAllTemplates();

// 削除
await sbtStorage.deleteTemplate(template.id);
```

### SBT 発行と検索
```typescript
// SBT 発行
const sbt = {
  id: `sbt-${Date.now()}`,
  templateId: template.id,
  templateName: template.name,
  recipientAddress: '0x1234567890abcdef...',
  currentStamps: 0,
  maxStamps: 10,
  issuedAt: '2025-11-14',
  status: 'active'
};

// 保存
await sbtStorage.saveSBT(sbt);

// アドレス別に検索
const sbtsByAddress = await sbtStorage.getSBTsByAddress('0x1234567890abcdef...');
console.log(sbtsByAddress); // そのアドレスのSBT一覧
```

---

## ✅ テスト済み

- ✅ IndexedDB 初期化
- ✅ テンプレートの CRUD 操作
- ✅ SBT の CRUD 操作
- ✅ IndexedDB 失敗時のリカバリ
- ✅ ブラウザの複数タブでのアクセス
- ✅ ページリロード後のデータ復元

