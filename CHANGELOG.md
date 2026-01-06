# Changelog

このプロジェクトのすべての重要な変更はこのファイルに記録されます。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいており、
バージョニングは [Semantic Versioning](https://semver.org/spec/v2.0.0.html) に従います。

## [Unreleased]

## [0.3.1] - 2026-01-06

### Added

- `executeTask` ツールを追加（タスク実行専用、sandbox: false がデフォルト）([#13](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/13))
- `googleSearch` に `sessionId` パラメータを追加 ([#12](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/12))
- `analyzeFile` の統合テストを追加 ([#14](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/14))

### Changed

- `chat` ツールのデフォルトを `sandbox: true` に変更（安全性向上）([#13](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/13))

## [0.3.0] - 2026-01-05

### Added

- `listSessions` ツールを追加（セッション一覧取得）([#11](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/11))
- `sessionId` パラメータによるセッション継続機能 ([#11](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/11))
- `chat` と `analyzeFile` に `sessionId` オプションを追加

### Changed

- 不正確なツール（`listModels`, `getRateLimits`, `reviewChanges`）を削除 ([#10](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/10))

## [0.2.0] - 2025-12-22

### Added

- `analyzeFile` ツールを追加（画像・テキスト・PDF分析）
- 日本語ロケールサポート (`locales/ja.json`)
- CI/CD ワークフロー

### Changed

- リポジトリを Cinnamobot/gemini-cli-mcp-server に移行

## [0.1.0] - 2025-12-22

### Added

- 初期リリース
- `googleSearch` ツール
- `chat` ツール
- Windows互換性の修正 ([#1](https://github.com/Cinnamobot/gemini-cli-mcp-server/pull/1))

---

[Unreleased]: https://github.com/Cinnamobot/gemini-cli-mcp-server/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/Cinnamobot/gemini-cli-mcp-server/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Cinnamobot/gemini-cli-mcp-server/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Cinnamobot/gemini-cli-mcp-server/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Cinnamobot/gemini-cli-mcp-server/releases/tag/v0.1.0
