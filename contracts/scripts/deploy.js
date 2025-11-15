const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying JPYC Stamp SBT Contract...");

  // デプロイアカウントを取得
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // アカウントの残高を表示
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // コントラクトをデプロイ
  const JpycStampSBT = await ethers.getContractFactory("JpycStampSBT");
  
  console.log("⏳ Deploying contract...");
  const jpycStampSBT = await JpycStampSBT.deploy(deployer.address);
  
  await jpycStampSBT.waitForDeployment();
  const contractAddress = await jpycStampSBT.getAddress();
  
  console.log("✅ JpycStampSBT deployed to:", contractAddress);
  console.log("   Owner:", deployer.address);

  // デプロイ情報を保存
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
    timestamp: new Date().toISOString(),
    transactionHash: jpycStampSBT.deploymentTransaction()?.hash,
  };

  // deployment.json ファイルに保存
  const deploymentPath = path.join(__dirname, "..", "..", "src", "config");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  const deploymentFile = path.join(deploymentPath, "deployment.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("📄 Deployment info saved to:", deploymentFile);

  // サンプル店舗を登録（オプション）
  try {
    console.log("\n🏪 Registering sample shops...");
    
    // shop.ts の DEFAULT_SHOP_INFO に対応
    const sampleShops = [
      {
        shopId: 1, // shop-001 に対応する数値ID
        name: "SBT JPYC Pay Demo Store",
        description: "デモンストレーション用の店舗",
        requiredVisits: 10,
      },
    ];

    for (const shop of sampleShops) {
      const tx = await jpycStampSBT.registerShop(
        shop.shopId,
        shop.name,
        shop.description,
        deployer.address, // Shop owner is deployer for demo
        shop.requiredVisits
      );
      
      await tx.wait();
      console.log(`   ✅ Registered shop: ${shop.name} (ID: ${shop.shopId})`);
    }

  } catch (error) {
    console.log("⚠️  Error registering sample shops:", error.message);
  }

  // ネットワーク別の確認手順を表示
  const network = await ethers.provider.getNetwork();
  console.log(`\n📋 Verification commands for ${network.name}:`);
  
  if (network.chainId === 137n) {
    console.log(`npx hardhat verify --network polygon ${contractAddress} "${deployer.address}"`);
  } else if (network.chainId === 43114n) {
    console.log(`npx hardhat verify --network avalanche ${contractAddress} "${deployer.address}"`);
  } else if (network.chainId === 1n) {
    console.log(`npx hardhat verify --network ethereum ${contractAddress} "${deployer.address}"`);
  } else {
    console.log(`npx hardhat verify --network ${network.name} ${contractAddress} "${deployer.address}"`);
  }

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });