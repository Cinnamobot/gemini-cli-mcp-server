# Gemini CLI MCP - AIエージェント向け運用マニュアル

> **目的**: Antigravity（メインAI）のコンテキスト削減と、効率的な並列マルチタスク実行

## 概要

Gemini CLI MCPサーバーは、AntigravityからGemini CLIへタスクを**委譲**するためのブリッジです。
これにより、Antigravityは重いコンテキストを保持せずに、複数のサブタスクを並列実行できます。

```text
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Antigravity   │──────│  Gemini CLI MCP  │──────│   Gemini CLI    │
│  (Orchestrator) │      │     (Bridge)     │      │   (Workers)     │
└─────────────────┘      └──────────────────┘      └─────────────────┘
       │                         │                        │
       │  タスク委譲             │                        │ 実行
       │  コンテキスト最小化     │                        │ 結果返却
       └─────────────────────────┴────────────────────────┘
```

---

## 利用可能なツール

| ツール | 用途 | 並列実行 |
|--------|------|----------|
| `chat` | 一般的な質問・分析 | ✅ |
| `googleSearch` | Web情報収集 | ✅ |
| `analyzeFile` | 画像/PDF/テキスト分析 | ✅ |
| `executeTask` | ファイル編集を含むタスク | ⚠️ 注意必要 |
| `listSessions` | セッション一覧取得 | ✅ |

---

## 🎯 プロンプト設計（最重要）

> **鉄則**: プロンプトは**超具体的**に書く。曖昧だと期待と異なる結果になる。

### ❌ 悪い例 vs ✅ 良い例

| 悪い例 | 良い例 |
|--------|--------|
| `"このコードを改善して"` | `"このTypeScriptコードのエラーハンドリングを改善してください。try-catchを追加し、エラーメッセージは日本語で出力してください。"` |
| `"調査して"` | `"MCP Model Context Protocolの2025年の最新動向を調査し、主要なアップデート3つを箇条書きで日本語でまとめてください。"` |
| `"バグを直して"` | `"line 42のnull参照エラーを修正してください。userオブジェクトがnullの場合は空配列を返すようにしてください。"` |

### プロンプトテンプレート

#### リサーチ用

```text
[トピック]について調査してください。

**出力形式**:
- 概要: 2-3文
- 主なポイント: 箇条書き3-5個
- 結論: 1文

**言語**: 日本語
```

#### コード分析用

```text
以下のファイルを分析してください: [ファイルパス]

**分析観点**:
1. エラーハンドリングの適切さ
2. パフォーマンスの問題
3. セキュリティリスク

**出力形式**: 問題点と改善案を表形式で
```

#### タスク実行用

```text
**タスク**: [具体的な作業内容]
**対象ファイル**: [パス]
**制約**:
- 既存のAPIは変更しない
- テストは追加する
- コメントは日本語で
**完了条件**: [明確な基準]
```

### 具体例: 実際のプロンプト

```typescript
// ❌ 悪い
mcp_gemini-cli_googleSearch({
  query: "TypeScript",
  model: "gemini-3-pro-preview"
})

// ✅ 良い
mcp_gemini-cli_googleSearch({
  query: "TypeScript 5.8の新機能を3つ、それぞれ1文で日本語で説明してください",
  model: "gemini-3-pro-preview"
})
```

```typescript
// ❌ 悪い
mcp_gemini-cli_executeTask({
  task: "テストを追加",
  files: ["src/auth.ts"]
})

// ✅ 良い
mcp_gemini-cli_executeTask({
  task: `src/auth.tsのlogin関数に対するユニットテストを追加してください。
         - 正常系: 有効な認証情報でトークンが返る
         - 異常系: 無効なパスワードでエラーが投げられる
         - テストフレームワーク: Jest
         - ファイル名: src/auth.test.ts`,
  files: ["src/auth.ts"],
  sandbox: true  // 安全のためsandboxモード
})
```

---

## 🛠️ コーディングエージェントへのタスク委譲

`executeTask` を使ってGemini CLIにコーディングタスクを委譲する際のベストプラクティス。

### 必須要素

タスク説明には以下を**必ず含める**:

