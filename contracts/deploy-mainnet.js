// Polygon Mainnet用のデプロイスクリプト
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Polygon Mainnet へのコントラクトデプロイを開始します...");

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

  // コントラクトデプロイ
  console.log("\n📋 JpycStampSBT コントラクトをデプロイ中...");
  
  const JpycStampSBT = await ethers.getContractFactory("JpycStampSBT");
  const jpycStampSBT = await JpycStampSBT.deploy(deployer.address, {
    gasLimit: 3000000, // 3M ガスリミット
  });
  
  await jpycStampSBT.waitForDeployment();
  const contractAddress = await jpycStampSBT.getAddress();
  
  console.log("✅ デプロイ完了!");
  console.log("📍 コントラクトアドレス:", contractAddress);
  console.log("👤 コントラクト所有者:", deployer.address);
  
  // デプロイ後の検証
  console.log("\n🔍 デプロイ後検証...");
  try {
    const name = await jpycStampSBT.name();
    const symbol = await jpycStampSBT.symbol();
    const owner = await jpycStampSBT.owner();
    
    console.log("📝 コントラクト名:", name);
    console.log("🏷️  シンボル:", symbol);
    console.log("👤 所有者:", owner);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error("❌ 所有者が一致しません");
    }
    
    console.log("✅ 検証完了!");
  } catch (error) {
    console.error("❌ 検証エラー:", error.message);
    throw error;
  }
  
  // 設定情報出力
  console.log("\n📋 デプロイ完了情報:");
  console.log("=".repeat(50));
  console.log(`Network: Polygon Mainnet (Chain ID: 137)`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Transaction Hash: ${jpycStampSBT.deploymentTransaction()?.hash}`);
  console.log("=".repeat(50));
  
  console.log("\n📝 次の手順:");
  console.log("1. src/config/contracts.ts の Polygon Mainnet (137) アドレスを更新してください:");
  console.log(`   137: '${contractAddress}',`);
  console.log("2. Polygonscan での検証:");
  console.log(`   https://polygonscan.com/address/${contractAddress}`);
  console.log("3. アプリケーションでの動作確認を実施してください");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ デプロイエラー:", error);
    process.exit(1);
  });