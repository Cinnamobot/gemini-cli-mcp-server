import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getLocale, t } from "./i18n.js";

/**
 * Find an executable in PATH, respecting PATHEXT on Windows.
 * Equivalent to 'which' on Unix or 'where' on Windows,
 * but properly handles Windows executable extensions.
 */
export function findExecutable(name: string): string | null {
  const isWindows = process.platform === "win32";
  const pathEnv = process.env.PATH || "";
  const pathDirs = pathEnv.split(isWindows ? ";" : ":");

  // On Windows, get executable extensions from PATHEXT
  // Default: .COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC
  const pathExtList = isWindows
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").toLowerCase().split(";")
    : [""];

  for (const dir of pathDirs) {
    if (!dir) continue;

    for (const ext of pathExtList) {
      const fullPath = join(dir, name + ext);
      try {
        if (existsSync(fullPath)) {
          const stat = statSync(fullPath);
          if (stat.isFile()) {
            // On Unix, also check if executable
            if (!isWindows) {
              // Check execute permission (mode & 0o111)
              if ((stat.mode & 0o111) === 0) continue;
            }
            return fullPath;
          }
        }
      } catch {
        // Ignore errors (permission denied, etc.)
      }
    }
  }

  return null;
}

// Function to determine the gemini-cli command and its initial arguments
export async function decideGeminiCliCommand(
  allowNpx: boolean,
): Promise<{ command: string; initialArgs: string[] }> {
  // Use findExecutable instead of which/where command
  const geminiPath = findExecutable("gemini");

  if (geminiPath) {
    return { command: geminiPath, initialArgs: [] };
  }

  if (allowNpx) {
    return {
      command: "npx",
      initialArgs: ["https://github.com/google-gemini/gemini-cli"],
    };
  }

  throw new Error(t("errors.geminiNotFound"));
}