| 要素 | 説明 | 例 |
|------|------|-----|
| **対象ファイル** | 絶対パスまたはプロジェクトルートからの相対パス | `src/auth/login.ts` |
| **対象関数/クラス** | 具体的な関数名・クラス名 | `login()`, `AuthService` |
| **変更内容** | 何をどう変更するか | `エラーハンドリングを追加` |
| **制約条件** | 守るべきルール | `既存のAPIシグネチャは変更しない` |
| **完了条件** | 成功の基準 | `全テストがパスする` |

### テンプレート: コーディングタスク

```text
**対象ファイル**: [パス]
**対象関数**: [関数名/クラス名]（行番号があれば記載: L42-L58）

**現状の問題**:
[何が問題か、なぜ変更が必要か]

**変更内容**:
1. [具体的な変更1]
2. [具体的な変更2]

**制約**:
- 既存のAPIシグネチャは変更しない
- 他のファイルへの影響を最小限に
- TypeScriptの型安全性を維持

**完了条件**:
- コンパイルエラーがない
- 既存テストがパスする
```

### 具体例: 実際のタスク委譲

#### 例1: 関数の修正

```typescript
mcp_gemini-cli_executeTask({
  task: `
**対象ファイル**: src/utils/validator.ts
**対象関数**: validateEmail() (L23-L35)

**現状の問題**:
空文字列を渡すとundefinedが返り、呼び出し元でエラーになる

**変更内容**:
1. 空文字列チェックを追加し、空の場合はfalseを返す
2. 正規表現パターンを RFC 5322 準拠に更新

**制約**:
- 関数シグネチャ validateEmail(email: string): boolean は変更しない
- 既存の正常なメールアドレスの判定結果は変わらないこと

**完了条件**:
- 空文字列でfalseが返る
- "test@example.com" でtrueが返る
`,
  files: ["src/utils/validator.ts"],
  sandbox: true
})
```

#### 例2: 新規関数の追加

```typescript
mcp_gemini-cli_executeTask({
  task: `
**対象ファイル**: src/services/user.ts
**追加する関数**: getUsersByRole(role: string): Promise<User[]>

**仕様**:
- roleパラメータに基づいてユーザーをフィルタリング
- 結果はUser[]型の配列で返す
- roleが空文字列の場合は全ユーザーを返す

**実装要件**:
- 既存のgetAllUsers()を内部で使用
- async/awaitパターンで実装
- JSDocコメントを追加（日本語）

**完了条件**:
- TypeScriptの型エラーがない
- 関数がexportされている
`,
  files: ["src/services/user.ts"],
  sandbox: true
})
```

#### 例3: リファクタリング

```typescript
mcp_gemini-cli_executeTask({
  task: `
**対象ファイル**: src/api/handler.ts
**対象クラス**: ApiHandler

**リファクタリング内容**:
handleRequest()メソッド（L45-L120）が75行と長すぎるため分割する

**分割方針**:
1. バリデーション処理 → validateRequest() に切り出し
2. レスポンス整形処理 → formatResponse() に切り出し
3. handleRequest()は上記を呼び出すオーケストレーターに

**制約**:
- public APIは handleRequest() のみ維持
- 新規メソッドはprivate
- 既存のテストが壊れないこと

**完了条件**:
- handleRequest()が30行以内になる
- 各メソッドが単一責任を持つ
`,
  files: ["src/api/handler.ts"],
  sandbox: true
})
```

### エラーを防ぐチェックリスト

```text
[ ] ファイルパスは正確か？（存在確認済み）
[ ] 関数名・クラス名は正確か？（スペルミスなし）
[ ] 行番号は最新か？（古い情報でないか）
[ ] 変更の意図が明確か？（なぜ変更するのか）
[ ] 制約が具体的か？（何をしてはいけないか）
[ ] 完了条件が検証可能か？（どうなったら成功か）
```

---

### パターン1: 情報収集の並列化

複数のトピックを同時に調査する場合：

```markdown
<!-- 並列実行すべき -->
mcp_gemini-cli_googleSearch(query="topic A")  // 同時
mcp_gemini-cli_googleSearch(query="topic B")  // 同時
mcp_gemini-cli_googleSearch(query="topic C")  // 同時
```

