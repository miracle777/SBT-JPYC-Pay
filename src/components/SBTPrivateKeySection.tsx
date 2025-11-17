import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle, AlertCircle, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { getAddressFromPrivateKey } from '../utils/helpers';

/**
 * SBT発行用の秘密鍵管理コンポーネント
 */
const SBTPrivateKeySection: React.FC = () => {
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [derivedAddress, setDerivedAddress] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [isValidating, setIsValidating] = useState(false);

  // ローカルストレージから秘密鍵を読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sbt-private-key');
      if (saved) {
        const decrypted = atob(saved); // 簡易Base64デコード（暗号化ではないことに注意）
        setPrivateKey(decrypted);
        validatePrivateKey(decrypted, true);
      }
    } catch (error) {
      console.warn('秘密鍵読み込みエラー:', error);
      localStorage.removeItem('sbt-private-key'); // 破損したデータを削除
    }
  }, []);

  // 秘密鍵の検証
  const validatePrivateKey = async (key: string, silent: boolean = false) => {
    if (!key.trim()) {
      setValidationStatus('unknown');
      setDerivedAddress('');
      return;
    }

    setIsValidating(true);

    try {
      // 0xプレフィックスがない場合は自動追加
      const cleanKey = key.trim().startsWith('0x') ? key.trim() : `0x${key.trim()}`;

      // ethers.js で秘密鍵の検証
      const wallet = new ethers.Wallet(cleanKey);
      const address = wallet.address;

      setDerivedAddress(address);
      setValidationStatus('valid');

      if (!silent) {
        toast.success(`✅ 有効な秘密鍵です\nアドレス: ${address.slice(0, 8)}...${address.slice(-6)}`);
      }
    } catch (error: any) {
      console.error('秘密鍵検証エラー:', error);
      setDerivedAddress('');
      setValidationStatus('invalid');

      if (!silent) {
        toast.error('❌ 無効な秘密鍵です');
      }
    } finally {
      setIsValidating(false);
    }
  };

  // 秘密鍵の保存
  const savePrivateKey = () => {
    if (validationStatus !== 'valid') {
      toast.error('有効な秘密鍵を入力してください');
      return;
    }

    try {
      // 簡易Base64エンコード（暗号化ではないことに注意）
      const encoded = btoa(privateKey);
      localStorage.setItem('sbt-private-key', encoded);
      
      toast.success('✅ SBT発行用秘密鍵を保存しました');
    } catch (error) {
      console.error('秘密鍵保存エラー:', error);
      toast.error('❌ 秘密鍵の保存に失敗しました');
    }
  };

  // 秘密鍵のクリア
  const clearPrivateKey = () => {
    if (confirm('🔑 SBT発行用秘密鍵を削除しますか？\n削除後はSBTの発行ができなくなります。')) {
      setPrivateKey('');
      setDerivedAddress('');
      setValidationStatus('unknown');
      localStorage.removeItem('sbt-private-key');
      toast.success('🧹 SBT発行用秘密鍵を削除しました');
    }
  };

  // 秘密鍵の変更時の検証
  const handlePrivateKeyChange = (value: string) => {
    setPrivateKey(value);
    if (value.trim()) {
      // デバウンス処理（1秒後に検証）
      setTimeout(() => {
        if (privateKey === value) { // まだ同じ値の場合のみ検証
          validatePrivateKey(value, true);
        }
      }, 1000);
    } else {
      setValidationStatus('unknown');
      setDerivedAddress('');
    }
  };

  return (
    <div className="space-y-4">
      {/* 秘密鍵入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SBT発行用秘密鍵 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type={showPrivateKey ? 'text' : 'password'}
            value={privateKey}
            onChange={(e) => handlePrivateKeyChange(e.target.value)}
            placeholder="0x1234567890abcdef... （コントラクトオーナーの秘密鍵）"
            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent font-mono text-sm ${
              validationStatus === 'valid' ? 'border-green-300 focus:ring-green-500' :
              validationStatus === 'invalid' ? 'border-red-300 focus:ring-red-500' :
              'border-gray-300 focus:ring-indigo-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPrivateKey(!showPrivateKey)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => validatePrivateKey(privateKey)}
            disabled={isValidating || !privateKey.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-2"
          >
            {isValidating ? '🔄' : '✓'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          SBT発行権限を持つウォレットの秘密鍵を入力してください。コントラクトオーナーである必要があります。
        </p>
      </div>

      {/* 検証ステータス */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">秘密鍵検証ステータス</label>
        <div className={`p-3 rounded-lg border ${
          validationStatus === 'valid' ? 'bg-green-50 border-green-200' : 
          validationStatus === 'invalid' ? 'bg-red-50 border-red-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            {validationStatus === 'valid' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {validationStatus === 'invalid' && <AlertCircle className="w-5 h-5 text-red-600" />}
            {validationStatus === 'unknown' && <Shield className="w-5 h-5 text-gray-600" />}
            <p className={`text-sm font-semibold ${
              validationStatus === 'valid' ? 'text-green-800' : 
              validationStatus === 'invalid' ? 'text-red-800' :
              'text-gray-800'
            }`}>
              {validationStatus === 'valid' && '✅ 有効な秘密鍵'}
              {validationStatus === 'invalid' && '❌ 無効な秘密鍵'}
              {validationStatus === 'unknown' && '❓ 未検証'}
              {isValidating && '🔄 検証中...'}
            </p>
          </div>
        </div>
      </div>

      {/* 導出されたアドレス */}
      {derivedAddress && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">導出されたウォレットアドレス</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={derivedAddress}
              disabled
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(derivedAddress);
                toast.success('アドレスをコピーしました');
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              📋
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            この秘密鍵に対応するウォレットアドレスです。コントラクトオーナーと一致していることを確認してください。
          </p>
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3">
        <button
          onClick={savePrivateKey}
          disabled={validationStatus !== 'valid'}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          秘密鍵を保存
        </button>
        {privateKey && (
          <button
            onClick={clearPrivateKey}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition duration-200 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            削除
          </button>
        )}
      </div>

      {/* セキュリティ説明 */}
      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <h4 className="font-semibold text-orange-900 mb-2">🔒 セキュリティについて</h4>
        <ul className="text-sm text-orange-800 space-y-1">
          <li>• <strong>ローカル保存:</strong> 秘密鍵はブラウザのローカルストレージにのみ保存されます</li>
          <li>• <strong>暗号化なし:</strong> Base64エンコードのみで真の暗号化ではありません</li>
          <li>• <strong>ネットワーク送信なし:</strong> 秘密鍵がサーバーに送信されることはありません</li>
          <li>• <strong>個人責任:</strong> 秘密鍵の管理は自己責任です</li>
          <li>• <strong>データ消失リスク:</strong> ブラウザデータ削除時に秘密鍵も消失します</li>
        </ul>
      </div>

      {/* 権限確認の説明 */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">👮 権限確認方法</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>設定 → ネットワーク情報でコントラクトアドレスを確認</li>
          <li>ブロックエクスプローラーでコントラクトの「owner」を確認</li>
          <li>上記で導出されたアドレスとowner が一致していることを確認</li>
          <li>一致していない場合はSBT発行権限がありません</li>
        </ol>
      </div>
    </div>
  );
};

export default SBTPrivateKeySection;