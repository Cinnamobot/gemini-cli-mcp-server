# Gemini CLI MCP Examples

Gemini CLI MCPサーバーの機能を活用したサンプルツール集です。

## 📦 含まれるツール

### 1. Tech Digest Generator (`tech_digest_generator.ts`)

最新の技術ニュースを収集し、日本語でダイジェストを生成するツールです。

**機能:**

- Google検索を使った最新情報の収集
- 複数トピックの同時調査
- マークダウン形式でのレポート出力

**使い方:**

```bash
# デフォルトトピック（AI, TypeScript, MCP）
npx ts-node examples/tech_digest_generator.ts

# カスタムトピック
npx ts-node examples/tech_digest_generator.ts "React Server Components 2025"
```

**出力例:**

```text
digests/
└── digest_2026-01-06.md
```

---

### 2. Screenshot Analyzer (`screenshot_analyzer.ts`)

UIスクリーンショットを分析し、改善提案を生成するツールです。

**機能:**

- UIデザイン評価
- アクセシビリティチェック（WCAG 2.1ベース）
- 一般的な画像分析

**使い方:**

```bash
# UIデザイン評価（デフォルト）
npx ts-node examples/screenshot_analyzer.ts ./screenshot.png

# アクセシビリティ評価
npx ts-node examples/screenshot_analyzer.ts ./screenshot.png accessibility

# 一般分析
npx ts-node examples/screenshot_analyzer.ts ./image.jpg general
```

**対応フォーマット:**

- PNG, JPG, JPEG, GIF, WebP, SVG, BMP

---

## 🛠️ セットアップ

```bash
# 依存関係のインストール
npm install

# Gemini CLIがインストールされていることを確認
gemini --version
```

## 💡 活用されているMCPツール

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `chat` | Geminiとの対話 | プロンプトベースの分析 |
| `googleSearch` | Web検索 | 最新情報の収集 |
| `analyzeFile` | ファイル分析 | 画像・PDF・テキストの分析 |
| `executeTask` | タスク実行 | ファイル編集を含むタスク |
| `listSessions` | セッション管理 | 会話の継続 |

## 📝 Notes

- これらのツールはGemini CLIをラップして動作します
- `gemini` コマンドがPATHに通っている必要があります
- Google認証が完了している必要があります
