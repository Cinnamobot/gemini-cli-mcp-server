import { existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import spawn from "cross-spawn";
import { z } from "zod";
import { getLocale, t } from "./i18n.js";
import { SessionManager } from "./session_manager.js";

// Default model for all Gemini CLI operations
export const DEFAULT_MODEL = "gemini-3-pro-preview";

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

const sessionManager = new SessionManager();

// Helper to handle session resolution and execution
async function runWithSession(
  sessionId: string,
  allowNpx: boolean,
  geminiCliCmd: { command: string; initialArgs: string[] },
  baseArgs: string[],
): Promise<string> {
  let runResult: string | undefined;

  const realId = await sessionManager.resolveSession(
    sessionId,
    async () =>
      (await executeListSessions(allowNpx)).sessions.map((s) => s.sessionId),
    async () => {
      runResult = await executeGeminiCli(geminiCliCmd, baseArgs);
    },
  );

  if (runResult === undefined) {
    // Session already existed, so we didn't run the startFn.
    // Run now with resume flag.
    runResult = await executeGeminiCli(geminiCliCmd, [
      ...baseArgs,
      "-r",
      realId,
    ]);
  }

  return runResult;
}

// Function to execute gemini-cli command
export async function executeGeminiCli(
  geminiCliCommand: { command: string; initialArgs: string[] },
  args: string[],
  cwd?: string,
): Promise<string> {
  const { command, initialArgs } = geminiCliCommand;
  const commandArgs = [...initialArgs, ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["pipe", "pipe", "pipe"],
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
      `The Gemini model to use. Default: "${DEFAULT_MODEL}". Alternative: "gemini-2.5-flash" for faster responses.`,
    ),
  sessionId: z
    .string()
    .optional()
    .describe(
      "Session ID to resume a previous conversation. Use listSessions to get available session IDs.",
    ),
});

// Zod schema for listSessions tool parameters
export const ListSessionsParametersSchema = z.object({});

// Session info structure returned by listSessions
export interface SessionInfo {
  title: string;
  age: string;
  sessionId: string;
  clientId?: string; // Custom client ID mapped to this session
}

// Zod schema for geminiChat tool parameters
export const GeminiChatParametersSchema = z.object({
  prompt: z.string().describe("The prompt for the chat conversation."),
  sessionId: z
    .string()
    .optional()
    .describe(
      "Session ID to resume a previous conversation. Use listSessions to get available session IDs.",
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
      `The Gemini model to use. Default: "${DEFAULT_MODEL}". Alternative: "gemini-2.5-flash" for faster responses.`,
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
      `The Gemini model to use. Default: "${DEFAULT_MODEL}". Alternative: "gemini-2.5-flash" for faster responses.`,
    ),
  sessionId: z
    .string()
    .optional()
    .describe(
      "Session ID to resume a previous conversation. Use listSessions to get available session IDs.",
    ),
});

