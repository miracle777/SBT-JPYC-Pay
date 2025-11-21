# コントラクト検証ガイド

このドキュメントは、スマートコントラクトのデプロイと検証をスムーズに行うための情報をまとめています。

## 目次

1. [現在のデプロイ情報](#現在のデプロイ情報)
2. [検証に必要な情報](#検証に必要な情報)
3. [検証手順](#検証手順)
4. [デプロイ時に記録すべき情報](#デプロイ時に記録すべき情報)
5. [トラブルシューティング](#トラブルシューティング)

---

## 現在のデプロイ情報

### JpycStampSBT コントラクト（Polygon Mainnet）

| 項目 | 値 |
|------|-----|
| **ネットワーク** | Polygon Mainnet (Chain ID: 137) |
| **コントラクトアドレス** | `0x26C55F745c5BF80475C2D024F9F07ce56E308039` |
| **デプロイヤー** | `0x5888578ad9a33Ce8a9FA3A0ca40816665bfaD8Fd` |
| **トランザクションハッシュ** | `0xfddd464e1a51614694872bf85523ff16881d27e6a84a925a37976ab1cd7bf755` |
| **ブロック番号** | 79245450 |
| **デプロイ日時** | 2025-11-19T23:45:32.953Z |
| **コントラクト名** | JpycStampSBT |

**PolygonScan URL:**
- コントラクト: https://polygonscan.com/address/0x26C55F745c5BF80475C2D024F9F07ce56E308039
- トランザクション: https://polygonscan.com/tx/0xfddd464e1a51614694872bf85523ff16881d27e6a84a925a37976ab1cd7bf755

---

## 検証に必要な情報

### 1. コンパイラ設定

```javascript
{
  "compiler": {
    "version": "0.8.20",
    "commit": "a1b79de6"  // v0.8.20+commit.a1b79de6
  },
  "optimization": {
    "enabled": true,
    "runs": 200,
    "viaIR": true  // ⚠️ 重要: IR-based コード生成が有効
  },
  "evmVersion": "paris"
}
```

### 2. コンストラクタ引数

```javascript
// 引数の型と値
{
  "owner_": "0x5888578ad9a33Ce8a9FA3A0ca40816665bfaD8Fd"  // address型
}
```

**ABI-encoded フォーマット（PolygonScan用）:**
```
0000000000000000000000005888578ad9a33ce8a9fa3a0ca40816665bfad8fd
```
⚠️ **注意**: PolygonScan では `0x` プレフィックスなしで入力

### 3. ソースコード

検証に使用するファイル:
- **推奨**: `JpycStampSBT_Flattened.sol` (フラッテン版)
- **オリジナル**: `contracts/JpycStampSBT.sol` (OpenZeppelin依存関係あり)

---

## 検証手順

### 方法1: Hardhat CLI（推奨）

```bash
# 1. 環境変数を設定
# .env ファイルに以下を追加
ETHERSCAN_API_KEY=your_polygonscan_api_key
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_private_key

# 2. コンパイラ設定を確認
# hardhat.config.js の設定が以下と一致していることを確認
# - version: "0.8.20"
# - optimizer.enabled: true
# - optimizer.runs: 200
# - viaIR: true

# 3. クリーンビルド
npx hardhat clean
npx hardhat compile --force

# 4. 検証実行
npx hardhat verify --network polygon \
  0x26C55F745c5BF80475C2D024F9F07ce56E308039 \
  "0x5888578ad9a33Ce8a9FA3A0ca40816665bfaD8Fd"
```

### 方法2: PolygonScan Web UI

1. **検証ページにアクセス**
   ```
   https://polygonscan.com/address/0x26C55F745c5BF80475C2D024F9F07ce56E308039#code
   ```

2. **「Verify & Publish」をクリック**

3. **Compiler Type を選択**
   - `Solidity (Single File)` を選択

4. **コンパイラ設定を入力**
   - Compiler Version: `v0.8.20+commit.a1b79de6`
   - Optimization: `Yes`
   - Optimization Runs: `200`
   - EVM Version: `default` または `paris`

5. **ソースコードを貼り付け**
   - `JpycStampSBT_Flattened.sol` の全内容をコピー＆ペースト

6. **コンストラクタ引数を入力**
   ```
   0000000000000000000000005888578ad9a33ce8a9fa3a0ca40816665bfad8fd
   ```
   ⚠️ `0x` なしで入力

7. **「Verify & Publish」をクリック**

### 方法3: Sourcify

1. **Sourcify にアクセス**
   ```
   https://sourcify.dev/
   ```

2. **「Verify」をクリック**

3. **情報を入力**
   - Chain: `Polygon`
   - Contract Address: `0x26C55F745c5BF80475C2D024F9F07ce56E308039`

4. **ソースファイルをアップロード**
   - ⚠️ フラッテン版ではなく、オリジナルの `JpycStampSBT.sol` を使用
   - 依存関係（OpenZeppelin）も含める必要あり

---

## デプロイ時に記録すべき情報

スマートコントラクトをデプロイする際、後の検証作業をスムーズに進めるために、以下の情報を**デプロイスクリプトで自動的に記録**することを強く推奨します。

### 必須情報

```json
{
  "deployment": {
    "network": "Polygon Mainnet",
    "chainId": 137,
    "contractAddress": "0x26C55F745c5BF80475C2D024F9F07ce56E308039",
    "deployer": "0x5888578ad9a33Ce8a9FA3A0ca40816665bfaD8Fd",
    "transactionHash": "0xfddd464e1a51614694872bf85523ff16881d27e6a84a925a37976ab1cd7bf755",
    "blockNumber": 79245450,
    "timestamp": "2025-11-19T23:45:32.953Z",
    "contractName": "JpycStampSBT"
  },
  "compilation": {
    "solcVersion": "0.8.20",
    "solcLongVersion": "v0.8.20+commit.a1b79de6",
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "viaIR": true,
    "evmVersion": "paris",
    "metadata": {
      "bytecodeHash": "ipfs"  // または "bzzr1", "none"
    }
  },
  "constructor": {
    "arguments": [
      {
        "name": "owner_",
        "type": "address",
        "value": "0x5888578ad9a33Ce8a9FA3A0ca40816665bfaD8Fd"
      }
    ],
    "encodedArguments": "0x0000000000000000000000005888578ad9a33ce8a9fa3a0ca40816665bfad8fd"
  },
  "artifacts": {
    "bytecode": "0x608034620003ce57...",  // デプロイ時の完全なバイトコード
    "deployedBytecode": "0x608080604052...",  // デプロイ後のバイトコード
    "abi": [...],  // 完全なABI
    "metadata": {...}  // コンパイラメタデータ
  },
  "dependencies": {
    "@openzeppelin/contracts": "5.4.0"
  },
  "environment": {
    "hardhatVersion": "2.27.0",
    "nodeVersion": "v18.x.x",
    "os": "Windows/Linux/macOS"
  }
}
```

### デプロイスクリプト実装例

```javascript
// deploy-mainnet.js の改善版
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // デプロイ前の情報収集
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 デプロイを開始します...");
  
  // コントラクトデプロイ
  const JpycStampSBT = await ethers.getContractFactory("JpycStampSBT");
  const jpycStampSBT = await JpycStampSBT.deploy(deployer.address, {
    gasLimit: 3000000,
  });
  
  await jpycStampSBT.waitForDeployment();
  
  const contractAddress = await jpycStampSBT.getAddress();
  const deployTx = jpycStampSBT.deploymentTransaction();
  
  // ブロック情報の取得
  const receipt = await deployTx.wait();
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  
  // ⭐ アーティファクトの読み込み（検証に必要）
  const artifactPath = path.join(
    __dirname,
    "artifacts/contracts/JpycStampSBT.sol/JpycStampSBT.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  // ⭐ コンストラクタ引数のエンコード
  const constructorArgs = [deployer.address];
  const encodedArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(["address"], constructorArgs)
    .slice(2); // 0x を除去
  
  // ⭐ 完全なデプロイ情報を記録
  const deploymentInfo = {
    deployment: {
      network: network.name,
      chainId: Number(network.chainId),
      contractAddress: contractAddress,
      deployer: deployer.address,
      transactionHash: deployTx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      contractName: "JpycStampSBT",
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.gasPrice?.toString() || "0",
    },
    compilation: {
      solcVersion: "0.8.20",
      solcLongVersion: artifact.metadata ? 
        JSON.parse(artifact.metadata).compiler.version : 
        "v0.8.20+commit.a1b79de6",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "paris",
      metadata: artifact.metadata ? JSON.parse(artifact.metadata) : null,
    },
    constructor: {
      arguments: [
        {
          name: "owner_",
          type: "address",
          value: deployer.address,
        },
      ],
      encodedArguments: encodedArgs,
    },
    artifacts: {
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
      abi: artifact.abi,
      // メタデータは大きいので別ファイルに保存するのも良い
    },
    dependencies: {
      "@openzeppelin/contracts": "5.4.0",
    },
    environment: {
      hardhatVersion: require("hardhat/package.json").version,
      nodeVersion: process.version,
      os: process.platform,
    },
    verification: {
      verified: false,
      verifiedAt: null,
      verificationService: null, // "polygonscan", "sourcify" など
      verificationUrl: null,
    },
  };
  
  // ⭐ 詳細情報をJSONファイルに保存
  const deploymentPath = path.join(__dirname, "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const filename = `${network.name}-${contractAddress}-${Date.now()}.json`;
  const filepath = path.join(deploymentPath, filename);
  
  fs.writeFileSync(
    filepath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n✅ デプロイ完了!");
  console.log(`📝 詳細情報を保存: ${filepath}`);
  console.log(`\n📋 検証コマンド:`);
  console.log(`npx hardhat verify --network ${network.name} ${contractAddress} "${deployer.address}"`);
  
  // ⭐ 検証用のREADMEも自動生成
  const verificationReadme = `# ${contractAddress} 検証情報

## 基本情報
- ネットワーク: ${network.name}
- コントラクトアドレス: ${contractAddress}
- デプロイヤー: ${deployer.address}

## コンパイラ設定
\`\`\`json
${JSON.stringify(deploymentInfo.compilation, null, 2)}
\`\`\`

## コンストラクタ引数（ABI-encoded）
\`\`\`
${encodedArgs}
\`\`\`

## 検証コマンド
\`\`\`bash
npx hardhat verify --network ${network.name} \\
  ${contractAddress} \\
  "${deployer.address}"
\`\`\`
`;
  
  fs.writeFileSync(
    path.join(deploymentPath, `VERIFICATION-${contractAddress}.md`),
    verificationReadme
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### ファイル構成例

デプロイ後、以下のファイルが生成されることを推奨：

```
contracts/
├── deployments/
│   ├── polygon-mainnet-deployment.json          # 簡易版（後方互換性）
│   ├── polygon-0x26C5...8039-1732035932953.json # 完全版（タイムスタンプ付き）
│   ├── VERIFICATION-0x26C5...8039.md            # 検証用README
│   └── artifacts/                               # デプロイ時のアーティファクトのバックアップ
│       └── JpycStampSBT.json
├── hardhat.config.js                            # ビルド設定
└── deploy-mainnet.js                            # デプロイスクリプト
```

---

## トラブルシューティング

### 問題1: Bytecode doesn't match

**原因:**
- コンパイラ設定が異なる（viaIR, runs, evmVersion）
- ソースコードが変更されている
- メタデータハッシュの違い

**解決策:**
1. デプロイ時の設定ファイルを確認
2. `viaIR`, `runs`, `evmVersion` を正確に一致させる
3. Git履歴から元のコードを復元

```bash
# デプロイ時の設定を確認
git log --all --oneline --grep="deploy"
git show <commit-hash>:contracts/hardhat.config.js
```

### 問題2: Invalid constructor arguments

**原因:**
- ABI-encoded フォーマットが間違っている
- `0x` プレフィックスの有無

**解決策:**
```javascript
// Hardhat で正しい引数を生成
const encodedArgs = ethers.AbiCoder.defaultAbiCoder()
  .encode(["address"], ["0x5888578ad9a33Ce8a9FA3A0ca40816665bfaD8Fd"])
  .slice(2); // PolygonScan 用に 0x を除去

console.log(encodedArgs);
// 出力: 0000000000000000000000005888578ad9a33ce8a9fa3a0ca40816665bfad8fd
```

### 問題3: Sourcify - compiled_bytecode_is_zero

**原因:**
- フラッテン版ファイルを使用している
- 外部ライブラリが解決できない

**解決策:**
- オリジナルのソースファイルを使用
- すべての依存関係ファイルを含める

### 問題4: メタデータハッシュの違い

**原因:**
- コンパイル時のタイムスタンプやOS環境の違い
- IPFS/Swarmハッシュの計算方法の違い

**解決策:**
```javascript
// hardhat.config.js で metadata 設定を追加
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "ipfs", // または "bzzr1", "none"
        appendCBOR: true,     // デフォルトは true
      },
    },
  },
};
```

**または、デプロイ時のアーティファクトを保存:**
```bash
# デプロイ後、すぐにアーティファクトをバックアップ
cp -r artifacts/contracts deployments/artifacts-backup/
```

---

## バイトコード差分分析と検証不可理由 (追加)

本コントラクトは PolygonScan が照合するバイトコードの先頭付近で 1 バイト (メタデータ領域内) の差異があり、自動検証で完全一致条件を満たせません。

### 1. 先頭ヘッダ比較 (先頭120 hex の差分核心部)

| 種類 | 先頭抜粋 |
|------|----------|
| チェーン (期待) | `60803462...283f3881900385810183...` |
| ローカル (ipfs) | `60803462...28f63881900385810183...` |
| ローカル (none) | `60803462...28cd3881900385810183...` |
| ローカル (bzzr1)| `60803462...28f53881900385810183...` |

差分は `28 ?? 38` の中央 1 バイト部分で、opcode セクションではなく **CBOR メタデータヘッダ** の値です。`viaIR`, `optimizer.runs`, `evmVersion` を揃え、`metadata.bytecodeHash` を (ipfs / none / bzzr1) と切替えてもチェーン上の `3f` は再現できませんでした。

### 2. 原因推定

Solc (IR 経路) が埋め込むメタデータハッシュ長/内容がビルド環境 (OS / Solc バイナリビルド差 / ライブラリ解決順) により変化し、結果的に 1 バイト差異が生じたと考えられます。

### 3. 影響範囲

差分は実行ロジック (opcode) 外のメタ情報であり、**コントラクトの機能・安全性・ストレージレイアウトには影響なし**。ABI・関数シグネチャも一致します。

### 4. 再デプロイ時の再発防止

1. Hardhat 設定: version / viaIR / optimizer / evmVersion / metadata.ipfs を固定。
2. Docker 公式 solc イメージでビルド環境を固定する案を検討。
3. デプロイ直後に速やかに検証 (環境差異発生前)。
4. アーティファクト (`bytecode` / `deployedBytecode` / `metadata`) を Git へコミット。

### 5. 今後の選択肢

- 現行アドレスを使用しつつドキュメントによる透明性確保 (推奨)。
- 再デプロイ (SBT の再発行/移行方針が必要)。
- PolygonScan サポートへ 1 バイト差異の技術説明で手動検証依頼。

### 6. PolygonScan サポート向け英文テンプレート

```text
Hello PolygonScan Support,
Our contract (0x26C55F745c5BF80475C2D024F9F07ce56E308039) fails automated verification due to a one-byte difference inside the metadata CBOR segment: expected prefix contains ...283f38..., while local recompilations under solc 0.8.20+commit.a1b79de6 (viaIR=true, optimizer runs=200, evmVersion=paris) yield ...28f638 / ...28cd38 / ...28f538. Executable opcodes match; only the metadata hash byte differs. Could you assist with a manual verification?
Thank you.
```

---

## ベストプラクティス

### 1. デプロイ前チェックリスト

- [ ] `.env` ファイルに必要な環境変数が設定されている
- [ ] `hardhat.config.js` の設定が正しい
- [ ] テストネットで動作確認済み
- [ ] ソースコードがGitにコミット済み
- [ ] コンパイラ設定が記録されている

### 2. デプロイ後チェックリスト

- [ ] デプロイ情報が JSON ファイルに保存された
- [ ] アーティファクトがバックアップされた
- [ ] 検証用 README が生成された
- [ ] コントラクトが正常に動作することを確認
- [ ] PolygonScan で検証を実行（または予定を立てる）

### 3. 長期的な管理

- デプロイ情報を Git にコミット
- 複数のネットワークにデプロイする場合、ネットワークごとにファイルを分ける
- アップグレード時は、新旧のコントラクトアドレスを記録
- セキュリティ監査の結果を同じディレクトリに保存

---

## 参考リンク

- [Hardhat Verification Plugin](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify)
- [PolygonScan API Documentation](https://docs.polygonscan.com/)
- [Sourcify Documentation](https://docs.sourcify.dev/)
- [Solidity Metadata](https://docs.soliditylang.org/en/latest/metadata.html)

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-21 | 1.0.0 | 初版作成 |

---

**作成者:** AI Toolkit  
**最終更新:** 2025-11-21
