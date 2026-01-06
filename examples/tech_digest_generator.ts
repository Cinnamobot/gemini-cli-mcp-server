#!/usr/bin/env npx ts-node
/**
 * Daily Tech Digest Generator
 *
 * Gemini CLI MCPサーバーの機能を活用して、
 * 最新の技術ニュースを収集し、日本語でダイジェストを生成するツール
 *
 * 使い方:
 *   npx ts-node examples/tech_digest_generator.ts [トピック]
 *
 * 例:
 *   npx ts-node examples/tech_digest_generator.ts "AI developments"
 *   npx ts-node examples/tech_digest_generator.ts "TypeScript 2025"
 */

import spawn from "cross-spawn";
import * as fs from "node:fs";
import * as path from "node:path";

interface SearchResult {
  topic: string;
  summary: string;
  timestamp: string;
}

interface DigestReport {
  generatedAt: string;
  topics: SearchResult[];
  overallSummary: string;
}

/**
 * Gemini CLIを実行してGoogle検索を行う
 */
async function searchWithGemini(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🔍 検索中: ${query}`);

    const args = [
      "-m",
      "gemini-3-pro-preview",
      "-p",
      `以下のトピックについてGoogle検索を行い、最新の情報を日本語で要約してください。

トピック: ${query}

以下の形式で回答してください：
## 概要
[1-2文の概要]

## 主なポイント
- [ポイント1]
- [ポイント2]
- [ポイント3]

## トレンド分析
[このトピックの現在のトレンドについて簡潔に説明]`,
    ];

    const child = spawn("gemini", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Gemini CLI exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (err: Error) => {
      reject(err);
    });
  });
}

/**
 * 複数のトピックについてダイジェストを生成
 */
async function generateDigest(topics: string[]): Promise<DigestReport> {
  console.log("\n📰 Daily Tech Digest Generator");
  console.log("================================\n");

  const results: SearchResult[] = [];

  for (const topic of topics) {
    try {
      const summary = await searchWithGemini(topic);
      results.push({
        topic,
        summary: summary.trim(),
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ ${topic} - 完了\n`);
    } catch (error) {
      console.error(`❌ ${topic} - エラー: ${error}`);
      results.push({
        topic,
        summary: `エラー: ${error}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 全体のサマリーを生成
  let overallSummary = "";
  try {
    const topicsList = topics.join(", ");
    const summaryPrompt = `以下のトピックについての調査結果を踏まえて、技術者向けの「今日のまとめ」を3文程度で作成してください: ${topicsList}`;

    overallSummary = await searchWithGemini(summaryPrompt);
  } catch (_error) {
    overallSummary = "サマリー生成に失敗しました。";
  }

  return {
    generatedAt: new Date().toISOString(),
    topics: results,
    overallSummary: overallSummary.trim(),
  };
}

/**
 * マークダウン形式でレポートを出力
 */
function formatAsMarkdown(report: DigestReport): string {
  let md = `# 📰 Daily Tech Digest

**生成日時**: ${new Date(report.generatedAt).toLocaleString("ja-JP")}

---

## 🎯 今日のまとめ

${report.overallSummary}

---

## 📋 トピック別詳細

`;

  for (const result of report.topics) {
    md += `### 🔹 ${result.topic}

${result.summary}

---

`;
  }

  md += `
## 📝 メタ情報

- **生成ツール**: Gemini CLI MCP Server
- **モデル**: gemini-3-pro-preview
- **生成時刻**: ${report.generatedAt}
`;

  return md;
}

/**
 * メイン関数
 */
async function main() {
  // デフォルトのトピック
  const defaultTopics = [
    "AI coding assistant 2025",
    "TypeScript latest features",
    "MCP Model Context Protocol",
  ];

  // コマンドライン引数からトピックを取得
  const customTopic = process.argv[2];
  const topics = customTopic ? [customTopic] : defaultTopics;

  console.log("🚀 Tech Digest Generator を起動しています...\n");
  console.log(`対象トピック: ${topics.join(", ")}\n`);

  try {
    const report = await generateDigest(topics);
    const markdown = formatAsMarkdown(report);

    // 結果をファイルに保存
    const outputDir = path.join(process.cwd(), "digests");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const outputPath = path.join(outputDir, `digest_${dateStr}.md`);

    fs.writeFileSync(outputPath, markdown, "utf-8");

    console.log(`\n${"=".repeat(60)}`);
    console.log("✨ ダイジェスト生成完了!");
    console.log(`📁 保存先: ${outputPath}`);
    console.log(`${"=".repeat(60)}\n`);

    // コンソールにも表示
    console.log(markdown);
  } catch (error) {
    console.error("❌ ダイジェスト生成に失敗しました:", error);
    process.exit(1);
  }
}

// 直接実行された場合のみmainを実行
main().catch(console.error);