// Function to execute gemini-cli command
export async function executeGeminiCli(
  geminiCliCommand: { command: string; initialArgs: string[] },
  args: string[],
): Promise<string> {
  let { command, initialArgs } = geminiCliCommand;
  const commandArgs = [...initialArgs, ...args];
  let shell = false;

  // On Windows, if executing a .cmd or .bat file, we must use shell: true
  // and quote the command path manually to handle spaces.
  if (
    process.platform === "win32" &&
    (command.toLowerCase().endsWith(".cmd") ||
      command.toLowerCase().endsWith(".bat"))
  ) {
    shell = true;
    command = `"${command}"`;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
    });
    let stdout = "";
    let stderr = "";

    // Close stdin immediately since we're not sending any input
    child.stdin.end();

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`gemini exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

// Zod schema for googleSearch tool parameters
export const GoogleSearchParametersSchema = z.object({
  query: z.string().describe("The search query."),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return (optional)."),
  raw: z
    .boolean()
    .optional()
    .describe("Return raw search results with URLs and snippets (optional)."),
  sandbox: z.boolean().optional().describe("Run gemini-cli in sandbox mode."),
  yolo: z
    .boolean()
    .optional()
    .describe("Automatically accept all actions (aka YOLO mode)."),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
    ),
});

// Zod schema for geminiChat tool parameters
export const GeminiChatParametersSchema = z.object({
  prompt: z.string().describe("The prompt for the chat conversation."),
  sandbox: z.boolean().optional().describe("Run gemini-cli in sandbox mode."),
  yolo: z
    .boolean()
    .optional()
    .describe("Automatically accept all actions (aka YOLO mode)."),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
    ),
});

// Zod schema for geminiAnalyzeFile tool parameters
export const GeminiAnalyzeFileParametersSchema = z.object({
  filePath: z.string().describe("The absolute path to the file to analyze."),
  prompt: z
    .string()
    .optional()
    .describe(
      "Additional instructions for analyzing the file. If not provided, Gemini will provide a general analysis.",
    ),
  sandbox: z.boolean().optional().describe("Run gemini-cli in sandbox mode."),
  yolo: z
    .boolean()
    .optional()
    .describe("Automatically accept all actions (aka YOLO mode)."),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
    ),
});

// Zod schema for executeTask tool parameters (sub-coding agent)
export const GeminiExecuteTaskParametersSchema = z.object({
  task: z
    .string()
    .describe(
      "Description of the task to execute. Gemini will perform file edits, code generation, etc.",
    ),
  workingDirectory: z
    .string()
    .optional()
    .describe(
      "Working directory for the task. If not provided, uses current directory.",
    ),
  sandbox: z.boolean().optional().describe("Run gemini-cli in sandbox mode."),
  yolo: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Automatically accept all actions (aka YOLO mode). Defaults to true for task execution.",
    ),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
    ),
});

// Zod schema for reviewChanges tool parameters
export const GeminiReviewChangesParametersSchema = z.object({
  workingDirectory: z
    .string()
    .describe("Directory to review for changes (must be a git repository)."),
  focus: z
    .string()
    .optional()
    .describe("Specific aspects to focus on during review (e.g., 'security', 'performance')."),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash".',
    ),
});

// Extracted tool execution functions for testing
export async function executeGoogleSearch(args: unknown, allowNpx = false) {
  const parsedArgs = GoogleSearchParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Build prompt based on options
  let prompt: string;

  if (parsedArgs.raw) {
    // Structured grounding metadata format
    const limitText = parsedArgs.limit
      ? `\nLimit to ${parsedArgs.limit} sources.`
      : "";
    prompt = `Search for: "${parsedArgs.query}" and return the results in the following JSON format:
{
  "${parsedArgs.query}": {
    "summary": "Brief summary of findings",
    "groundingMetadata": {
      "searchQueries": ["list of search queries used"],
      "sources": [
        {
          "url": "source URL",
          "title": "source domain/title",
          "relevantExcerpts": ["key excerpts from this source"]
        }
      ]
    }
  }
}${limitText}`;
  } else {
    // Natural language search
    prompt = `Search for: ${parsedArgs.query}`;
    if (parsedArgs.limit) {
      prompt += ` (return up to ${parsedArgs.limit} results)`;
    }
  }

  const cliArgs = [prompt];

  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }

  // Return raw result without parsing - let the client handle it
  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

export async function executeGeminiChat(args: unknown, allowNpx = false) {
  const parsedArgs = GeminiChatParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);
  const cliArgs = [parsedArgs.prompt];
  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }
  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

// Supported file extensions for geminiAnalyzeFile
const SUPPORTED_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
];
const SUPPORTED_TEXT_EXTENSIONS = [".txt", ".md", ".text"];
const SUPPORTED_DOCUMENT_EXTENSIONS = [".pdf"];
const SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_TEXT_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
];

export async function executeGeminiAnalyzeFile(
  args: unknown,
  allowNpx = false,
) {
  const parsedArgs = GeminiAnalyzeFileParametersSchema.parse(args);

  // Check if file extension is supported
  const fileExtension = extname(parsedArgs.filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
    const locale = getLocale();
    throw new Error(
      `${t("errors.unsupportedFileType", { extension: fileExtension })}\n` +
      `${locale.errors.images}: ${SUPPORTED_IMAGE_EXTENSIONS.join(", ")}\n` +
      `${locale.errors.text}: ${SUPPORTED_TEXT_EXTENSIONS.join(", ")}\n` +
      `${locale.errors.documents}: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}`,
    );
  }

  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Build the prompt with file path
  let fullPrompt = `Analyze this file: ${parsedArgs.filePath}`;
  if (parsedArgs.prompt) {
    fullPrompt += `\n\n${parsedArgs.prompt}`;
  }

  const cliArgs = [fullPrompt];
  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }

  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

// Execute a coding task using Gemini as a sub-agent
export async function executeGeminiTask(args: unknown, allowNpx = false) {
  const parsedArgs = GeminiExecuteTaskParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Build the task prompt
  const taskPrompt = parsedArgs.task;

  const cliArgs = [taskPrompt];
  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  // Default to yolo mode for task execution
  if (parsedArgs.yolo !== false) {
    cliArgs.push("-y");
  }
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }

  // Execute with working directory if specified
  const result = await executeGeminiCliWithCwd(
    geminiCliCmd,
    cliArgs,
    parsedArgs.workingDirectory,
  );
  return result;
}

// Extended executeGeminiCli with working directory support
async function executeGeminiCliWithCwd(
  geminiCliCommand: { command: string; initialArgs: string[] },
  args: string[],
  cwd?: string,
): Promise<string> {
  let { command, initialArgs } = geminiCliCommand;
  const commandArgs = [...initialArgs, ...args];
  let shell = false;

  // On Windows, if executing a .cmd or .bat file, we must use shell: true
  // and quote the command path manually to handle spaces.
  if (
    process.platform === "win32" &&
    (command.toLowerCase().endsWith(".cmd") ||
      command.toLowerCase().endsWith(".bat"))
  ) {
    shell = true;
    command = `"${command}"`;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      cwd: cwd || process.cwd(),
    });
    let stdout = "";
    let stderr = "";

    // Close stdin immediately since we're not sending any input
    child.stdin.end();

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`gemini exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

// Review changes in a git repository and identify potential risks
export async function executeReviewChanges(args: unknown, allowNpx = false) {
  const parsedArgs = GeminiReviewChangesParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Get git diff
  const gitDiff = await new Promise<string>((resolve, reject) => {
    const child = spawn("git", ["diff", "--cached", "--diff-filter=ACMR"], {
      cwd: parsedArgs.workingDirectory,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        // Try unstaged diff if no staged changes
        const child2 = spawn("git", ["diff"], {
          cwd: parsedArgs.workingDirectory,
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout2 = "";
        child2.stdout.on("data", (data) => {
          stdout2 += data.toString();
        });
        child2.on("close", () => {
          resolve(stdout2);
        });
        child2.on("error", () => {
          reject(new Error(`git diff failed: ${stderr}`));
        });
      }
    });
    child.on("error", (err) => {
      reject(err);
    });
  });

  if (!gitDiff.trim()) {
    return "No changes detected in the repository.";
  }

  // Build review prompt
  let reviewPrompt = `Review the following code changes and identify:
1. **Potential Risks**: Security vulnerabilities, data loss risks, breaking changes
2. **Critical Issues**: Bugs, logic errors, performance problems
3. **Improvement Suggestions**: Best practices, code quality improvements

${parsedArgs.focus ? `Focus especially on: ${parsedArgs.focus}\n\n` : ""}
\`\`\`diff
${gitDiff}
\`\`\`

Provide a structured analysis in Japanese.`;

  const cliArgs = [reviewPrompt, "-y"];
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }

  const result = await executeGeminiCliWithCwd(
    geminiCliCmd,
    cliArgs,
    parsedArgs.workingDirectory,
  );
  return result;
}

