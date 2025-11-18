/**
 * SBT カード表示コンポーネント
 * SBT の詳細情報とトランザクションリンクを表示
 */

import React from 'react';
import { ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getBlockExplorerUrl } from '../utils/sbtMinting';
import { getNetworkByChainId } from '../config/networks';

interface IssuedSBT {
  id: string;
  templateId: string;
  templateName: string;
  recipientAddress: string;
  currentStamps: number;
  maxStamps: number;
  issuedAt: string;
  status: 'active' | 'redeemed';
  sourcePaymentId?: string;
  transactionHash?: string;
  sbtTransactionHash?: string;
  sbtMintStatus?: 'pending' | 'success' | 'failed';
  chainId?: number;
}

interface SBTCardProps {
  sbt: IssuedSBT;
  cumulativeStamps?: number; // 累計スタンプ数(親から渡される)
}

const SBTCard: React.FC<SBTCardProps> = ({ sbt, cumulativeStamps }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'success':
        return '✅ 記録完了';
      case 'pending':
        return '⏳ 処理中';
      case 'failed':
        return '❌ 失敗';
      default:
        return '未記録';
    }
  };

  const network = sbt.chainId ? getNetworkByChainId(sbt.chainId) : undefined;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 text-white">
        <h3 className="font-bold text-lg">{sbt.templateName}</h3>
        <p className="text-sm text-purple-100 mt-1">
          {sbt.recipientAddress.slice(0, 12)}...{sbt.recipientAddress.slice(-10)}
        </p>
      </div>

      {/* 本体 */}
      <div className="p-6 space-y-4">
        {/* 発行状況 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-900">今回の発行</span>
            <span className="text-sm font-bold text-green-600">✅ 1個発行</span>
          </div>
        </div>

        {/* 累計スタンプ進捗 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">累計スタンプ</span>
            <span className="text-sm font-bold text-orange-600">
              {cumulativeStamps || sbt.currentStamps}/{sbt.maxStamps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all"
              style={{ width: `${((cumulativeStamps || sbt.currentStamps) / sbt.maxStamps) * 100}%` }}
            />
          </div>
        </div>

        {/* 基本情報 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">発行日</p>
            <p className="font-medium text-gray-900">{sbt.issuedAt}</p>
          </div>
          <div>
            <p className="text-gray-500">ステータス</p>
            <p className="font-medium text-gray-900">
              {sbt.status === 'active' ? '🟢 有効' : '🔵 特典獲得'}
            </p>
          </div>
        </div>

        {/* トランザクション情報 */}
        {(sbt.transactionHash || sbt.sbtTransactionHash) && (
          <div className="border-t pt-4 space-y-3">
            {/* JPYC決済トランザクション */}
            {sbt.transactionHash && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">💳 決済トランザクション</span>
                <a
                  href={getBlockExplorerUrl(sbt.transactionHash, sbt.chainId || 137)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {sbt.transactionHash.slice(0, 10)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* SBT Mint トランザクション */}
            {sbt.sbtTransactionHash && (
              <div className={`rounded-lg p-3 border ${getStatusColor(sbt.sbtMintStatus)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(sbt.sbtMintStatus)}
                    <span className="text-sm font-medium text-gray-900">
                      🎖️ SBT Mint トランザクション
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-white">
                    {getStatusText(sbt.sbtMintStatus)}
                  </span>
                </div>

                <a
                  href={getBlockExplorerUrl(sbt.sbtTransactionHash, sbt.chainId || 137)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-mono flex items-center gap-2 break-all"
                >
                  {sbt.sbtTransactionHash}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>

                {network && (
                  <p className="text-xs text-gray-600 mt-2">
                    ネットワーク: {network.displayName}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SBTCard;