**推奨モデル**: `gemini-3-pro-preview`（より高品質な結果）

### パターン2: ファイル分析の並列化

複数の画像/ドキュメントを同時に分析：

```markdown
mcp_gemini-cli_analyzeFile(filePath="/path/to/image1.png") // 同時
mcp_gemini-cli_analyzeFile(filePath="/path/to/image2.png") // 同時
```

### パターン3: タスク委譲（シーケンシャル推奨）

ファイル編集を伴う `executeTask` は競合を避けるため**順次実行**：

```markdown
mcp_gemini-cli_executeTask(task="タスクA", files=[...])  // 完了を待つ
mcp_gemini-cli_executeTask(task="タスクB", files=[...])  // その後実行
```

---

## コンテキスト分割戦略

### 1. 重いリサーチはGeminiに委譲

```markdown
❌ 悪い例: Antigravity自身が大量のWeb検索結果を保持
✅ 良い例: googleSearchでGeminiに検索させ、要約だけ受け取る
```

### 2. ファイル分析の外部化

```markdown
❌ 悪い例: 大きなPDFをAntigravityが直接読み込み
✅ 良い例: analyzeFileでGeminiに分析させ、要点だけ取得
```

### 3. カスタムセッションIDで継続対話

**重要**: セッションIDは自分で独自に決められます！  
内部的にGemini CLIの実セッションIDにマッピングされるため、論理的な名前を使用可能。

```markdown
// 1. 初回チャット - 独自のセッションIDを指定
response1 = mcp_gemini-cli_chat(
  prompt="プロジェクト分析して",
  sessionId="project-analysis"  // ← 自分で決めたID
)

// 2. 同じセッションで続行（コンテキスト継続）
response2 = mcp_gemini-cli_chat(
  prompt="さらに詳しく",
  sessionId="project-analysis"  // ← 同じIDで継続
)

// 3. 別のタスク用に新しいセッション
response3 = mcp_gemini-cli_chat(
  prompt="バグを調査して",
  sessionId="bug-investigation"  // ← 別のセッション
)
```

**セッションIDの命名規則（推奨）**:

- タスク名: `"task-implement-auth"`, `"task-fix-bug-123"`
- 調査名: `"research-mcp-spec"`, `"research-typescript-5.8"`
- 機能名: `"feature-login"`, `"feature-dashboard"`

---

## ベストプラクティス

### モデル選択

| ユースケース | 推奨モデル |
|-------------|-----------|
| 高品質な分析・生成 | `gemini-3-pro-preview` |
| 高速な軽量タスク | `gemini-2.5-flash` |

### エラーハンドリング

- Gemini CLIのタイムアウト: 長時間タスクは分割を検討
- ファイル形式エラー: `analyzeFile`は.ts/.jsなどコードファイル非対応

### 並列実行の上限

- 同時実行数: 3〜5個程度を目安（API制限考慮）
- 重いタスクが多い場合は調整

---

## 使用例

### 例1: 技術調査の並列実行

```typescript
// 3つのトピックを同時に調査
const topics = ["React Server Components", "Deno 2.0", "Bun runtime"];
const results = await Promise.all(
  topics.map(topic =>
    mcp_gemini_cli_googleSearch({ query: topic, model: "gemini-3-pro-preview" })
  )
);
```

### 例2: UIスクリーンショットの一括分析

```typescript
const screenshots = ["home.png", "login.png", "dashboard.png"];
const analyses = await Promise.all(
  screenshots.map(file =>
    mcp_gemini_cli_analyzeFile({
      filePath: `/path/to/${file}`,
      prompt: "UIの改善点を3つ挙げてください"
    })
  )
);
```

---

## 注意事項

1. **executeTask の使用は慎重に**: ファイル編集権限があるため、YOLOモードは本番環境で避ける
2. **セッションIDの管理**: カスタムIDを使って論理的にグループ化
3. **モデル指定を忘れずに**: デフォルトモデルは品質が低い場合がある

---

## 関連リソース

- [README.md](./README.md) - プロジェクト概要
- [examples/](./examples/) - サンプルスクリプト
- `.agent/workflows/gemini-delegate-workflow.md` - 委譲ワークフロー
