import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  ExternalLink,
  Copy,
  Terminal,
  Wallet,
  Settings,
  FileCode,
  Globe,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * SBTシステムのセットアップガイドページ
 * コントラクトデプロイからショップオーナー登録までの完全な手順を案内
 */
const SetupGuide: React.FC = () => {
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [copiedText, setCopiedText] = useState<string>('');

  // ステップを完了済みにマーク
  const toggleStep = (stepNumber: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepNumber) 
        ? prev.filter(n => n !== stepNumber)
        : [...prev, stepNumber]
    );
  };

  // テキストをクリップボードにコピー
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label}をクリップボードにコピーしました`);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // 進捗率を計算
  const progress = Math.round((completedSteps.length / 8) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/sbt-management')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>SBT管理画面に戻る</span>
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚀 SBTシステム セットアップガイド
            </h1>
            <p className="text-gray-600 mb-4">
              コントラクトのデプロイからSBT発行までの完全な手順を順番に実施してください
            </p>

            {/* 進捗バー */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">セットアップ進捗</span>
                <span className="font-semibold text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* クイックリンク */}
            <div className="flex flex-wrap gap-2">
              <a
                href="https://faucet.polygon.technology/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-200"
              >
                <Globe className="w-3 h-3" />
                Polygon Faucet
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://amoy.polygonscan.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200"
              >
                <Globe className="w-3 h-3" />
                Amoy Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://docs.polygon.technology/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200"
              >
                <Globe className="w-3 h-3" />
                Polygon Docs
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ステップ1: 環境準備 */}
        <StepCard
          stepNumber={1}
          title="環境準備とウォレット設定"
          icon={<Wallet className="w-6 h-6" />}
          completed={completedSteps.includes(1)}
          onToggle={() => toggleStep(1)}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                まずはテストネットで試しましょう
              </h4>
              <p className="text-sm text-yellow-800">
                本番環境デプロイの前に、必ずPolygon Amoy テストネットで全ての手順を確認してください。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">1-1. MetaMaskのインストール</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>MetaMaskブラウザ拡張機能をインストール</li>
                <li>新しいウォレットを作成、または既存のウォレットをインポート</li>
                <li>シークレットリカバリーフレーズを安全に保管</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">1-2. Polygon Amoy テストネットの追加</h4>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono space-y-1">
                <p><span className="text-gray-600">ネットワーク名:</span> Polygon Amoy Testnet</p>
                <div className="flex items-center justify-between">
                  <p><span className="text-gray-600">RPC URL:</span> https://rpc-amoy.polygon.technology/</p>
                  <button
                    onClick={() => copyToClipboard('https://rpc-amoy.polygon.technology/', 'RPC URL')}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p><span className="text-gray-600">Chain ID:</span> 80002</p>
                <p><span className="text-gray-600">通貨シンボル:</span> POL</p>
                <div className="flex items-center justify-between">
                  <p><span className="text-gray-600">Block Explorer:</span> https://amoy.polygonscan.com/</p>
                  <button
                    onClick={() => copyToClipboard('https://amoy.polygonscan.com/', 'Explorer URL')}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">1-3. テストPOLの取得</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>
                  <a 
                    href="https://faucet.polygon.technology/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Polygon Faucet
                  </a>
                  にアクセス
                </li>
                <li>Polygon Amoy を選択</li>
                <li>ウォレットアドレスを入力してテストPOLを請求</li>
                <li>最低 0.1 POL 以上を確保（デプロイには約0.01 POL必要）</li>
              </ul>
            </div>
          </div>
        </StepCard>

        {/* ステップ2: プロジェクト設定 */}
        <StepCard
          stepNumber={2}
          title="プロジェクトの設定ファイル準備"
          icon={<FileCode className="w-6 h-6" />}
          completed={completedSteps.includes(2)}
          onToggle={() => toggleStep(2)}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">2-1. 環境変数ファイルの作成</h4>
              <p className="text-sm text-gray-700 mb-2">
                <code className="bg-gray-100 px-2 py-1 rounded">contracts/.env</code> ファイルを作成し、以下を設定:
              </p>
              <div className="bg-gray-900 text-gray-100 rounded p-4 text-xs font-mono relative">
                <button
                  onClick={() => copyToClipboard(
                    '# デプロイ用の秘密鍵（0xなし）\nPRIVATE_KEY=your_private_key_here\n\n# Polygon Amoy RPC URL\nAMOY_RPC_URL=https://rpc-amoy.polygon.technology/\n\n# Polygon Mainnet RPC URL（本番用）\nPOLYGON_RPC_URL=https://polygon-rpc.com\n\n# Polygonscan API Key（検証用・オプション）\nPOLYGONSCAN_API_KEY=your_api_key_here',
                    '.env内容'
                  )}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre className="overflow-x-auto">{`# デプロイ用の秘密鍵（0xなし）