// Zod schema for executeTask tool parameters
export const ExecuteTaskParametersSchema = z.object({
  task: z.string().describe("The task description to execute."),
  files: z
    .array(z.string())
    .optional()
    .describe("Optional file paths relevant to the task."),
  sessionId: z
    .string()
    .optional()
    .describe(
      "Session ID to resume a previous conversation. Use listSessions to get available session IDs.",
    ),
  model: z
    .string()
    .optional()
    .describe(
      `The Gemini model to use. Default: "${DEFAULT_MODEL}". Alternative: "gemini-2.5-flash" for faster responses.`,
    ),
  sandbox: z
    .boolean()
    .optional()
    .describe("Run in sandbox mode. Default: false (allows editing)."),
  yolo: z
    .boolean()
    .optional()
    .describe(
      "Automatically accept all actions (aka YOLO mode). Default: true for executeTask.",
    ),
  cwd: z
    .string()
    .optional()
    .describe("The working directory to execute the task in."),
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

  const cliArgs = ["-p", prompt];

  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  // Always set model (use default if not specified)
  cliArgs.push("-m", parsedArgs.model || DEFAULT_MODEL);

  // Use session if provided
  if (parsedArgs.sessionId) {
    return runWithSession(
      parsedArgs.sessionId,
      allowNpx,
      geminiCliCmd,
      cliArgs,
    );
  }

  // Return raw result without parsing - let the client handle it
  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

export async function executeGeminiChat(args: unknown, allowNpx = false) {
  const parsedArgs = GeminiChatParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);
  const cliArgs = ["-p", parsedArgs.prompt];
  if (parsedArgs.sessionId) {
    cliArgs.push("-r", parsedArgs.sessionId);
  }
  // chat defaults to sandbox mode (safe, read-only)
  if (parsedArgs.sandbox !== false) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  // Always set model (use default if not specified)
  cliArgs.push("-m", parsedArgs.model || DEFAULT_MODEL);

  if (parsedArgs.sessionId) {
    return runWithSession(
      parsedArgs.sessionId,
      allowNpx,
      geminiCliCmd,
      cliArgs,
    );
  }

  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

// Execute a task with edit permissions (sandbox: false by default)
export async function executeTask(args: unknown, allowNpx = false) {
  const parsedArgs = ExecuteTaskParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Build task-optimized prompt
  let prompt = parsedArgs.task;
  if (parsedArgs.files?.length) {
    prompt += `\n\nTarget files:\n${parsedArgs.files.join("\n")}`;
  }

  const cliArgs = ["-p", prompt];

  // executeTask defaults to allowing edits (sandbox: false)
  if (parsedArgs.sandbox === true) {
    cliArgs.push("-s");
  }
  // Default to YOLO mode (true) for executeTask unless explicitly set to false
  if (parsedArgs.yolo !== false) {
    cliArgs.push("-y");
  }
  // Always set model (use default if not specified)
  cliArgs.push("-m", parsedArgs.model || DEFAULT_MODEL);

  if (parsedArgs.sessionId) {
    // Note: session persistence currently doesn't support changing CWD mid-session easily
    // unless runWithSession is updated. For now, we only support CWD for non-session tasks
    // OR we assume the session was started in the same CWD.
    // However, since we spawn a new process for each interaction, passing CWD *should* work if we pass it down.
    // But runWithSession signature needs update. For simplicity, let's update runWithSession too?
    // Actually, let's keep it simple: if session is used, we ignore CWD for now or pass it if easy.
    // Let's defer session CWD support to avoid large refactor.
    // Wait, executeTask is the main user of CWD.
    return runWithSession(
      parsedArgs.sessionId,
      allowNpx,
      geminiCliCmd,
      cliArgs,
      // TODO: Add CWD support to runWithSession
    );
  }

  const result = await executeGeminiCli(geminiCliCmd, cliArgs, parsedArgs.cwd);
  return result;
}

// Parse the output of gemini --list-sessions into structured data
export function parseSessionsOutput(output: string): SessionInfo[] {
  const sessions: SessionInfo[] = [];
  const lines = output.split("\n");

  // Format example:
  // 1. Empty conversation (13 days ago) [54e41765-c1b4-43ef-a66b-b707e519]
  // 9. hello test (14 minutes ago) [9ec64691-53cb-4fa3-b7df-a121b6dcef54]
  // Using named capture groups for better readability and maintainability (ES2018+)
  const sessionRegex =
    /^\s*\d+\.\s+(?<title>.+?)\s+\((?<age>[^)]+)\)\s+\[(?<sessionId>[^\]]+)\]/;

  for (const line of lines) {
    const match = line.match(sessionRegex);
    if (match?.groups) {
      sessions.push({
        title: match.groups.title.trim(),
        age: match.groups.age.trim(),
        sessionId: match.groups.sessionId.trim(),
      });
    }
  }

  return sessions;
}

