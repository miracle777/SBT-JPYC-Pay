const hre = require("hardhat");

async function main() {
  const contractAddress = "0x26C55F745c5BF80475C2D024F9F07ce56E308039";
  const shopId = 1;

  console.log(`ショップID ${shopId} の状態を確認します...`);
  console.log(`コントラクトアドレス: ${contractAddress}`);

  // コントラクトに接続
  const JpycStampSBT = await hre.ethers.getContractAt("JpycStampSBT", contractAddress);

  // ショップ情報を取得
  try {
    const shopInfo = await JpycStampSBT.getShopInfo(shopId);
    console.log(`\nショップ情報:`);
    console.log(`  名前: ${shopInfo.name}`);
    console.log(`  オーナー: ${shopInfo.owner}`);
    console.log(`  必要訪問回数: ${shopInfo.requiredVisits.toString()}`);
    console.log(`  アクティブ: ${shopInfo.active}`);
    console.log(`  作成日時: ${new Date(Number(shopInfo.createdAt) * 1000).toLocaleString()}`);

    // isActiveShop関数でも確認
    const isActive = await JpycStampSBT.isActiveShop(shopId);
    console.log(`\nisActiveShop(${shopId}): ${isActive}`);

    // コントラクトオーナーを確認
    const owner = await JpycStampSBT.owner();
    console.log(`\nコントラクトオーナー: ${owner}`);

    // 現在のウォレットアドレス
    const [signer] = await hre.ethers.getSigners();
    console.log(`現在のウォレット: ${signer.address}`);
    console.log(`権限: ${owner.toLowerCase() === signer.address.toLowerCase() ? 'オーナー✅' : '一般ユーザー❌'}`);

  } catch (error) {
    console.error(`エラー: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
