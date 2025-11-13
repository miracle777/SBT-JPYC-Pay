#　全体像：SBT発行フロー（画像登録〜配信〜表示）

[1] 画像登録（Pinata）
      ↓
[2] metadata.json 作成（SBT情報）
      ↓
[3] スマートコントラクト(SBT)で mint 関数を実行
      ↓
[4] ユーザーのウォレットに SBT が届く
      ↓
[5] ウォレット側で “SBTの画像＋名前＋説明” を表示

① 管理者（ショップ）側のやること
1. SBT画像を Pinata にアップロード

Pinata の API で簡単にアップロードできます。

アップロード後、
画像CIDが取得されます：

```
ipfs://QmXxxxxxxx
```

2. metadata.json を Pinata へアップロード
```
{
  "name": "Certificate of Completion",
  "description": "This SBT certifies that the user completed the course.",
  "image": "ipfs://Qm画像CID"
}
```

これを Pinata にアップロードして
metadata の CID を取得：
```
ipfs://QmYYYYYYYY
```
3. SBTコントラクトの Mint 関数を実行
🎯 必要な関数（ERC-721 + Soulbound拡張）

mint(address to, string tokenURI)

transferFrom を無効化（SBT仕様）

approve を無効化

burn は optional（ほぼ不要）

4. SBT配信

管理者がユーザーのウォレットアドレスを指定して mint します。

配信方法の例

Shopify の管理画面風「SBT発行ボタン」

CSVアップロードで一括発行

REST API でバックエンドから自動発行

管理者用（ショップ側）

✔ Pinata へ画像＋メタデータを登録する Pythonコード
✔ 自動で metadata.json を生成するスクリプト
✔ Avalanche / Polygon どちらでも使える SBTコントラクト（Solidity）
✔ デプロイ用の Hardhat / Foundry プロジェクト
✔ 管理用ダッシュボード（ブラウザUI）
✔ ボタン1つで mint するツール
✔ 配信履歴の保存（Supabase / PostgreSQL）

1. JPYC のネットワーク＆コントラクト整理
✅ 現状の JPYC（JPYC v2）の公式アドレス

コミュニティ情報と各チェーンのエクスプローラを見ると、
JPYC v2 は複数チェーンで同じアドレスを使っています：


共通コントラクトアドレス（JPYC v2）

0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29

■ 本番ネットワーク（メインネット）
チェーン	Chain ID	JPYC コントラクト
Ethereum Mainnet	1	
Polygon PoS	137	
Avalanche C-Chain	43114	

🧱 SBT コントラクトの基本構造（イメージ）

ベース：ERC-721（NFT）

ただし 譲渡不可（Soulbound） にする：

transferFrom / safeTransferFrom をオーバーライドして常に revert

approve, setApprovalForAll も禁止

mintSBT(address to, uint256 shopId, string tokenURI) を管理者のみ実行可能

tokenId の設計例：

tokenId = shopId * 10^8 + serialNumber のように、上位桁でお店を区別

Solidity のざっくりイメージ：

function transferFrom(address, address, uint256) public pure override {
    revert("SBT: non-transferable");
}

デザイン（Pinata × 各ショップ）

各ショップごとに SBT 用画像を作成

画像を Pinata にアップロード → imageCID を取得

メタデータ（metadata.json）を作る：

{
  "name": "10th Visit Stamp - Shop A",
  "description": "Shop A のご利用が10回に達した記念のSBTです。",
  "image": "ipfs://<imageCID>",
  "attributes": [
    { "trait_type": "Shop", "value": "Shop A" },
    { "trait_type": "Visits", "value": 10 }
  ]
}


その metadata.json も Pinata へ → metadataCID

SBT コントラクトの tokenURI に ipfs://<metadataCID> を設定して mint

これで お店ごとにデザインが違う「10回目スタンプ SBT」 を簡単に量産できます。

4. 「10回目で発行」ロジックの設計
A. オフチェーンカウント＋オンチェーン発行（おすすめ）

お店のレジ / Web アプリ / QR 画面で、
ユーザーが自分のウォレットアドレス（または署名付きトークン）を提示

サーバー側（バックエンド）が visits テーブルで回数をカウント

10 回に達した瞬間に：

管理者ウォレットから mintSBT(userAddress, shopId, tokenURI) をコール

ガス代はお店側が負担（ユーザーはガスレスで OK）

メリット：

ガス代は「10回に1回」だけ

回数カウントがオフチェーンなので柔軟に修正可能

「9回目までの履歴は DB」、10回目にブロックチェーンで確定させるイメージ

① 全体フロー（ショップ管理者側）

SBT 1枚を発行するまでに必要な「Pinataまわり」の流れはこんな感じです：

