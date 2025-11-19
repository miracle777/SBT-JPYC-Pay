// Polygon Amoy Testnet用のデプロイスクリプト
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Polygon Amoy Testnet へのコントラクトデプロイを開始します...");
  console.log("=".repeat(60));

  // ネットワーク確認
  const network = await ethers.provider.getNetwork();
  console.log(`📡 接続ネットワーク: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (network.chainId !== 80002n) {
    throw new Error("❌ Polygon Amoy Testnet (Chain ID: 80002) に接続してください");
  }

  // アカウント情報取得
  const [deployer] = await ethers.getSigners();
  console.log("👤 デプロイアカウント:", deployer.address);
  
  // 残高確認
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 アカウント残高:", ethers.formatEther(balance), "POL");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("\n⚠️  警告: 残高が少ないです");
    console.log("💡 Polygon Faucet でテストPOLを取得してください:");
    console.log("   https://faucet.polygon.technology/");
    throw new Error("❌ 残高不足: 最低 0.01 POL が必要です");
  }

  // ガス価格確認
  const feeData = await deployer.provider.getFeeData();
  console.log("⛽ 現在のガス価格:", ethers.formatUnits(feeData.gasPrice || 0n, "gwei"), "Gwei");

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
  const txHash = jpycStampSBT.deploymentTransaction()?.hash;
  
  console.log("\n✅ デプロイ完了!");
  console.log("📍 コントラクトアドレス:", contractAddress);
  console.log("📝 トランザクションハッシュ:", txHash);
  console.log("👤 コントラクト所有者:", deployer.address);
  
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

  // デプロイ情報をファイルに保存
  const deploymentInfo = {
    network: "Polygon Amoy Testnet",
    chainId: 80002,
    contractAddress: contractAddress,
    deployer: deployer.address,
    transactionHash: txHash,
    timestamp: new Date().toISOString(),
    contractName: "JpycStampSBT",
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
  };

  const deploymentPath = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  const deploymentFile = path.join(deploymentPath, "amoy-deployment.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 デプロイ情報を保存しました:", deploymentFile);
  
  // 設定情報出力
  console.log("\n" + "=".repeat(60));
  console.log("📋 デプロイ完了サマリー");
  console.log("=".repeat(60));
  console.log(`Network: Polygon Amoy Testnet (Chain ID: 80002)`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Transaction: https://amoy.polygonscan.com/tx/${txHash}`);
  console.log(`Contract: https://amoy.polygonscan.com/address/${contractAddress}`);
  console.log("=".repeat(60));
  
  console.log("\n📝 次の手順:");
  console.log("━".repeat(60));
  console.log("1️⃣  src/config/contracts.ts を更新");
  console.log(`   80002: '${contractAddress}',`);
  console.log("");
  console.log("2️⃣  アプリケーションでショップオーナー登録");
  console.log("   - MetaMaskでAmoyテストネットに接続");
  console.log("   - 設定画面で店舗情報を入力");
  console.log("   - SBT管理画面でショップオーナー登録を実行");
  console.log("");
  console.log("3️⃣  SBT発行のテスト");
  console.log("   - ユーザーアドレスを指定してSBTを発行");
  console.log("   - Pinataに画像をアップロード");
  console.log("   - メタデータURIを生成して発行");
  console.log("");
  console.log("4️⃣  本番環境デプロイ（準備ができたら）");
  console.log("   - Polygon MainnetにPOLを用意");
  console.log("   - deploy-mainnet.js を実行");
  console.log("━".repeat(60));

  console.log("\n💡 ヒント:");
  console.log("   - Faucet: https://faucet.polygon.technology/");
  console.log("   - Explorer: https://amoy.polygonscan.com/");
  console.log("   - RPC: https://rpc-amoy.polygon.technology/");
  
  console.log("\n🎉 テストネットデプロイが正常に完了しました!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ デプロイエラー:", error);
    console.error("\n💡 トラブルシューティング:");
    console.error("   1. .env ファイルのPRIVATE_KEYが正しいか確認");
    console.error("   2. Amoy テストネットに接続しているか確認");
    console.error("   3. アカウントにテストPOLがあるか確認");
    console.error("   4. hardhat.config.js の設定を確認");
    process.exit(1);
  });
