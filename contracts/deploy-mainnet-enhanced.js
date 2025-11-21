// Polygon Mainnet用の改善版デプロイスクリプト
// 検証に必要な情報を自動的に記録します

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Polygon Mainnet へのコントラクトデプロイを開始します...");
  console.log("⚠️  注意: これは本番環境へのデプロイです！");
  console.log("=".repeat(60));

  // デプロイ実行前の確認
  const network = await ethers.provider.getNetwork();
  console.log(`📡 接続ネットワーク: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (network.chainId !== 137n) {
    throw new Error("❌ Polygon Mainnet (Chain ID: 137) に接続してください");
  }

  // アカウント情報取得
  const [deployer] = await ethers.getSigners();
  console.log("👤 デプロイアカウント:", deployer.address);
  
  // 残高確認
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 アカウント残高:", ethers.formatEther(balance), "POL");
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("❌ 残高不足: 最低 0.01 POL が必要です");
  }

  // ガス価格確認
  const feeData = await deployer.provider.getFeeData();
  console.log("⛽ 現在のガス価格:", ethers.formatUnits(feeData.gasPrice || 0n, "gwei"), "Gwei");

  // 最終確認
  console.log("\n⚠️  デプロイ前の最終確認:");
  console.log("   - テストネットで十分なテストを実施済みですか？");
  console.log("   - コントラクトコードのレビューは完了していますか？");
  console.log("   - デプロイ後の手順を確認していますか？");
  console.log("\n5秒後にデプロイを開始します...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // デプロイ開始タイムスタンプ
  const deployStartTime = Date.now();

  // コントラクトデプロイ
  console.log("\n📋 JpycStampSBT コントラクトをデプロイ中...");
  console.log("   コンストラクタ引数: owner =", deployer.address);
  
  const JpycStampSBT = await ethers.getContractFactory("JpycStampSBT");
  const jpycStampSBT = await JpycStampSBT.deploy(deployer.address, {
    gasLimit: 3000000, // 3M ガスリミット
  });
  
  console.log("⏳ デプロイトランザクション送信済み、確認待機中...");
  await jpycStampSBT.waitForDeployment();
  
  const contractAddress = await jpycStampSBT.getAddress();
  const deployTx = jpycStampSBT.deploymentTransaction();
  
  console.log("\n✅ デプロイ完了!");
  console.log("📍 コントラクトアドレス:", contractAddress);
  console.log("📝 トランザクションハッシュ:", deployTx?.hash);
  
  // トランザクション詳細の取得
  const receipt = await deployTx.wait();
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  
  // デプロイ後の検証
  console.log("\n🔍 デプロイ後検証中...");
  try {
    const name = await jpycStampSBT.name();
    const symbol = await jpycStampSBT.symbol();
    const owner = await jpycStampSBT.owner();
    
    console.log("   📝 コントラクト名:", name);
    console.log("   🏷️  シンボル:", symbol);
    console.log("   👤 所有者:", owner);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error("❌ 所有者が一致しません");
    }
    
    console.log("✅ 基本検証完了!");
  } catch (error) {
    console.error("❌ 検証エラー:", error.message);
    throw error;
  }

  // ⭐ アーティファクトの読み込み（検証に必要）
  console.log("\n📦 アーティファクト情報を収集中...");
  const artifactPath = path.join(
    __dirname,
    "artifacts/contracts/JpycStampSBT.sol/JpycStampSBT.json"
  );
  
  if (!fs.existsSync(artifactPath)) {
    console.warn("⚠️ アーティファクトが見つかりません。コンパイルを実行してください。");
  }
  
  const artifact = fs.existsSync(artifactPath) 
    ? JSON.parse(fs.readFileSync(artifactPath, "utf8"))
    : null;
  
  // ⭐ コンストラクタ引数のエンコード
  const constructorArgs = [deployer.address];
  const encodedArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(["address"], constructorArgs)
    .slice(2); // 0x を除去
  
  console.log("📝 コンストラクタ引数（ABI-encoded）:", encodedArgs);
  
  // ⭐ 完全なデプロイ情報を記録
  const deploymentInfo = {
    deployment: {
      network: "Polygon Mainnet",
      chainId: Number(network.chainId),
      contractAddress: contractAddress,
      deployer: deployer.address,
      transactionHash: deployTx.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      contractName: "JpycStampSBT",
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.gasPrice?.toString() || "0",
      deploymentDuration: `${Date.now() - deployStartTime}ms`,
    },
    compilation: {
      solcVersion: "0.8.20",
      solcLongVersion: artifact?.metadata 
        ? JSON.parse(artifact.metadata).compiler.version 
        : "v0.8.20+commit.a1b79de6",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "paris",
      compilerMetadata: artifact?.metadata ? JSON.parse(artifact.metadata) : null,
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
      encodedArgumentsWithPrefix: `0x${encodedArgs}`,
    },
    artifacts: artifact ? {
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
      abi: artifact.abi,
      // メタデータは大きいので含めない（別途保存可能）
    } : null,
    dependencies: {
      "@openzeppelin/contracts": "5.4.0",
    },
    environment: {
      hardhatVersion: require("hardhat/package.json").version,
      nodeVersion: process.version,
      os: process.platform,
      deploymentScript: __filename,
    },
    verification: {
      verified: false,
      verifiedAt: null,
      verificationService: null,
      verificationUrl: null,
      notes: "検証が完了したら、このセクションを更新してください",
    },
    urls: {
      contract: `https://polygonscan.com/address/${contractAddress}`,
      transaction: `https://polygonscan.com/tx/${deployTx.hash}`,
      verification: `https://polygonscan.com/address/${contractAddress}#code`,
    },
  };
  
  // ⭐ デプロイ情報をファイルに保存
  const deploymentPath = path.join(__dirname, "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  // 簡易版（後方互換性のため）
  const simpleDeploymentInfo = {
    network: deploymentInfo.deployment.network,
    chainId: deploymentInfo.deployment.chainId,
    contractAddress: deploymentInfo.deployment.contractAddress,
    deployer: deploymentInfo.deployment.deployer,
    transactionHash: deploymentInfo.deployment.transactionHash,
    timestamp: deploymentInfo.deployment.timestamp,
    contractName: deploymentInfo.deployment.contractName,
    blockNumber: deploymentInfo.deployment.blockNumber.toString(),
  };

  const simpleDeploymentFile = path.join(deploymentPath, "polygon-deployment.json");
  fs.writeFileSync(simpleDeploymentFile, JSON.stringify(simpleDeploymentInfo, null, 2));
  console.log("\n💾 デプロイ情報を保存しました:", simpleDeploymentFile);
  
  // 完全版（タイムスタンプ付き）
  const timestamp = Date.now();
  const detailedFilename = `polygon-${contractAddress}-${timestamp}.json`;
  const detailedFilepath = path.join(deploymentPath, detailedFilename);
  fs.writeFileSync(detailedFilepath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 詳細情報を保存しました:", detailedFilepath);
  
  // ⭐ アーティファクトのバックアップ
  if (artifact) {
    const artifactBackupPath = path.join(deploymentPath, "artifacts");
    if (!fs.existsSync(artifactBackupPath)) {
      fs.mkdirSync(artifactBackupPath, { recursive: true });
    }
    const artifactBackupFile = path.join(artifactBackupPath, `JpycStampSBT-${timestamp}.json`);
    fs.writeFileSync(artifactBackupFile, JSON.stringify(artifact, null, 2));
    console.log("💾 アーティファクトをバックアップしました:", artifactBackupFile);
  }
  
  // ⭐ 検証用のREADMEを自動生成
  const verificationReadme = `# Contract Verification Guide
# コントラクト検証ガイド

Contract Address: ${contractAddress}

## Basic Information / 基本情報

- **Network / ネットワーク:** Polygon Mainnet (Chain ID: 137)
- **Contract Address / コントラクトアドレス:** \`${contractAddress}\`
- **Deployer / デプロイヤー:** \`${deployer.address}\`
- **Transaction Hash / トランザクションハッシュ:** \`${deployTx.hash}\`
- **Block Number / ブロック番号:** ${receipt.blockNumber}
- **Deployment Time / デプロイ日時:** ${deploymentInfo.deployment.timestamp}

## Compiler Settings / コンパイラ設定

\`\`\`json
{
  "compiler": {
    "version": "${deploymentInfo.compilation.solcVersion}",
    "longVersion": "${deploymentInfo.compilation.solcLongVersion}"
  },
  "optimizer": {
    "enabled": ${deploymentInfo.compilation.optimizer.enabled},
    "runs": ${deploymentInfo.compilation.optimizer.runs}
  },
  "viaIR": ${deploymentInfo.compilation.viaIR},
  "evmVersion": "${deploymentInfo.compilation.evmVersion}"
}
\`\`\`

## Constructor Arguments / コンストラクタ引数

### Human-Readable / 人間が読める形式
\`\`\`javascript
{
  "owner_": "${deployer.address}"  // address型
}
\`\`\`

### ABI-Encoded (PolygonScan用 - 0xなし)
\`\`\`
${encodedArgs}
\`\`\`

### ABI-Encoded (Hardhat用 - 0x付き)
\`\`\`
0x${encodedArgs}
\`\`\`

## Verification Commands / 検証コマンド

### Hardhat CLI
\`\`\`bash
npx hardhat verify --network polygon \\
  ${contractAddress} \\
  "${deployer.address}"
\`\`\`

### Manual Steps / 手動検証手順

1. **PolygonScan にアクセス**
   https://polygonscan.com/address/${contractAddress}#code

2. **「Verify & Publish」をクリック**

3. **設定を入力:**
   - Compiler Type: \`Solidity (Single File)\`
   - Compiler Version: \`${deploymentInfo.compilation.solcLongVersion}\`
   - Optimization: \`Yes\`
   - Runs: \`${deploymentInfo.compilation.optimizer.runs}\`
   - EVM Version: \`${deploymentInfo.compilation.evmVersion}\`

4. **ソースコードを貼り付け:**
   - \`JpycStampSBT_Flattened.sol\` の全内容

5. **コンストラクタ引数を入力（0xなし）:**
   \`\`\`
   ${encodedArgs}
   \`\`\`

6. **「Verify & Publish」をクリック**

## URLs

- **Contract:** https://polygonscan.com/address/${contractAddress}
- **Transaction:** https://polygonscan.com/tx/${deployTx.hash}
- **Verification:** https://polygonscan.com/address/${contractAddress}#code

## Files / ファイル

- Deployment Info: \`deployments/${detailedFilename}\`
- Artifact Backup: \`deployments/artifacts/JpycStampSBT-${timestamp}.json\`
- This Guide: \`deployments/VERIFICATION-${contractAddress}.md\`

## Notes / 注意事項

- ⚠️ **viaIR が true** になっていることを確認してください
- ⚠️ コンストラクタ引数は **0xなし** で入力してください（PolygonScan Web UI）
- ⚠️ フラッテン版ソースコード(\`JpycStampSBT_Flattened.sol\`)を使用してください

---

Generated by: deploy-mainnet-enhanced.js
Generated at: ${new Date().toISOString()}
`;
  
  const verificationReadmePath = path.join(deploymentPath, `VERIFICATION-${contractAddress}.md`);
  fs.writeFileSync(verificationReadmePath, verificationReadme);
  console.log("💾 検証用READMEを生成しました:", verificationReadmePath);
  
  // 設定情報出力
  console.log("\n" + "=".repeat(60));
  console.log("📋 デプロイ完了サマリー");
  console.log("=".repeat(60));
  console.log(`Network: Polygon Mainnet (Chain ID: 137)`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Transaction: https://polygonscan.com/tx/${deployTx.hash}`);
  console.log(`Contract: https://polygonscan.com/address/${contractAddress}`);
  console.log("=".repeat(60));
  
  console.log("\n📝 次の手順:");
  console.log("━".repeat(60));
  console.log("1️⃣  src/config/contracts.ts を更新");
  console.log(`   137: '${contractAddress}',`);
  console.log("");
  console.log("2️⃣  Polygonscan でコントラクトを検証（Verify）");
  console.log(`   npx hardhat verify --network polygon ${contractAddress} "${deployer.address}"`);
  console.log("");
  console.log("   または、検証用READMEを参照:");
  console.log(`   ${verificationReadmePath}`);
  console.log("");
  console.log("3️⃣  アプリケーションでショップオーナー登録");
  console.log("   - MetaMaskでPolygon Mainnetに接続");
  console.log("   - 設定画面で店舗情報を入力");
  console.log("   - SBT管理画面でショップオーナー登録を実行");
  console.log("");
  console.log("4️⃣  本番環境での動作確認");
  console.log("   - SBT発行のテスト");
  console.log("   - ユーザーでの受取確認");
  console.log("━".repeat(60));

  console.log("\n🎉 本番環境デプロイが正常に完了しました!");
  console.log(`\n📁 生成されたファイル:`);
  console.log(`   - ${simpleDeploymentFile}`);
  console.log(`   - ${detailedFilepath}`);
  console.log(`   - ${verificationReadmePath}`);
  if (artifact) {
    console.log(`   - deployments/artifacts/JpycStampSBT-${timestamp}.json`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ デプロイエラー:", error);
    process.exit(1);
  });
