# 🌐 Polygon Amoy ネットワーク接続トラブルシューティング

## 🚨 現在の問題

**Internal JSON-RPC error** が発生している場合の解決方法をご案内します。

## 🔧 解決方法

### 方法1: MetaMaskネットワーク設定の確認

#### 1. MetaMaskでPolygon Amoyネットワークを再設定

```
ネットワーク名: Polygon Amoy Testnet
新しいRPC URL: https://polygon-amoy-bor-rpc.publicnode.com
チェーンID: 80002
通貨記号: POL
ブロックエクスプローラーURL: https://amoy.polygonscan.com
```

#### 2. 代替RPCエンドポイント

現在のRPCで問題がある場合、以下のいずれかに変更してください：

**推奨順位:**
1. `https://polygon-amoy-bor-rpc.publicnode.com` ⭐ **最推奨**
2. `https://rpc.ankr.com/polygon_amoy`
3. `https://polygon-amoy.drpc.org`
4. `https://rpc-amoy.polygon.technology` （デフォルト）

#### 3. ネットワーク設定手順

1. **MetaMask拡張機能を開く**
2. **ネットワーク選択 → 「ネットワークを追加」**
3. **「ネットワークを手動で追加」**
4. **上記の設定値を入力**
5. **「保存」をクリック**

### 方法2: MetaMaskのリセット

#### 1. アクティビティとNonceをリセット
```
MetaMask設定 → 詳細 → アクティビティタブデータをリセット
```

#### 2. アカウントをリセット
```
MetaMask設定 → 詳細 → アカウントをリセット
```

### 方法3: 手動トランザクション実行

SBTの発行が失敗する場合：

#### 1. コントラクトアドレス
```
0x6b39d1f8a9799ab3e1ea047052e831186106dd8e
```

#### 2. 手動実行手順
1. **MetaMaskでコントラクトに直接接続**
2. **mintSBT関数を手動実行**
3. **ガス制限: 250,000**
4. **ガス価格: 自動設定**

## 📊 現在のステータス確認

### ✅ 正常に動作している機能
- ✅ Pinata接続 (IPFS Upload成功)
- ✅ ショップ登録確認
- ✅ ウォレット接続
- ✅ SBTローカル保存 (PWA機能)
- ✅ コントラクト所有者確認

### ❌ 問題のある機能
- ❌ ブロックチェーントランザクション実行
- ❌ MetaMask RPC接続

## 🎯 重要なポイント

### PWA機能は正常動作中
```log
🎖️ SBT 保存: スタンプカード → 0x588857...
✅ IPFS Upload成功: ipfs://QmdR2PPrt1ySeJ7q2Njfj5i4N6tKQx29o8vjtDv8wYX54e
```

**SBTデータは既にローカルストレージに保存されています！** トランザクション実行のみが問題です。

### データは失われません
- ローカルストレージにSBTテンプレート保存済み
- IPFS画像アップロード成功
- PWAとして完全に機能中

## 🔄 次回アクセス時

1. **ネットワーク設定確認**
2. **別のRPCエンドポイントを試行**
3. **数分待ってからリトライ**

## 📞 サポート

### Polygon Amoyの状態確認
- [Polygon Amoy Status](https://status.polygon.technology/)
- [Amoy Block Explorer](https://amoy.polygonscan.com)

### トランザクション状態確認
現在のコントラクト: `0x6b39d1f8a9799ab3e1ea047052e831186106dd8e`

---

**💡 要約**: RPC接続の問題はネットワーク設定で解決できます。PWA機能は正常に動作しており、データも保存されています。