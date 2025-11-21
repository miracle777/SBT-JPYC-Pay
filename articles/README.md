# Zenn記事について

このディレクトリには、Zennに投稿する技術記事のMarkdownファイルが格納されています。

## 記事一覧

### `sbt-jpyc-pay-development-story.md`
- **タイトル**: 【失敗から学ぶ】SBTスタンプカード×暗号資産決済アプリ開発の全記録
- **トピック**: blockchain, web3, solidity, polygon, react
- **ステータス**: 下書き

## Zennへの投稿方法

### 方法1: GitHubリポジトリ連携（推奨）

1. Zennアカウントを作成: https://zenn.dev/
2. GitHub連携を設定
3. このリポジトリをZennに連携
4. `published: false` を `published: true` に変更してpush

### 方法2: Zenn エディタで直接編集

1. https://zenn.dev/dashboard にアクセス
2. 「記事を書く」をクリック
3. `articles/sbt-jpyc-pay-development-story.md` の内容をコピー＆ペースト
4. プレビューで確認後、公開

### 方法3: Zenn CLI（現在エラーのため非推奨）

```bash
# 注意: 現在のNode.js v22環境ではエラーが発生します
npx zenn preview
```

## 記事の編集

記事を編集する場合は、`articles/sbt-jpyc-pay-development-story.md` を直接編集してください。

## 画像の追加

画像を追加する場合:

1. `public/images/zenn/` ディレクトリに画像を配置
2. 記事内で以下のように参照:

```markdown
![説明文](/images/zenn/your-image.png)
```

または、ZennのStorage機能を使用（GitHub連携時）:

```markdown
![説明文](https://storage.googleapis.com/zenn-user-upload/...)
```

## 参考リンク

- [Zenn CLIガイド](https://zenn.dev/zenn/articles/zenn-cli-guide)
- [Zenn Markdownガイド](https://zenn.dev/zenn/articles/markdown-guide)
- [GitHub連携ガイド](https://zenn.dev/zenn/articles/connect-to-github)
