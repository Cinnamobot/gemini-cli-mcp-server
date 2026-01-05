# Gemini CLI MCP Server

[![CI](https://github.com/Cinnamobot/gemini-cli-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Cinnamobot/gemini-cli-mcp-server/actions/workflows/ci.yml)

🇺🇸 **[English](README.md)**

Google の [Gemini CLI](https://github.com/google-gemini/gemini-cli) 用シンプルな MCP サーバーラッパーです。Model Context Protocol を通じて AI アシスタントが Gemini の機能を利用できます。

## ✨ 機能

- **4つのツール**: `googleSearch`, `chat`, `listSessions`, `analyzeFile`
- **セッション継続**: セッションIDで過去の会話を再開可能
- **国際化対応**: 日本語/英語サポート
- **クロスプラットフォーム**: Windows, macOS, Linux 対応

## 🚀 クイックセットアップ

### Claude Code の場合

```bash
claude mcp add -s project gemini-cli -- npx gemini-cli-mcp-server --allow-npx
```

### 手動設定

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

## 🛠️ 利用可能なツール

### googleSearch

Gemini CLI を使用して Google 検索を実行します。

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `query` | ✅ | 検索クエリ |
| `limit` | | 結果の最大件数 |
| `raw` | | URL付きの構造化結果を返す |
| `model` | | Gemini モデル（デフォルト: `gemini-2.5-pro`）|

### chat

Gemini との会話を行います。

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `prompt` | ✅ | 会話のプロンプト |
| `sessionId` | | 過去のセッションを再開 |
| `model` | | Gemini モデル（デフォルト: `gemini-2.5-pro`）|

### listSessions

利用可能な Gemini CLI セッション一覧を取得します。返されたセッションIDは chat の `sessionId` パラメータで使用できます。

### analyzeFile

Gemini のマルチモーダル機能を使用してファイルを分析します。

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `filePath` | ✅ | ファイルの絶対パス |
| `prompt` | | 分析の追加指示 |
| `model` | | Gemini モデル（デフォルト: `gemini-2.5-pro`）|

**対応ファイル形式:**

- **画像**: PNG, JPG, JPEG, GIF, WEBP, SVG, BMP
- **テキスト**: TXT, MD
- **ドキュメント**: PDF

## 🌐 言語設定

ツールの説明とエラーメッセージは多言語対応しています:

```bash
# 日本語
MCP_LANGUAGE=ja npx gemini-cli-mcp-server --allow-npx

# 英語（デフォルト）
MCP_LANGUAGE=en npx gemini-cli-mcp-server --allow-npx
```

システムロケール（例: `LANG=ja_JP.UTF-8`）も自動検出されます。

## 📝 開発

```bash
# クローンしてインストール
git clone https://github.com/Cinnamobot/gemini-cli-mcp-server
cd gemini-cli-mcp-server
bun install

# テスト実行
bun test

# ビルド
bun run build
```

## 🙏 クレジット

このプロジェクトは [choplin/mcp-gemini-cli](https://github.com/choplin/mcp-gemini-cli) をベースにしています。

### フォーク元からの追加機能

- **listSessionsツール**: Gemini CLIセッション一覧の取得
- **セッション継続**: `sessionId` パラメータで会話を再開
- **国際化対応**: 日本語/英語サポート
- **Windows互換性**: 独自の `findExecutable` 関数（`which`/`where` 不要）
- **CI/CD**: GitHub Actions による自動テスト・ビルド

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🔗 関連リンク

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
