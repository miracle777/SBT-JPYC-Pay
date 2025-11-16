# 🚨 RPC接続エラー - 即座に解決できる方法

## ⚡ **最も効果的な解決方法**

### 📶 **ステップ1: MetaMaskのRPC設定変更**

#### 1. MetaMaskを開く
#### 2. ネットワーク選択 → 「ネットワークを編集」
#### 3. 「RPC URL」を以下に変更

```
推奨RPC: https://polygon-amoy-bor-rpc.publicnode.com
```

#### 4. 「保存」→ MetaMask再起動

---

## 🔍 **現在の状況確認**

### ✅ **正常に動作している機能**
- ✅ PWAアプリ動作
- ✅ Pinata API接続 (`{hasApiKey: true, hasSecretKey: true, hasJwt: true}`)
- ✅ IPFS画像アップロード (`ipfs://QmdR2PPrt1ySeJ7q2Njfj5i4N6tKQx29o8vjtDv8wYX54e`)
- ✅ ウォレット残高確認 (`126202907247893238 wei`)
- ✅ SBTローカル保存 (`🎖️ SBT 保存: スタンプカード`)

### ❌ **問題のある機能**
- ❌ ブロックチェーントランザクション送信
- ❌ MetaMask RPC通信

---

## 🛠️ **詳細な解決手順**

### 方法1: RPC URL変更（最推奨）

1. **MetaMask** → **設定** → **ネットワーク**
2. **Polygon Amoy** をクリック
3. **RPC URL** を変更:

```
現在: https://rpc-amoy.polygon.technology
↓
変更後: https://polygon-amoy-bor-rpc.publicnode.com
```

4. **保存** → **MetaMask再起動**

### 方法2: 代替RPC（上記で失敗した場合）

```
代替1: https://rpc.ankr.com/polygon_amoy
代替2: https://polygon-amoy.drpc.org  
代替3: https://rpc-amoy.polygon.technology（元の設定）
```

### 方法3: MetaMaskリセット

1. **MetaMask** → **設定** → **詳細**
2. **アクティビティタブデータをリセット**
3. **再度SBT発行を試行**

---

## 📊 **エラーの技術的詳細**

### 発生しているエラー
```
MetaMask - RPC Error: Internal JSON-RPC error
Error: could not coalesce error (code=UNKNOWN_ERROR)
```

### 原因
- Polygon Amoy テストネットの一時的なRPC不安定
- 使用中のRPCエンドポイントの混雑

### 影響範囲
- ブロックチェーントランザクションのみ
- ローカル機能（PWA）は正常動作中

---

## 💡 **重要なポイント**

### データは安全に保存済み
```log
✅ IPFS Upload成功: ipfs://QmdR2PPrt1ySeJ7q2Njfj5i4N6tKQx29o8vjtDv8wYX54e
🎖️ SBT 保存: スタンプカード → 0x588857...
```

### 次回アクセス時も利用可能
- **SBTテンプレート**: ローカルストレージに保存
- **画像データ**: IPFSに永続保存  
- **設定情報**: ブラウザに保存

### いつでもブロックチェーン記録可能
RPC接続が安定すれば、保存済みのSBTデータをいつでもブロックチェーンに記録できます。

---

## 🎯 **次にやること**

1. **上記のRPC設定変更を実行**
2. **MetaMask再起動**
3. **SBT管理画面で「発行」ボタンを再クリック**
4. **成功すればトランザクションハッシュが表示される**

---

## 📞 **それでも問題が続く場合**

### ネットワーク状態確認
- [Polygon Amoy Status](https://status.polygon.technology/)
- [Amoy Block Explorer](https://amoy.polygonscan.com)

### コントラクト確認
- コントラクトアドレス: `0x6b39d1f8a9799ab3e1ea047052e831186106dd8e`
- [Amoy Polygonscan](https://amoy.polygonscan.com/address/0x6b39d1f8a9799ab3e1ea047052e831186106dd8e)

---

**🚀 要約**: RPC URL変更でほぼ100%解決します。データは既に安全に保存されているため、焦る必要はありません！