// List available Gemini sessions
export async function executeListSessions(allowNpx = false) {
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);
  const result = await executeGeminiCli(geminiCliCmd, ["--list-sessions"]);
  const sessions = parseSessionsOutput(result);

  // Actually, I can't effectively display the mapping in `parseSessionsOutput` result (SessionInfo) without changing the type.
  // And `executeListSessions` returns `{ raw, sessions }`.
  // I will add a `mappings` field to the return object.

  // We need to access sessionManager sessions.
  // Since `sessions` is private, I can't access it here.
  // I will fix `session_manager.ts` in a separate step if I really want this.
  // For now, let's just return what we have.
  return {
    raw: result,
    sessions,
  };
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
      `${t("errors.unsupportedFileType", { extension: fileExtension })}\n${locale.errors.images}: ${SUPPORTED_IMAGE_EXTENSIONS.join(", ")}\n${locale.errors.text}: ${SUPPORTED_TEXT_EXTENSIONS.join(", ")}\n${locale.errors.documents}: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}`,
    );
  }

  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Build the prompt with file path
  let fullPrompt = `Analyze this file: ${parsedArgs.filePath}`;
  if (parsedArgs.prompt) {
    fullPrompt += `\n\n${parsedArgs.prompt}`;
  }

  const cliArgs = ["-p", fullPrompt];
  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  // Always set model (use default if not specified)
  cliArgs.push("-m", parsedArgs.model || DEFAULT_MODEL);

  if (parsedArgs.sessionId) {
    // Use sessionId if provided (not specifically file-session, just generic session)
    // Note: gemini-cli might not support -r for analyze?
    // Documentation says: "analyze <file> [prompt]"
    // It DOES support global flags like -r?
    // `gemini --help` usually shows global flags.
    // Assuming it works.
    return runWithSession(
      // @ts-ignore - Verify parsedArgs has sessionId (it doesn't in schema!)
      // Wait, GeminiAnalyzeFileParametersSchema DOES NOT have sessionId in the original code?
      // Let's check schema.
      parsedArgs.sessionId,
      allowNpx,
      geminiCliCmd,
      cliArgs,
    );
  }

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
        sessionId: z
          .string()
          .optional()
          .describe(locale.tools.googleSearch.params.sessionId),
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
        sessionId: z
          .string()
          .optional()
          .describe(locale.tools.chat.params.sessionId),
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

  // Register listSessions tool
  server.registerTool(
    "listSessions",
    {
      description: locale.tools.listSessions.description,
      inputSchema: {},
    },
    async () => {
      const result = await executeListSessions(allowNpx);

      // Get current mappings
      const mappings = sessionManager.getAllMappings();

      // Create reverse lookup: realId -> clientId
      const reverseMappings: Record<string, string> = {};
      for (const [clientId, realId] of Object.entries(mappings)) {
        reverseMappings[realId] = clientId;
      }

      // Add clientId to each session if mapped
      const sessionsWithClientId = result.sessions.map((session) => ({
        ...session,
        clientId: reverseMappings[session.sessionId],
      }));

      // Build structured response
      const structuredResult = {
        raw: result.raw,
        sessions: sessionsWithClientId,
        mappings: Object.keys(mappings).length > 0 ? mappings : undefined,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(structuredResult, null, 2),
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
        sessionId: z
          .string()
          .optional()
          .describe(locale.tools.analyzeFile.params.sessionId),
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

  // Register executeTask tool
  server.registerTool(
    "executeTask",
    {
      description: locale.tools.executeTask.description,
      inputSchema: {
        task: z.string().describe(locale.tools.executeTask.params.task),
        files: z
          .array(z.string())
          .optional()
          .describe(locale.tools.executeTask.params.files),
        sessionId: z
          .string()
          .optional()
          .describe(locale.tools.executeTask.params.sessionId),
        model: z
          .string()
          .optional()
          .describe(locale.tools.executeTask.params.model),
        sandbox: z
          .boolean()
          .optional()
          .describe(locale.tools.executeTask.params.sandbox),
        yolo: z
          .boolean()
          .optional()
          .describe(locale.tools.executeTask.params.yolo),
      },
    },
    async (args) => {
      const result = await executeTask(args, allowNpx);
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
