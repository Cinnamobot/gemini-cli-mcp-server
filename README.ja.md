# Gemini CLI MCP Server

🇺🇸 **[English](README.md)**

Model Context Protocol (MCP) を通じて AI アシスタントが Gemini の機能を利用できるようにする、Google の Gemini CLI 用シンプルな MCP サーバーラッパーです。

## 機能

このサーバーは Gemini CLI と連携する 3 つのツールを提供します：

- `googleSearch`: Gemini を使用して Google 検索を実行
- `chat`: Gemini との直接的な会話
- `analyzeFile`: Gemini のマルチモーダル機能を使用したファイル分析（画像、PDF、テキスト）

## 前提条件

- [Gemini CLI](https://github.com/google-gemini/gemini-cli) がインストールされ設定済みであること（--allow-npx フラグを使用する場合は任意）

## 🚀 Claude Code でのクイックスタート

### 1. MCP サーバーを追加

```bash
claude mcp add -s project gemini-cli -- npx gemini-cli-mcp-server --allow-npx
```

または、以下のインストールオプションセクションに示す設定で MCP クライアントを構成してください。

### 2. 試してみる

プロンプトの例：

- **検索**: 「Google を使って最新の TypeScript 5.0 の機能を検索して」
- **チャット**: 「JavaScript の async/await と Promise の違いを Gemini に説明してもらって」
- **ファイル分析**: 「/path/to/screenshot.png の画像を Gemini に分析してもらって」

## 🔧 インストールオプション

### npx と --allow-npx フラグを使用

```json
{
  "mcpServers": {
    "gemini-cli-mcp-server": {
      "command": "npx",
      "args": ["gemini-cli-mcp-server", "--allow-npx"]
    }
  }
}
```

### ローカル開発

1. クローンしてインストール：

```bash
git clone https://github.com/Cinnamobot/gemini-cli-mcp-server
cd gemini-cli-mcp-server
bun install
```

1. Claude Desktop の設定に追加：

```json
{
  "mcpServers": {
    "gemini-cli-mcp-server": {
      "command": "bun",
      "args": ["run", "/path/to/gemini-cli-mcp-server/index.ts"]
    }
  }
}
```

## 🌍 言語設定

ツールの説明とエラーメッセージは、環境変数で言語を切り替えられます：

```bash
# 日本語で起動
MCP_LANGUAGE=ja bun run index.ts

# 英語で起動（デフォルト）
MCP_LANGUAGE=en bun run index.ts
```

システムの `LANG` 環境変数も自動検出されます（例：`LANG=ja_JP.UTF-8`）。

## 🛠️ 利用可能なツール

### 1. googleSearch

Gemini CLI を使用して Google 検索を実行します。

**パラメータ:**

- `query`（必須）: 検索クエリ
- `limit`（任意）: 返す結果の最大件数
- `sandbox`（任意）: サンドボックスモードで実行
- `yolo`（任意）: 確認をスキップ
- `model`（任意）: 使用する Gemini モデル（デフォルト：「gemini-2.5-pro」）

### 2. chat

Gemini との会話を行います。

**パラメータ:**

- `prompt`（必須）: 会話のプロンプト
- `sandbox`（任意）: サンドボックスモードで実行
- `yolo`（任意）: 確認をスキップ
- `model`（任意）: 使用する Gemini モデル（デフォルト：「gemini-2.5-pro」）

### 3. analyzeFile

Gemini のマルチモーダル機能を使用してファイルを分析します。

**対応ファイル形式:**

- **画像**: PNG, JPG, JPEG, GIF, WEBP, SVG, BMP
- **テキスト**: TXT, MD, TEXT
- **ドキュメント**: PDF

**パラメータ:**

- `filePath`（必須）: 分析するファイルの絶対パス
- `prompt`（任意）: ファイル分析の追加指示
- `sandbox`（任意）: サンドボックスモードで実行
- `yolo`（任意）: 確認をスキップ
- `model`（任意）: 使用する Gemini モデル（デフォルト：「gemini-2.5-pro」）

## 💡 プロンプト例

gemini-cli-mcp-server の動作を確認するためのプロンプト例：

- **検索**: 「Google を使って最新の TypeScript 5.0 の機能を検索して」
- **チャット**: 「JavaScript の async/await と Promise の違いを Gemini に説明してもらって」
- **ファイル分析**: 「この画像に何が写っているか説明して: /Users/me/Desktop/screenshot.png」

## 🛠️ 使用例

### googleSearch

```typescript
// シンプルな検索
googleSearch({ query: "最新のAIニュース" });

// 件数制限付き検索
googleSearch({
  query: "TypeScript ベストプラクティス",
  limit: 5,
});
```

### chat

```typescript
// シンプルなチャット
chat({ prompt: "量子コンピューティングを簡単に説明して" });

// 別のモデルを使用
chat({
  prompt: "プログラミングについての俳句を書いて",
  model: "gemini-2.5-flash",
});
```

### analyzeFile

```typescript
// 画像を分析
analyzeFile({
  filePath: "/path/to/image.png",
  prompt: "この画像には何が写っていますか？",
});

// PDF を分析
analyzeFile({
  filePath: "/path/to/document.pdf",
  prompt: "このドキュメントの要点をまとめて",
});

// 特定の指示なしで一般的な分析
analyzeFile({ filePath: "/path/to/file.jpg" });
```

## 📝 開発

> **注意**: 開発には [Bun](https://bun.sh) ランタイムが必要です。

### 開発モードで実行

```bash
bun run dev
```

### テストを実行

```bash
bun test
```

### 本番用ビルド

```bash
# 開発ビルド
bun run build

# 本番ビルド（最小化）
bun run build:prod
```

### リントとフォーマット

```bash
# コードをリント
bun run lint

# コードをフォーマット
bun run format
```

## 🤝 コントリビューション

コントリビューションは大歓迎です！お気軽に Pull Request をお送りください。

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は LICENSE ファイルをご覧ください。

## 🔗 関連リンク

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Bun Runtime](https://bun.sh)
