const hre = require("hardhat");

async function main() {
  const contractAddress = "0x26C55F745c5BF80475C2D024F9F07ce56E308039";
  const shopId = 1;

  console.log(`ショップID ${shopId} をアクティブ化します...`);
  console.log(`コントラクトアドレス: ${contractAddress}`);

  // コントラクトに接続
  const JpycStampSBT = await hre.ethers.getContractAt("JpycStampSBT", contractAddress);

  // ショップをアクティブ化
  const tx = await JpycStampSBT.activateShop(shopId);
  console.log(`トランザクション送信: ${tx.hash}`);
  
  await tx.wait();
  console.log(`✅ ショップID ${shopId} をアクティブ化しました！`);

  // 確認
  const shopInfo = await JpycStampSBT.getShopInfo(shopId);
  console.log(`ショップ情報:`, {
    name: shopInfo.name,
    owner: shopInfo.owner,
    active: shopInfo.active
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