// Get rate limits information
export async function executeGetRateLimits(allowNpx = false) {
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  const prompt = `What are the current Gemini API rate limits and quotas? 
  Please provide:
  1. Requests per minute (RPM)
  2. Tokens per minute (TPM)  
  3. Any other relevant limits
  
  Answer in Japanese with structured format.`;

  const cliArgs = [prompt, "-y"];
  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

async function main() {
  // Check for --allow-npx argument
  const allowNpx = process.argv.includes("--allow-npx");

  // Check if gemini-cli is available at startup
  try {
    await decideGeminiCliCommand(allowNpx);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(t("errors.installGemini"));
    process.exit(1);
  }

  const server = new McpServer({
    name: "gemini-cli-mcp-server",
    version: "0.3.0",
  });

  // Get locale for tool descriptions
  const locale = getLocale();

  // Register googleSearch tool
  server.registerTool(
    "googleSearch",
    {
      description: locale.tools.googleSearch.description,
      inputSchema: {
        query: z.string().describe(locale.tools.googleSearch.params.query),
        limit: z
          .number()
          .optional()
          .describe(locale.tools.googleSearch.params.limit),
        raw: z
          .boolean()
          .optional()
          .describe(locale.tools.googleSearch.params.raw),
        sandbox: z
          .boolean()
          .optional()
          .describe(locale.tools.googleSearch.params.sandbox),
        yolo: z
          .boolean()
          .optional()
          .describe(locale.tools.googleSearch.params.yolo),
        model: z
          .string()
          .optional()
          .describe(locale.tools.googleSearch.params.model),
      },
    },
    async (args) => {
      const result = await executeGoogleSearch(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Register chat tool
  server.registerTool(
    "chat",
    {
      description: locale.tools.chat.description,
      inputSchema: {
        prompt: z.string().describe(locale.tools.chat.params.prompt),
        sandbox: z
          .boolean()
          .optional()
          .describe(locale.tools.chat.params.sandbox),
        yolo: z.boolean().optional().describe(locale.tools.chat.params.yolo),
        model: z.string().optional().describe(locale.tools.chat.params.model),
      },
    },
    async (args) => {
      const result = await executeGeminiChat(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Register analyzeFile tool
  server.registerTool(
    "analyzeFile",
    {
      description: locale.tools.analyzeFile.description,
      inputSchema: {
        filePath: z.string().describe(locale.tools.analyzeFile.params.filePath),
        prompt: z
          .string()
          .optional()
          .describe(locale.tools.analyzeFile.params.prompt),
        sandbox: z
          .boolean()
          .optional()
          .describe(locale.tools.analyzeFile.params.sandbox),
        yolo: z
          .boolean()
          .optional()
          .describe(locale.tools.analyzeFile.params.yolo),
        model: z
          .string()
          .optional()
          .describe(locale.tools.analyzeFile.params.model),
      },
    },
    async (args) => {
      const result = await executeGeminiAnalyzeFile(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Register executeTask tool (sub-coding agent)
  server.registerTool(
    "executeTask",
    {
      description: locale.tools.executeTask.description,
      inputSchema: {
        task: z.string().describe(locale.tools.executeTask.params.task),
        workingDirectory: z
          .string()
          .optional()
          .describe(locale.tools.executeTask.params.workingDirectory),
        sandbox: z
          .boolean()
          .optional()
          .describe(locale.tools.executeTask.params.sandbox),
        yolo: z
          .boolean()
          .optional()
          .default(true)
          .describe(locale.tools.executeTask.params.yolo),
        model: z
          .string()
          .optional()
          .describe(locale.tools.executeTask.params.model),
      },
    },
    async (args) => {
      const result = await executeGeminiTask(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Register reviewChanges tool
  server.registerTool(
    "reviewChanges",
    {
      description: locale.tools.reviewChanges.description,
      inputSchema: {
        workingDirectory: z
          .string()
          .describe(locale.tools.reviewChanges.params.workingDirectory),
        focus: z
          .string()
          .optional()
          .describe(locale.tools.reviewChanges.params.focus),
        model: z
          .string()
          .optional()
          .describe(locale.tools.reviewChanges.params.model),
      },
    },
    async (args) => {
      const result = await executeReviewChanges(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Register getRateLimits tool
  server.registerTool(
    "getRateLimits",
    {
      description: locale.tools.getRateLimits.description,
      inputSchema: {},
    },
    async () => {
      const result = await executeGetRateLimits(allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Connect the server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main if this file is being executed directly
if (import.meta.main) {
  main().catch(console.error);
}
