② ウォレット側（ユーザー）の表示
ウォレットが行うこと

ユーザーの address を取得

balanceOf(address) で所有トークン数を確認

tokenURI(tokenId) を取得

IPFS ネットワークから metadata.json を fetch

metadata 内の image（画像CID）を取得し表示

表示される内容

画像（Pinataで保存）

タイトル

説明文

受領日など

ユーザーウォレット側

✔ SBT表示用の UI（React / Next）
✔ tokenURI の取得
✔ IPFS画像の読み込み
✔ スマホでも表示できるWallet UI
✔ JPYCウォレットとの統合コード

ウォレットUIコンポーネント例
```
// components/StampWalletView.tsx
import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { STAMP_CONTRACT_ABI, STAMP_CONTRACT_ADDRESS } from "../config/contract";

type NetworkKey = "polygon" | "avalanche" | "ethereum";

interface StampData {
  tokenId: number;
  shopId: number;
  tokenURI: string;
  imageUrl?: string;
  name?: string;
  description?: string;
}

export function StampWalletView() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>("polygon");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [stamps, setStamps] = useState<StampData[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("未取得");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask などのウォレットをインストールしてください。");
      return;
    }
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    if (accounts.length > 0) {
      setWalletAddress(accounts[0]);
    }
  };

  const fetchStamps = async () => {
    try {
      if (!walletAddress) {
        alert("先にウォレットを接続してください。");
        return;
      }
      setLoading(true);
      setStatus("読み込み中…");

      const provider = new BrowserProvider(window.ethereum);
      const contractAddress = STAMP_CONTRACT_ADDRESS[selectedNetwork];
      const contract = new Contract(contractAddress, STAMP_CONTRACT_ABI, provider);

      // ここはコントラクトに totalMinted() を追加している前提
      const totalMinted: bigint = await contract.totalMinted();
      const maxId = Number(totalMinted);

      const result: StampData[] = [];

      for (let tokenId = 1; tokenId <= maxId; tokenId++) {
        try {
          const owner = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
            continue;
          }

          const tokenURI: string = await contract.tokenURI(tokenId);
          const shopId: bigint = await contract.shopIdOf(tokenId);

          // metadata を取得（ipfs:// → https://ipfs.io/ipfs/ に変換する例）
          let metadata: any = null;
          let imageUrl: string | undefined;
          let name: string | undefined;
          let description: string | undefined;

          if (tokenURI.startsWith("ipfs://")) {
            const cid = tokenURI.replace("ipfs://", "");
            const url = `https://ipfs.io/ipfs/${cid}`;
            const res = await fetch(url);
            metadata = await res.json();
            name = metadata.name;
            description = metadata.description;
            if (typeof metadata.image === "string" && metadata.image.startsWith("ipfs://")) {
              const imgCid = metadata.image.replace("ipfs://", "");
              imageUrl = `https://ipfs.io/ipfs/${imgCid}`;
            }
          }

          result.push({
            tokenId,
            shopId: Number(shopId),
            tokenURI,
            imageUrl,
            name,
            description,
          });
        } catch {
          // ownerOf でエラーになる burn 済トークンなどは無視
          continue;
        }
      }

      setStamps(result);
      setStatus(`取得完了（${result.length} 件）`);
    } catch (err: any) {
      console.error(err);
      setStatus(`エラー: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-stamp-view">
      <h2>スタンプカード（SBT）一覧</h2>

      <div>
        <button onClick={connectWallet}>
          {walletAddress ? "ウォレット接続済み" : "ウォレットを接続"}
        </button>
        {walletAddress && <p>アドレス：{walletAddress}</p>}
      </div>

      <div>
        <label>ネットワーク</label>
        <select
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value as NetworkKey)}
        >
          <option value="polygon">Polygon</option>
          <option value="avalanche">Avalanche</option>
          <option value="ethereum">Ethereum</option>
        </select>
      </div>

      <button onClick={fetchStamps} disabled={loading}>
        {loading ? "読み込み中…" : "SBTスタンプを取得"}
      </button>

      <p>ステータス：{status}</p>

      <div className="stamp-grid">
        {stamps.map((s) => (
          <div key={s.tokenId} className="stamp-card">
            {s.imageUrl && <img src={s.imageUrl} alt={s.name ?? `token ${s.tokenId}`} />}
            <h3>{s.name ?? `Token #${s.tokenId}`}</h3>
            <p>Shop ID: {s.shopId}</p>
            {s.description && <p>{s.description}</p>}
            <small>tokenId: {s.tokenId}</small>
          </div>
        ))}
        {stamps.length === 0 && <p>まだ SBT スタンプはありません。</p>}
      </div>
    </div>
  );
}
```

# PWA 対応にします。
データは、サーバーに保存しません。
# ユーザーは、自分のウォレットで SBT スタンプを管理します。