SBT 画像を準備（PNG / JPG / SVG など）

Pinata に画像をアップロード → image CID を取得

その CID を使って metadata.json を生成

metadata.json も Pinata にアップロード → metadata CID を取得

スマートコントラクト（SBT）で mint するときに
tokenURI = "ipfs://<metadata_CID>" をセット

SBT用 metadata の形

まず「どんな JSON を作れば良いか」を決めておきます。
オーソドックスな NFT/SBT 形式はこんな感じ：

{
  "name": "Shop A 10th Visit Stamp",
  "description": "Shop A の利用が10回に達した記念のSBTです。",
  "image": "ipfs://<IMAGE_CID>",
  "attributes": [
    { "trait_type": "Shop", "value": "Shop A" },
    { "trait_type": "Visits", "value": 10 },
    { "trait_type": "Chain", "value": "Polygon" }
  ]
}


image：Pinata にアップした画像の CID

attributes：後で検索やフィルタに使えるので、

店舗名

利用回数（10回目記念など）

チェーン（Polygon / Avalanche など）
を入れておくと便利です。

③ Pinata の認証方式（ざっくり）

Pinata の API を使うには、
Pinata ダッシュボードで API Key / Secret または JWT を発行します。

ここでは分かりやすく API Key + Secret を使う前提で書きます。

環境変数（.env）などで保存しておくと安全です：

PINATA_API_KEY=xxxxxxxxxxxxxxxxxxxx
PINATA_API_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy


④ Python で「画像 → CID」「metadata → CID」を自動化する

ここからが「実務で嬉しい」部分です。

4-1. 必要なライブラリ
pip install requests python-dotenv


requests：HTTP クライアント

python-dotenv：.env を読み込む用（好みです）

4-2. 画像を Pinata にアップロードして CID を取得
```
import os
import requests
from dotenv import load_dotenv

load_dotenv()

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_API_SECRET = os.getenv("PINATA_API_SECRET")

PINATA_BASE_URL = "https://api.pinata.cloud"
PIN_FILE_URL = f"{PINATA_BASE_URL}/pinning/pinFileToIPFS"


def upload_image_to_pinata(file_path: str, pin_name: str | None = None) -> str:
    """
    画像ファイルを Pinata にアップロードして CID を返す
    """
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_api_secret": PINATA_API_SECRET,
    }

    with open(file_path, "rb") as f:
        files = {
            "file": (os.path.basename(file_path), f),
        }
        # メタデータ（ピン名）を付けたい場合
        metadata = {}
        if pin_name:
            metadata = {
                "pinataMetadata": '{"name": "' + pin_name + '"}'
            }

        response = requests.post(PIN_FILE_URL, files=files, headers=headers, data=metadata)

    response.raise_for_status()
    data = response.json()
    # 返ってくるフィールド例: { "IpfsHash": "Qm...", "PinSize": ..., "Timestamp": ... }
    return data["IpfsHash"]


```
使い方（例）：
```

image_cid = upload_image_to_pinata("shopA_10th.png", pin_name="ShopA_10th_stamp")
print("Image CID:", image_cid)
# →  Image CID: QmXXXXXXXXXXXX

```
4-3. metadata.json を生成して Pinata にアップロード

今度は JSON を Pinata に送る API を使います。
Pinata v1 では pinJSONToIPFS というエンドポイントが代表的です。
```

import json

PIN_JSON_URL = f"{PINATA_BASE_URL}/pinning/pinJSONToIPFS"


def upload_metadata_to_pinata(metadata: dict, pin_name: str | None = None) -> str:
    """
    metadata dict を Pinata にアップロードして CID を返す
    """
    headers = {
        "Content-Type": "application/json",
        "pinata_api_key": PINATA_API_KEY,
        "pinata_api_secret": PINATA_API_SECRET,
    }

    payload = {
        "pinataContent": metadata,
    }

    if pin_name:
        payload["pinataMetadata"] = {"name": pin_name}

    response = requests.post(PIN_JSON_URL, headers=headers, data=json.dumps(payload))
    response.raise_for_status()
    data = response.json()
    return data["IpfsHash"]

```
4-4. 「画像アップロード → metadata生成 → metadataアップロード」の一連処理
「ショップA・10回目スタンプ」の例：
```
def create_sbt_metadata_for_shop(
    shop_name: str,
    visits_threshold: int,
    image_file: str,
    chain_name: str = "Polygon",
):
    # 1. 画像をアップロードして CID 取得
    image_cid = upload_image_to_pinata(
        image_file,
        pin_name=f"{shop_name}_{visits_threshold}th_image"
    )

    # 2. metadata JSON を組み立て
    metadata = {
        "name": f"{shop_name} {visits_threshold}th Visit Stamp",
        "description": f"{shop_name} の利用が {visits_threshold} 回に達した記念のSBTです。",
        "image": f"ipfs://{image_cid}",
        "attributes": [
            {"trait_type": "Shop", "value": shop_name},
            {"trait_type": "Visits", "value": visits_threshold},
            {"trait_type": "Chain", "value": chain_name},
        ],
    }

    # 3. metadata を Pinata にアップロードして CID 取得
    metadata_cid = upload_metadata_to_pinata(
        metadata,
        pin_name=f"{shop_name}_{visits_threshold}th_metadata"
    )

    token_uri = f"ipfs://{metadata_cid}"
    print("Image CID:   ", image_cid)
    print("Metadata CID:", metadata_cid)
    print("TokenURI:    ", token_uri)

    return token_uri

```
実行例：
```
if __name__ == "__main__":
    token_uri = create_sbt_metadata_for_shop(
        shop_name="Welight Guitars",
        visits_threshold=10,
        image_file="welight_10th.png",
        chain_name="Polygon"
    )
    # ここで得られた token_uri を、Solidity の mint 関数の引数として渡すイメージ

```
将来の「お店ごと大量発行」に備えて

