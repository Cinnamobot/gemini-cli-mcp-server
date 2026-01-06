#!/usr/bin/env npx ts-node
/**
 * Screenshot UI Analyzer
 *
 * Gemini CLI MCPサーバーのanalyzeFile機能を活用して、
 * UIスクリーンショットを分析し、改善提案を生成するツール
 *
 * 使い方:
 *   npx ts-node examples/screenshot_analyzer.ts <画像パス>
 *
 * 例:
 *   npx ts-node examples/screenshot_analyzer.ts ./screenshots/homepage.png
 */

import spawn from "cross-spawn";
import * as fs from "node:fs";
import * as path from "node:path";

interface AnalysisResult {
  filePath: string;
  analysis: string;
  suggestions: string[];
  timestamp: string;
}

const SUPPORTED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
];

/**
 * Gemini CLIを使用して画像を分析
 */
async function analyzeImage(
  imagePath: string,
  mode: AnalysisMode,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(imagePath);

    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`ファイルが見つかりません: ${absolutePath}`));
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      reject(new Error(`サポートされていないファイル形式: ${ext}`));
      return;
    }

    console.log(`🔍 分析中: ${absolutePath}`);

    const prompts: Record<AnalysisMode, string> = {
      ui: `この画像はUIスクリーンショットです。以下の観点で分析してください：

1. **UIデザイン評価**
   - レイアウトの一貫性
   - 色使いとコントラスト
   - タイポグラフィ
   - 余白とスペーシング

2. **UX（ユーザー体験）**
   - 直感的な操作性
   - 情報の階層構造
   - アクセシビリティ

3. **改善提案**
   - 具体的な改善点を3-5個リストアップ

日本語で回答してください。`,

      accessibility: `この画像のアクセシビリティを評価してください：

1. **色のコントラスト比**
2. **テキストの読みやすさ**
3. **インタラクティブ要素の識別しやすさ**
4. **スクリーンリーダーとの互換性（推測）**

WCAG 2.1ガイドラインに基づいて評価し、改善提案を日本語で提供してください。`,

      general: `この画像について詳しく分析してください。
何が写っているか、どのような目的で使用されるか、
そして特筆すべき点があれば教えてください。日本語で回答してください。`,
    };

    const args = ["-p", prompts[mode], absolutePath];

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

type AnalysisMode = "ui" | "accessibility" | "general";

/**
 * 分析結果をマークダウン形式で出力
 */
function formatReport(result: AnalysisResult): string {
  return `# 📸 画像分析レポート

**ファイル**: \`${result.filePath}\`
**分析日時**: ${new Date(result.timestamp).toLocaleString("ja-JP")}

---

## 📋 分析結果

${result.analysis}

---

## ✨ 生成情報

- **ツール**: Gemini CLI MCP Server
- **分析時刻**: ${result.timestamp}
`;
}

/**
 * メイン関数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📸 Screenshot UI Analyzer
========================

使い方:
  npx ts-node examples/screenshot_analyzer.ts <画像パス> [モード]

モード:
  ui            - UIデザイン評価（デフォルト）
  accessibility - アクセシビリティ評価
  general       - 一般的な画像分析

例:
  npx ts-node examples/screenshot_analyzer.ts ./screenshot.png
  npx ts-node examples/screenshot_analyzer.ts ./screenshot.png accessibility
`);
    process.exit(0);
  }

  const imagePath = args[0];
  const mode: AnalysisMode = (args[1] as AnalysisMode) || "ui";

  console.log("\n🚀 Screenshot Analyzer を起動しています...\n");

  try {
    const analysis = await analyzeImage(imagePath, mode);

    const result: AnalysisResult = {
      filePath: path.resolve(imagePath),
      analysis: analysis.trim(),
      suggestions: [],
      timestamp: new Date().toISOString(),
    };

    const report = formatReport(result);

    // 結果をファイルに保存
    const outputDir = path.join(process.cwd(), "analysis_reports");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(imagePath, path.extname(imagePath));
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(
      outputDir,
      `${baseName}_analysis_${dateStr}.md`,
    );

    fs.writeFileSync(outputPath, report, "utf-8");

    console.log(`\n${"=".repeat(60)}`);
    console.log("✨ 分析完了!");
    console.log(`📁 レポート保存先: ${outputPath}`);
    console.log(`${"=".repeat(60)}\n`);

    console.log(report);
  } catch (error) {
    console.error("❌ 分析に失敗しました:", error);
    process.exit(1);
  }
}

main().catch(console.error);
