---
description: Gemini CLI MCPを使用してタスクを委譲し、並列処理でコンテキストを削減するワークフロー
---
# Gemini CLI 委譲ワークフロー

Antigravityが重いタスクをGemini CLIに委譲し、効率的に並列処理するためのワークフロー。

## 前提条件

- Gemini CLI MCPサーバーが接続されていること
- 推奨モデル: `gemini-3-pro-preview`

---

## ワークフロー手順

### 1. タスクの分類

タスクを以下のカテゴリに分類する:

| カテゴリ | 委譲先ツール | 並列可否 |
|---------|-------------|----------|
| 情報収集・リサーチ | `googleSearch` | ✅ 並列OK |
| ファイル分析（画像/PDF） | `analyzeFile` | ✅ 並列OK |
| 一般的な質問・推論 | `chat` | ✅ 並列OK |
| コード編集・ファイル操作 | `executeTask` | ⚠️ 順次推奨 |

### 2. 並列実行（情報収集系）

複数の独立したリサーチタスクを**同時**に実行:

```typescript
mcp_gemini-cli_googleSearch(
  query="トピックA",
  model="gemini-3-pro-preview"
)

mcp_gemini-cli_googleSearch(
  query="トピックB", 
  model="gemini-3-pro-preview"
)
```

> [!TIP]
> 3〜5個程度の並列実行が推奨。それ以上は順次実行を検討。

### 3. 結果の統合

各Gemini CLIからの結果を受け取り、Antigravity側で統合・整理する。

```text
1. 各ツールの結果を収集
2. 重複情報を排除
3. 要点を抽出してコンテキストに追加
```

### 4. コンテキスト最小化

> [!IMPORTANT]
> Geminiからの生データをそのままコンテキストに保持しない。
> 要約・要点のみを保持してコンテキスト消費を最小化。

### 5. セッション活用（継続対話が必要な場合）

```typescript
// セッション一覧を取得
sessions = mcp_gemini-cli_listSessions()

// 特定のセッションを再開
mcp_gemini-cli_chat(
  prompt="続きを教えて",
  sessionId="session-xxx"
)
```

---

## ユースケース別ガイド

### ケース1: 技術調査

```text
1. googleSearch で複数トピックを並列調査
2. 結果を要約してまとめ
3. ユーザーに報告
```

// turbo-all

### ケース2: UIレビュー

```text
1. analyzeFile で複数スクリーンショットを並列分析
2. 改善点を集約
3. 優先順位付けしてレポート
```

### ケース3: コード分析（大規模）

```text
1. 対象ファイルをリストアップ
2. executeTask で分析タスクを委譲（sandboxモード推奨）
3. 結果をまとめて報告
```

---

## 注意事項

1. **executeTask + yolo は危険**: 本番環境ではsandboxモードを使用
2. **モデル指定を忘れない**: デフォルトモデルは低品質の場合あり
3. **タイムアウト考慮**: 長時間タスクは分割を検討

---

## 参照

- [AIエージェント向けマニュアル](../docs/AI_AGENT_MANUAL.md)
- [サンプルスクリプト](../examples/)