同じ Python スクリプトを、CSV や JSON から読み込む形にすると：

shops.csv

shop_name,visits_threshold,image_file
Welight Guitars,10,welight_10th.png
Cafe Kichijoji,10,cafe_10th.png
Ishida Factory,10,ishida_10th.png


これをループして create_sbt_metadata_for_shop(...) を回すだけで、
各ショップごとに SBT用 tokenURI の一覧 を自動生成できます。

その一覧を DB に保存しておけば：

スタンプが 10 回に達したときに

対象ショップの tokenURI を DB から取り出して

SBT コントラクトに mint(userAddress, tokenURI) を投げるだけ

というきれいな流れになります。

実装例：SBT スタンプカードコントラクト
✅ OpenZeppelin v4 系前提のコードです。
Hardhat なら npm install @openzeppelin/contracts で OK。
```

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title JPYC スタンプカード用 SBT (Soulbound Token)
/// @notice Shop ID ごとにデザインの異なる SBT を発行できるスタンプカードコントラクト
contract JpycStampSBT is ERC721URIStorage, Ownable {
    /// @dev 次に発行する tokenId（連番）
    uint256 private _nextTokenId = 1;

    /// @dev tokenId => shopId
    mapping(uint256 => uint256) private _tokenShopIds;

    /// @notice SBT が mint されたときに発火するイベント
    event SBTMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 indexed shopId,
        string tokenURI
    );

    /// @notice コンストラクタ
    /// @param owner_ コントラクトオーナー（発行者）
    constructor(address owner_) ERC721("JPYC Shop Stamp SBT", "JPYC-SBT") {
        _transferOwnership(owner_);
    }

    // ------------------------------------------------------------
    // SBT 発行 (mint)
    // ------------------------------------------------------------

    /// @notice SBT を発行する（オーナーのみ実行可能）
    /// @param to SBT を受け取るユーザーのアドレス
    /// @param shopId お店を識別する ID
    /// @param tokenURI_ Pinata で生成した metadata の URI (ipfs://...)
    /// @return tokenId 発行された SBT の tokenId
    function mintSBT(
        address to,
        uint256 shopId,
        string calldata tokenURI_
    ) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "Invalid recipient");
        require(shopId != 0, "shopId must be non-zero");

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _tokenShopIds[tokenId] = shopId;

        emit SBTMinted(to, tokenId, shopId, tokenURI_);
    }

    // ------------------------------------------------------------
    // SBT の閲覧系
    // ------------------------------------------------------------

    /// @notice 指定した tokenId に対応する Shop ID を取得
    function shopIdOf(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Query for nonexistent token");
        return _tokenShopIds[tokenId];
    }

    // ------------------------------------------------------------
    // Soulbound 化（譲渡禁止の実装）
    // ------------------------------------------------------------

    /// @dev すべてのトークン移転を禁止する（mint/burn を除く）
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 /* batchSize */
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, 1);

        // mint (from == 0) と burn (to == 0) は許可
        if (from != address(0) && to != address(0)) {
            revert("SBT: non-transferable");
        }
    }

    /// @dev approve を禁止
    function approve(address, uint256) public pure override {
        revert("SBT: approval not allowed");
    }

    /// @dev setApprovalForAll を禁止
    function setApprovalForAll(address, bool) public pure override {
        revert("SBT: approval not allowed");
    }

    /// @dev getApproved は常に address(0) を返す
    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }

    /// @dev isApprovedForAll も常に false
    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }

    // ------------------------------------------------------------
    // オプション: SBT の burn（取り消し）機能
    // ------------------------------------------------------------

    /// @notice SBT を burn する（オーナーのみ）
    /// @dev 誤発行や規約違反など、管理側で取り消したい場合用
    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
        delete _tokenShopIds[tokenId];
    }

    /// @dev URIStorage + ERC721 の多重継承のための override
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /// @dev tokenURI の override（URIStorage 側を優先）
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}

```
2. 管理者用（ショップ側）画面の例：Mint UI