PRIVATE_KEY=your_private_key_here

# Polygon Amoy RPC URL
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/

# Polygon Mainnet RPC URL（本番用）
POLYGON_RPC_URL=https://polygon-rpc.com

# Polygonscan API Key（検証用・オプション）
POLYGONSCAN_API_KEY=your_api_key_here`}</pre>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                セキュリティ警告
              </h4>
              <ul className="list-disc list-inside text-sm text-red-800 space-y-1 ml-4">
                <li><code>.env</code> ファイルは絶対にGitにコミットしないでください</li>
                <li>秘密鍵は安全に管理し、誰とも共有しないでください</li>
                <li>テスト用と本番用で異なるウォレットを使用することを推奨</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">2-2. 秘密鍵の取得方法</h4>
              <ul className="list-decimal list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>MetaMaskを開く</li>
                <li>アカウント詳細 → 秘密鍵をエクスポート</li>
                <li>パスワードを入力して秘密鍵を表示</li>
                <li><code>0x</code> を除いた部分を <code>PRIVATE_KEY</code> に設定</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">2-3. 依存パッケージのインストール</h4>
              <div className="bg-gray-900 text-gray-100 rounded p-4 text-sm font-mono relative">
                <button
                  onClick={() => copyToClipboard('cd contracts\nnpm install', 'インストールコマンド')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre>cd contracts<br/>npm install</pre>
              </div>
            </div>
          </div>
        </StepCard>

        {/* ステップ3: テストネットデプロイ */}
        <StepCard
          stepNumber={3}
          title="Amoy テストネットへのコントラクトデプロイ"
          icon={<Terminal className="w-6 h-6" />}
          completed={completedSteps.includes(3)}
          onToggle={() => toggleStep(3)}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>重要:</strong> 最初は必ずテストネットでデプロイして動作確認を行ってください。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">3-1. デプロイコマンドの実行</h4>
              <div className="bg-gray-900 text-gray-100 rounded p-4 text-sm font-mono relative">
                <button
                  onClick={() => copyToClipboard('cd contracts\nnpx hardhat run scripts/deploy-testnet.js --network polygonAmoy', 'デプロイコマンド')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre>cd contracts<br/>npx hardhat run scripts/deploy-testnet.js --network polygonAmoy</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">3-2. デプロイ成功の確認</h4>
              <p className="text-sm text-gray-700 mb-2">
                デプロイが成功すると、以下のような情報が表示されます:
              </p>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono">
                <p className="text-green-600">✅ デプロイ完了!</p>
                <p>📍 コントラクトアドレス: 0x1234...5678</p>
                <p>👤 コントラクト所有者: 0xabcd...ef01</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">3-3. コントラクトアドレスの保存</h4>
              <p className="text-sm text-gray-700">
                表示されたコントラクトアドレスをメモしてください。次のステップで使用します。
              </p>
            </div>
          </div>
        </StepCard>

        {/* ステップ4: 設定ファイル更新 */}
        <StepCard
          stepNumber={4}
          title="アプリケーション設定の更新"
          icon={<Settings className="w-6 h-6" />}
          completed={completedSteps.includes(4)}
          onToggle={() => toggleStep(4)}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">4-1. contracts.ts の更新</h4>
              <p className="text-sm text-gray-700 mb-2">
                <code className="bg-gray-100 px-2 py-1 rounded">src/config/contracts.ts</code> を開き、
                以下の部分を更新:
              </p>
              <div className="bg-gray-900 text-gray-100 rounded p-4 text-xs font-mono relative">
                <button
                  onClick={() => copyToClipboard('80002: \'0xYourContractAddressHere\',', '設定コード')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre>{`export const SBT_CONTRACT_ADDRESS: Record<number, string> = {
  // Testnet
  80002: '0xYourContractAddressHere', // ← ここを更新
  // Mainnet
  137: '0x0000000000000000000000000000000000000000',
};`}</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">4-2. アプリケーションの再起動</h4>
              <div className="bg-gray-900 text-gray-100 rounded p-4 text-sm font-mono relative">
                <button
                  onClick={() => copyToClipboard('npm run dev', '起動コマンド')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre>npm run dev</pre>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                開発サーバーを再起動して設定を反映させてください。
              </p>
            </div>
          </div>
        </StepCard>

        {/* ステップ5: 店舗情報設定 */}
        <StepCard
          stepNumber={5}
          title="店舗情報の登録"
          icon={<Settings className="w-6 h-6" />}
          completed={completedSteps.includes(5)}
          onToggle={() => toggleStep(5)}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">5-1. 設定画面へ移動</h4>
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              >
                設定画面を開く →
              </button>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">5-2. 必須情報の入力</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li><strong>店舗名:</strong> あなたの店舗の名前</li>
                <li><strong>店舗説明:</strong> サービス内容や特徴</li>
                <li><strong>ショップオーナーアドレス:</strong> デプロイに使用したウォレットアドレス</li>
                <li><strong>ロゴ画像:</strong> 店舗のロゴ（オプション）</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>ヒント:</strong> ショップオーナーアドレスは、コントラクトをデプロイしたアドレスと同じにしてください。
              </p>
            </div>
          </div>
        </StepCard>

        {/* ステップ6: ショップオーナー登録 */}
        <StepCard
          stepNumber={6}
          title="ブロックチェーンにショップオーナーを登録"
          icon={<Shield className="w-6 h-6" />}
          completed={completedSteps.includes(6)}
          onToggle={() => toggleStep(6)}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">注意事項</h4>
              <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 ml-4">
                <li>MetaMaskで Polygon Amoy テストネットに接続していることを確認</li>
                <li>ウォレットにテストPOLがあることを確認（約0.01 POL必要）</li>
                <li>デプロイに使用したアドレスで接続していることを確認</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">6-1. SBT管理画面へ移動</h4>
              <button
                onClick={() => navigate('/sbt-management')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              >
                SBT管理画面を開く →
              </button>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">6-2. 登録手順</h4>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2 ml-4">
                <li>ページ上部の警告エリアで「🏪 ショップオーナーとして登録する」ボタンをクリック</li>
                <li>MetaMaskでトランザクションを確認</li>
                <li>署名して送信</li>
                <li>トランザクションの完了を待つ（約10〜30秒）</li>
                <li>成功メッセージが表示されたら完了</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">6-3. 登録の確認</h4>
              <p className="text-sm text-gray-700">
                ページをリロードして、SBT発行権限があることを確認してください。
                「✅ SBT発行権限OK」というメッセージが表示されれば成功です。
              </p>
            </div>
          </div>
        </StepCard>

        {/* ステップ7: SBT発行テスト */}
        <StepCard
          stepNumber={7}
          title="テストSBTの発行"
          icon={<CheckCircle className="w-6 h-6" />}
          completed={completedSteps.includes(7)}
          onToggle={() => toggleStep(7)}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">7-1. SBTテンプレートの選択</h4>
              <p className="text-sm text-gray-700">
                SBT管理画面で、発行したいSBTのテンプレートを選択します。
                初期テンプレート（スタンプカード、マイルストーン、キャンペーン）から選択できます。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">7-2. 受取人アドレスの入力</h4>
              <p className="text-sm text-gray-700 mb-2">
                SBTを発行するユーザーのウォレットアドレスを入力します。
                テスト用に自分のアドレスを使用することもできます。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 自分のアドレスに発行してテストすることをお勧めします
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">7-3. 画像のアップロード</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>SBTに使用する画像を選択</li>
                <li>Pinataに自動的にアップロード</li>
                <li>IPFS URLが生成される</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">7-4. SBTの発行</h4>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2 ml-4">
                <li>「SBT発行」ボタンをクリック</li>
                <li>メタデータがPinataに保存される</li>
                <li>MetaMaskでトランザクションを確認</li>
                <li>署名して送信</li>
                <li>ミントが完了するまで待つ</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">7-5. 発行の確認</h4>
              <p className="text-sm text-gray-700">
                発行済みSBTリストに新しいSBTが表示されることを確認してください。
                Amoy Polygonscanでトランザクションの詳細も確認できます。
              </p>
            </div>
          </div>
        </StepCard>

        {/* ステップ8: 本番環境デプロイ */}
        <StepCard
          stepNumber={8}
          title="本番環境（Polygon Mainnet）へのデプロイ"
          icon={<Globe className="w-6 h-6" />}
          completed={completedSteps.includes(8)}
          onToggle={() => toggleStep(8)}
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                本番環境デプロイの注意事項
              </h4>
              <ul className="list-disc list-inside text-sm text-red-800 space-y-1 ml-4">
                <li>テストネットで全ての機能を十分にテストしてください</li>
                <li>本番用ウォレットに十分なPOL（約0.05 POL以上推奨）を用意</li>
                <li>デプロイ後はコントラクトを変更できません</li>
                <li>秘密鍵の管理に細心の注意を払ってください</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">8-1. 本番用ウォレットの準備</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>MetaMaskで Polygon Mainnet に切り替え</li>
                <li>POLトークンを購入または転送（最低0.05 POL推奨）</li>
                <li>本番用の秘密鍵を .env の PRIVATE_KEY に設定</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">8-2. 本番デプロイの実行</h4>
              <div className="bg-gray-900 text-gray-100 rounded p-4 text-sm font-mono relative">
                <button
                  onClick={() => copyToClipboard('cd contracts\nnpx hardhat run deploy-mainnet.js --network polygon', '本番デプロイコマンド')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre>cd contracts<br/>npx hardhat run deploy-mainnet.js --network polygon</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">8-3. contracts.ts の本番アドレス更新</h4>
              <p className="text-sm text-gray-700">
                デプロイ成功後、表示されたコントラクトアドレスを src/config/contracts.ts の
                Chain ID 137 の部分に設定してください。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">8-4. Polygonscan でコントラクト検証（オプション）</h4>
              <p className="text-sm text-gray-700 mb-2">
                コントラクトのソースコードを公開して検証します:
              </p>
              <div className="bg-gray-900 text-gray-100 rounded p-4 text-xs font-mono">
                <pre>npx hardhat verify --network polygon [コントラクトアドレス] "[デプロイヤーアドレス]"</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">8-5. 本番環境での動作確認</h4>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>MetaMaskで Polygon Mainnet に接続</li>
                <li>アプリケーションをリロード</li>
                <li>設定画面で店舗情報を入力</li>
                <li>ショップオーナー登録を実行</li>
                <li>テストSBTを発行して動作確認</li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">🎉 デプロイ完了！</h4>
              <p className="text-sm text-green-800">
                おめでとうございます！SBTシステムが本番環境で稼働開始しました。
                ユーザーにSBTを配布して、デジタルスタンプカードシステムを楽しんでください！
              </p>
            </div>
          </div>
        </StepCard>

        {/* トラブルシューティング */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            よくあるトラブルと解決方法
          </h2>

          <div className="space-y-4">
            <TroubleshootItem
              title="デプロイ時に「残高不足」エラー"
              solution="ウォレットに十分なPOL（テストネット: 0.1 POL、本番: 0.05 POL以上）があることを確認してください。テストネットの場合はFaucetで取得できます。"
            />

            <TroubleshootItem
              title="「Shop already registered」エラー"
              solution="そのショップIDは既に登録されています。別のショップIDを使用するか、既存のショップ情報を更新してください。"
            />

            <TroubleshootItem
              title="MetaMaskでトランザクションが表示されない"
              solution="正しいネットワーク（AmoyまたはPolygon）に接続しているか確認してください。また、ブラウザのポップアップブロックを無効にしてください。"
            />

            <TroubleshootItem
              title="Pinataへの画像アップロードが失敗する"
              solution="Pinata APIキーが正しく設定されているか確認してください。また、画像ファイルサイズが大きすぎないか確認してください（推奨: 5MB以下）。"
            />

            <TroubleshootItem
              title="SBT発行権限がない"
              solution="コントラクトオーナーまたはショップオーナーとして登録されているか確認してください。また、正しいウォレットアドレスで接続しているか確認してください。"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/sbt-management')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
          >
            セットアップを開始する →
          </button>
        </div>
      </div>
    </div>
  );
};

// ステップカードコンポーネント
interface StepCardProps {
  stepNumber: number;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({
  stepNumber,
  title,
  icon,
  completed,
  onToggle,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`bg-white rounded-lg shadow-lg mb-6 overflow-hidden border-2 ${
      completed ? 'border-green-400' : 'border-gray-200'
    }`}>
      <div
        className={`p-6 cursor-pointer ${
          completed ? 'bg-green-50' : 'bg-white'
        } hover:bg-gray-50 transition`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              completed ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-600'
            }`}>
              {completed ? <CheckCircle className="w-6 h-6" /> : icon}
            </div>
            <div>
              <div className="text-sm text-gray-500">ステップ {stepNumber}</div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`px-4 py-2 rounded font-semibold text-sm transition ${
                completed
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {completed ? '✓ 完了' : '完了にする'}
            </button>
            <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-6 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

// トラブルシューティング項目コンポーネント
interface TroubleshootItemProps {
  title: string;
  solution: string;
}

const TroubleshootItem: React.FC<TroubleshootItemProps> = ({ title, solution }) => {
  return (
    <div className="border-l-4 border-orange-400 bg-orange-50 p-4">
      <h4 className="font-semibold text-orange-900 mb-1">{title}</h4>
      <p className="text-sm text-orange-800">{solution}</p>
    </div>
  );
};

export default SetupGuide;