React + TypeScript + ethers v6 を想定します。
（MetaMask やブラウザウォレットから実行）

ざっくりイメージ

ネットワーク：Polygon / Avalanche / Ethereum

ユーザーアドレス入力

shopId（この店舗用に固定でもOK）

tokenURI を選択（ローカルに保存したテンプレ or 手入力）

「SBTを発行」ボタン

コントラクト情報（例）
```
// config/contract.ts
export const STAMP_CONTRACT_ADDRESS = {
  polygon: "0x....", // デプロイした JpycStampSBT のアドレス
  avalanche: "0x....",
  ethereum: "0x....",
} as const;

// 最低限必要な ABI だけ抜粋
export const STAMP_CONTRACT_ABI = [
  "function mintSBT(address to, uint256 shopId, string tokenURI) external returns (uint256)",
  "event SBTMinted(address indexed to, uint256 indexed tokenId, uint256 indexed shopId, string tokenURI)"
];
```

管理画面コンポーネント例
```

// components/AdminMintPanel.tsx
import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { STAMP_CONTRACT_ABI, STAMP_CONTRACT_ADDRESS } from "../config/contract";

type NetworkKey = "polygon" | "avalanche" | "ethereum";

const NETWORK_LABEL: Record<NetworkKey, string> = {
  polygon: "Polygon",
  avalanche: "Avalanche",
  ethereum: "Ethereum",
};

export function AdminMintPanel() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>(() => {
    // localStorage から前回の選択を復元
    const saved = window.localStorage.getItem("jpycStampAdmin.network") as NetworkKey | null;
    return saved ?? "polygon";
  });

  const [shopId, setShopId] = useState<number>(() => {
    const saved = window.localStorage.getItem("jpycStampAdmin.shopId");
    return saved ? Number(saved) : 101; // この店舗用のID
  });

  const [userAddress, setUserAddress] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [status, setStatus] = useState<string>("未実行");
  const [isMinting, setIsMinting] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("jpycStampAdmin.network", selectedNetwork);
  }, [selectedNetwork]);

  useEffect(() => {
    window.localStorage.setItem("jpycStampAdmin.shopId", String(shopId));
  }, [shopId]);

  const handleMint = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask などのウォレットをブラウザにインストールしてください。");
        return;
      }
      if (!userAddress || !tokenURI) {
        alert("ユーザーアドレスと tokenURI を入力してください。");
        return;
      }

      setIsMinting(true);
      setStatus("トランザクション送信中…");

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contractAddress = STAMP_CONTRACT_ADDRESS[selectedNetwork];
      const contract = new Contract(contractAddress, STAMP_CONTRACT_ABI, signer);

      const tx = await contract.mintSBT(userAddress, shopId, tokenURI);
      setStatus("ブロックチェーンで承認待ち…");
      const receipt = await tx.wait();

      setStatus(`発行完了！ TxHash: ${receipt.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(`エラー: ${err?.message ?? String(err)}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="admin-mint-panel">
      <h2>ショップ用 SBT 発行画面</h2>

      <div>
        <label>ネットワーク</label>
        <select
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value as NetworkKey)}
        >
          {Object.entries(NETWORK_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Shop ID（この店舗のID）</label>
        <input
          type="number"
          value={shopId}
          onChange={(e) => setShopId(Number(e.target.value) || 0)}
        />
      </div>

      <div>
        <label>ユーザーウォレットアドレス</label>
        <input
          type="text"
          placeholder="0x..."
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
        />
      </div>

      <div>
        <label>tokenURI（ipfs://...）</label>
        <input
          type="text"
          placeholder="ipfs://Qm..."
          value={tokenURI}
          onChange={(e) => setTokenURI(e.target.value)}
        />
      </div>

      <button onClick={handleMint} disabled={isMinting}>
        {isMinting ? "発行中…" : "SBT を発行する"}
      </button>

      <p>ステータス：{status}</p>
    </div>
  );
}

```

# 導入するお店ごとにサーバーを要する形
クラウドでは、管理しない。
PWAも、行わないです。
